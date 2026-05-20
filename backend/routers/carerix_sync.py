"""
Carerix Sync API Router.

Provides endpoints to trigger syncs, check sync status, and view sync logs.
All sync endpoints require authentication.

Sync operations run in the background to avoid HTTP timeouts.
The frontend polls /status to track progress.
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db, db_manager
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.carerix_sync import (
    sync_entity,
    sync_all_entities,
    sync_todos_chunked,
    sync_matches_chunked,
    sync_jobs_chunked,
    get_sync_status,
    get_sync_log,
    test_entity_query,
    cancel_sync,
    clear_sync_cancelled,
    get_carerix_live_counts,
    ENTITY_QUERIES,
)
from services.carerix_auth import _get_access_token, CARERIX_GRAPHQL_URL

router = APIRouter(prefix="/api/v1/sync", tags=["carerix-sync"])
logger = logging.getLogger(__name__)

VALID_ENTITY_TYPES = [
    "companies",
    "employees",
    "crx_vacancies",
    "crx_publications",
    "crx_jobs",
    "crx_matches",
    "crx_todos",
]

# Track background sync tasks to prevent duplicate runs
_running_syncs: dict[str, bool] = {}


async def _run_sync_in_background(entity_type: str, full_sync: bool = False):
    """Run a sync operation in the background with its own DB session.

    Includes retry logic for transient infrastructure errors (DNS resolution,
    connection pool exhaustion) that can occur in deployed environments.
    """
    global _running_syncs
    key = entity_type if entity_type != "all" else "all"

    if _running_syncs.get(key):
        logger.warning("Sync for %s already running, skipping", key)
        return

    _running_syncs[key] = True
    max_retries = 3

    try:
        for attempt in range(1, max_retries + 1):
            try:
                # Ensure db_manager is initialized
                if not db_manager.async_session_maker:
                    logger.error("Database session maker not available for background sync")
                    return

                async with db_manager.async_session_maker() as db:
                    if entity_type == "all":
                        await sync_all_entities(db, full_sync=full_sync)
                    else:
                        await sync_entity(db, entity_type, full_sync=full_sync)
                    # Success — exit retry loop
                    return

            except Exception as inner_e:
                error_str = str(inner_e).lower()
                # Check if this is a retryable infrastructure error (DNS, connection pool)
                is_retryable = any(kw in error_str for kw in [
                    "dns", "balancer resolve", "callback lock",
                    "could not translate host", "name resolution",
                    "connection pool", "too many connections",
                ])
                if is_retryable and attempt < max_retries:
                    wait_secs = 10 * attempt  # 10s, 20s
                    logger.warning(
                        "Retryable error for %s (attempt %d/%d): %s. Retrying in %ds...",
                        key, attempt, max_retries, str(inner_e)[:200], wait_secs,
                    )
                    await asyncio.sleep(wait_secs)
                    continue

                # Non-retryable or final attempt — log crash and write audit trail
                logger.error("Sync operation error for %s (attempt %d/%d): %s", key, attempt, max_retries, inner_e)
                await _write_crash_log(entity_type, full_sync, inner_e)
                return

    except Exception as e:
        logger.error("Background sync unexpected error for %s: %s", key, e)
    finally:
        _running_syncs[key] = False


async def _write_crash_log(entity_type: str, full_sync: bool, error: Exception):
    """Write crash log entries for a failed background sync."""
    try:
        from models.sync_log_entries import Sync_log_entries
        from models.sync_metadata_entries import Sync_metadata_entries

        if not db_manager.async_session_maker:
            return

        async with db_manager.async_session_maker() as cleanup_db:
            error_msg = f"Background task crashed: {str(error)[:500]}"
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            if entity_type == "all":
                # Reset all stuck metadata rows
                stmt = select(Sync_metadata_entries).where(
                    Sync_metadata_entries.sync_status == "running"
                )
                result = await cleanup_db.execute(stmt)
                for row in result.scalars().all():
                    row.sync_status = "error"
                    row.error_message = error_msg
                    cleanup_db.add(Sync_log_entries(
                        entity_type=row.entity_type,
                        sync_type="full" if full_sync else "incremental",
                        started_at=now_str,
                        completed_at=now_str,
                        records_fetched=0,
                        records_created=0,
                        records_updated=0,
                        records_deleted=0,
                        records_skipped_unchanged=0,
                        sync_status="error",
                        error_message=error_msg,
                        carerix_query_time_ms=0,
                    ))
            else:
                # Reset single entity metadata
                stmt = select(Sync_metadata_entries).where(
                    Sync_metadata_entries.entity_type == entity_type,
                    Sync_metadata_entries.sync_status == "running",
                )
                result = await cleanup_db.execute(stmt)
                row = result.scalar_one_or_none()
                if row:
                    row.sync_status = "error"
                    row.error_message = error_msg
                cleanup_db.add(Sync_log_entries(
                    entity_type=entity_type,
                    sync_type="full" if full_sync else "incremental",
                    started_at=now_str,
                    completed_at=now_str,
                    records_fetched=0,
                    records_created=0,
                    records_updated=0,
                    records_deleted=0,
                    records_skipped_unchanged=0,
                    sync_status="error",
                    error_message=error_msg,
                    carerix_query_time_ms=0,
                ))

            await cleanup_db.commit()
    except Exception as cleanup_err:
        logger.error("Failed to write crash log for %s: %s", entity_type, cleanup_err)


@router.get("/debug")
async def debug_sync_connectivity(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Debug endpoint to test Carerix API connectivity.
    Tests: credentials presence, token acquisition, and a small GraphQL query.
    """
    checks = {
        "credentials_configured": False,
        "token_acquired": False,
        "graphql_reachable": False,
        "sample_query_result": None,
        "errors": [],
    }

    # 1. Check credentials
    client_id = os.environ.get("CARERIX_CLIENT_ID")
    client_secret = os.environ.get("CARERIX_CLIENT_SECRET")
    checks["credentials_configured"] = bool(client_id and client_secret)
    if not checks["credentials_configured"]:
        checks["errors"].append(
            "CARERIX_CLIENT_ID and/or CARERIX_CLIENT_SECRET not set in environment"
        )
        return checks

    # 2. Get token
    try:
        token = await _get_access_token()
        checks["token_acquired"] = bool(token)
        if not token:
            checks["errors"].append("Failed to acquire access token from Carerix Keycloak")
            return checks
    except Exception as e:
        checks["errors"].append(f"Token acquisition error: {str(e)}")
        return checks

    # 3. Test GraphQL with a small query
    try:
        test_query = """
        {
          crCompanyPage(pageable: {page: 0, size: 2}) {
            totalElements
            totalPages
            items {
              companyID
              name
            }
          }
        }
        """
        start = time.time()
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json={"query": test_query},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            elapsed_ms = int((time.time() - start) * 1000)
            response.raise_for_status()
            result = response.json()

            if "errors" in result:
                checks["errors"].append(f"GraphQL errors: {result['errors'][:2]}")
            else:
                checks["graphql_reachable"] = True
                page_data = result.get("data", {}).get("crCompanyPage", {})
                checks["sample_query_result"] = {
                    "total_elements": page_data.get("totalElements", 0),
                    "total_pages": page_data.get("totalPages", 0),
                    "sample_items": page_data.get("items", [])[:2],
                    "query_time_ms": elapsed_ms,
                }
    except httpx.HTTPStatusError as e:
        checks["errors"].append(
            f"GraphQL HTTP {e.response.status_code}: {e.response.text[:300]}"
        )
    except Exception as e:
        checks["errors"].append(f"GraphQL request error: {str(e)}")

    return checks


@router.get("/debug-entities")
async def debug_all_entities(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Test each entity type's GraphQL query individually.
    Returns diagnostic info showing which entities work and which fail.
    """
    token = await _get_access_token()
    if not token:
        return {"error": "Failed to acquire access token", "results": []}

    results = []
    for entity_type in VALID_ENTITY_TYPES:
        try:
            entity_result = await test_entity_query(token, entity_type)
            results.append(entity_result)
        except Exception as e:
            results.append({
                "entity_type": entity_type,
                "error": str(e),
                "full_fields_ok": False,
                "minimal_fields_ok": False,
            })

    return {
        "results": results,
        "summary": {
            "total": len(results),
            "full_ok": sum(1 for r in results if r.get("full_fields_ok")),
            "minimal_ok": sum(1 for r in results if r.get("minimal_fields_ok")),
            "failed": sum(1 for r in results if not r.get("full_fields_ok") and not r.get("minimal_fields_ok")),
        },
    }


@router.post("/trigger/{entity_type}")
async def trigger_sync(
    entity_type: str,
    full: bool = Query(False, description="Full sync (ignore last_sync_timestamp)"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Trigger a background sync for a specific entity type.
    Returns immediately; poll /status to track progress.
    """
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Valid types: {VALID_ENTITY_TYPES}",
        )

    if _running_syncs.get(entity_type):
        return {
            "entity_type": entity_type,
            "status": "already_running",
            "message": f"Sync for {entity_type} is already in progress.",
        }

    # Launch background task
    asyncio.create_task(_run_sync_in_background(entity_type, full_sync=full))

    return {
        "entity_type": entity_type,
        "status": "started",
        "message": f"Sync for {entity_type} started in background. Poll /status to track progress.",
    }


@router.post("/trigger-all")
async def trigger_sync_all(
    full: bool = Query(False, description="Full sync for all entities"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Trigger background sync for ALL entity types.
    Returns immediately; poll /status to track progress.
    """
    if _running_syncs.get("all"):
        return {
            "status": "already_running",
            "message": "A full sync is already in progress.",
        }

    # Launch background task for all entities
    asyncio.create_task(_run_sync_in_background("all", full_sync=full))

    return {
        "status": "started",
        "message": "Full sync started in background for all entities. Poll /status to track progress.",
        "entity_types": VALID_ENTITY_TYPES,
    }


async def _run_todos_chunked_in_background(start_year: int = 2010, start_month: int = 1):
    """Run chunked todos sync in the background."""
    global _running_syncs
    key = "crx_todos_chunked"

    if _running_syncs.get(key):
        logger.warning("Chunked todos sync already running, skipping")
        return

    _running_syncs[key] = True
    try:
        if not db_manager.async_session_maker:
            logger.error("Database session maker not available for chunked todos sync")
            return

        async with db_manager.async_session_maker() as db:
            await sync_todos_chunked(db, start_year=start_year, start_month=start_month)
    except Exception as e:
        logger.error("Chunked todos sync error: %s", e)
        await _write_crash_log("crx_todos", True, e)
    finally:
        _running_syncs[key] = False


@router.post("/trigger-todos-chunked")
async def trigger_todos_chunked(
    start_year: int = Query(2010, description="Year to start syncing from"),
    start_month: int = Query(1, description="Month to start syncing from (1-12)"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Trigger chunked todos sync in the background.

    This breaks the ~1.9M CRToDo records into monthly date-range chunks,
    fetches each chunk, filters for isTask=1 client-side, and upserts.
    Much more reliable than fetching all 1.9M records in one go.

    Returns immediately; poll /status to track progress.
    """
    if _running_syncs.get("crx_todos_chunked") or _running_syncs.get("crx_todos"):
        return {
            "entity_type": "crx_todos",
            "status": "already_running",
            "message": "A todos sync is already in progress.",
        }

    if start_month < 1 or start_month > 12:
        raise HTTPException(status_code=400, detail="start_month must be between 1 and 12")

    asyncio.create_task(_run_todos_chunked_in_background(start_year, start_month))

    return {
        "entity_type": "crx_todos",
        "sync_mode": "chunked_monthly",
        "status": "started",
        "start_from": f"{start_year}-{start_month:02d}",
        "message": "Chunked todos sync started in background. Poll /status to track progress.",
    }


async def _run_matches_chunked_in_background(start_year: int = 2010, start_month: int = 1):
    """Run chunked matches sync in the background."""
    global _running_syncs
    key = "crx_matches_chunked"

    if _running_syncs.get(key):
        logger.warning("Chunked matches sync already running, skipping")
        return

    _running_syncs[key] = True
    try:
        if not db_manager.async_session_maker:
            logger.error("Database session maker not available for chunked matches sync")
            return

        async with db_manager.async_session_maker() as db:
            await sync_matches_chunked(db, start_year=start_year, start_month=start_month)
    except Exception as e:
        logger.error("Chunked matches sync error: %s", e)
        await _write_crash_log("crx_matches", True, e)
    finally:
        _running_syncs[key] = False


@router.post("/trigger-matches-chunked")
async def trigger_matches_chunked(
    start_year: int = Query(2010, description="Year to start syncing from"),
    start_month: int = Query(1, description="Month to start syncing from (1-12)"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Trigger chunked matches sync in the background.

    This breaks the ~50K CRMatch records into monthly date-range chunks,
    fetches each chunk, and upserts immediately. Much more reliable than
    fetching all 50K records in one go.

    Returns immediately; poll /status to track progress.
    """
    if _running_syncs.get("crx_matches_chunked") or _running_syncs.get("crx_matches"):
        return {
            "entity_type": "crx_matches",
            "status": "already_running",
            "message": "A matches sync is already in progress.",
        }

    if start_month < 1 or start_month > 12:
        raise HTTPException(status_code=400, detail="start_month must be between 1 and 12")

    asyncio.create_task(_run_matches_chunked_in_background(start_year, start_month))

    return {
        "entity_type": "crx_matches",
        "sync_mode": "chunked_monthly",
        "status": "started",
        "start_from": f"{start_year}-{start_month:02d}",
        "message": "Chunked matches sync started in background. Poll /status to track progress.",
    }


async def _run_jobs_chunked_in_background(start_year: int = 2010, start_month: int = 1):
    """Run chunked jobs sync in the background."""
    global _running_syncs
    key = "crx_jobs_chunked"

    if _running_syncs.get(key):
        logger.warning("Chunked jobs sync already running, skipping")
        return

    _running_syncs[key] = True
    try:
        if not db_manager.async_session_maker:
            logger.error("Database session maker not available for chunked jobs sync")
            return

        async with db_manager.async_session_maker() as db:
            await sync_jobs_chunked(db, start_year=start_year, start_month=start_month)
    except Exception as e:
        logger.error("Chunked jobs sync error: %s", e)
        await _write_crash_log("crx_jobs", True, e)
    finally:
        _running_syncs[key] = False


@router.post("/trigger-jobs-chunked")
async def trigger_jobs_chunked(
    start_year: int = Query(2010, description="Year to start syncing from"),
    start_month: int = Query(1, description="Month to start syncing from (1-12)"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Trigger chunked jobs sync in the background.

    This breaks the ~20K+ CRJob records into monthly date-range chunks,
    fetches each chunk, and upserts immediately. Much more reliable than
    fetching all records in one go.

    Returns immediately; poll /status to track progress.
    """
    if _running_syncs.get("crx_jobs_chunked") or _running_syncs.get("crx_jobs"):
        return {
            "entity_type": "crx_jobs",
            "status": "already_running",
            "message": "A jobs sync is already in progress.",
        }

    if start_month < 1 or start_month > 12:
        raise HTTPException(status_code=400, detail="start_month must be between 1 and 12")

    asyncio.create_task(_run_jobs_chunked_in_background(start_year, start_month))

    return {
        "entity_type": "crx_jobs",
        "sync_mode": "chunked_monthly",
        "status": "started",
        "start_from": f"{start_year}-{start_month:02d}",
        "message": "Chunked jobs sync started in background. Poll /status to track progress.",
    }


@router.get("/running")
async def get_running_syncs(
    current_user: UserResponse = Depends(get_current_user),
):
    """Check which syncs are currently running."""
    return {
        "running": {k: v for k, v in _running_syncs.items() if v},
        "any_running": any(_running_syncs.values()),
    }


@router.post("/stop/{entity_type}")
async def stop_sync(
    entity_type: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Gracefully stop a running sync for a specific entity type.
    The sync will finish its current page and then stop.
    """
    if entity_type not in VALID_ENTITY_TYPES and entity_type != "all":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Valid types: {VALID_ENTITY_TYPES}",
        )

    if entity_type == "all":
        for et in VALID_ENTITY_TYPES:
            cancel_sync(et)
    else:
        cancel_sync(entity_type)

    return {
        "entity_type": entity_type,
        "status": "stop_requested",
        "message": f"Stop signal sent for {entity_type}. The sync will stop after the current page completes.",
    }


@router.post("/force-reset")
async def force_reset_sync(
    entity: Optional[str] = Query(None, description="Reset a specific entity only (e.g. crx_todos). If omitted, resets ALL."),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Force-reset sync running flags and set 'running' metadata status to 'cancelled'.
    Use this when a sync appears stuck and won't complete.
    Pass ?entity=crx_todos to reset only that entity without affecting others.
    """
    from models.sync_metadata_entries import Sync_metadata_entries

    # Determine which entities to reset
    if entity:
        target_entities = [entity]
        # Also include the chunked variant key
        target_keys = [entity, f"{entity}_chunked"]
    else:
        target_entities = VALID_ENTITY_TYPES
        target_keys = None  # reset all

    # Signal target syncs to cancel
    for et in target_entities:
        cancel_sync(et)

    # Clear in-memory running flags
    cleared_keys = []
    if target_keys:
        for key in target_keys:
            if _running_syncs.get(key):
                cleared_keys.append(key)
                _running_syncs[key] = False
    else:
        cleared_keys = [k for k, v in _running_syncs.items() if v]
        for key in list(_running_syncs.keys()):
            _running_syncs[key] = False

    # Reset database rows stuck in "running" status
    reset_entities = []
    try:
        if entity:
            stmt = select(Sync_metadata_entries).where(
                Sync_metadata_entries.entity_type == entity,
                Sync_metadata_entries.sync_status == "running",
            )
        else:
            stmt = select(Sync_metadata_entries).where(
                Sync_metadata_entries.sync_status == "running"
            )
        result = await db.execute(stmt)
        rows = result.scalars().all()
        for row in rows:
            row.sync_status = "cancelled"
            row.error_message = "Force-reset by admin"
            reset_entities.append(row.entity_type)
        await db.commit()
    except Exception as e:
        logger.error("Error resetting sync metadata: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Clear cancellation flags after reset
    for et in target_entities:
        clear_sync_cancelled(et)

    return {
        "status": "reset",
        "cleared_running_flags": cleared_keys,
        "reset_db_entities": reset_entities,
        "message": f"Reset {len(cleared_keys)} running flags and {len(reset_entities)} stuck DB entries. You can now restart syncs.",
    }


@router.get("/status")
async def sync_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current sync status for all entity types.
    Includes live Carerix record counts and local DB counts for comparison.
    Requires authentication.
    """
    from sqlalchemy import func, select as sa_select
    from services.carerix_sync import _get_model_class

    try:
        status = await get_sync_status(db)

        # Fetch local DB counts for each entity
        db_counts: dict[str, int] = {}
        for entity_type in VALID_ENTITY_TYPES:
            model_class = _get_model_class(entity_type)
            if model_class:
                try:
                    count_stmt = sa_select(func.count()).select_from(model_class)
                    count_result = await db.execute(count_stmt)
                    db_counts[entity_type] = count_result.scalar() or 0
                except Exception:
                    db_counts[entity_type] = 0
            else:
                db_counts[entity_type] = 0

        # Fetch live Carerix counts (non-blocking; gracefully handle failures)
        carerix_counts: dict[str, int] = {}
        try:
            token = await _get_access_token()
            if token:
                live = await get_carerix_live_counts(token)
                for et, info in live.items():
                    carerix_counts[et] = info.get("total", 0)
        except Exception as e:
            logger.warning("Could not fetch Carerix live counts for status: %s", e)

        # Enrich status entries with counts
        for entry in status:
            et = entry["entity_type"]
            entry["records_database"] = db_counts.get(et, 0)
            entry["records_carerix"] = carerix_counts.get(et, 0)

        return {
            "status": status,
            "any_running": any(_running_syncs.values()),
            "running_tasks": {k: v for k, v in _running_syncs.items() if v},
        }
    except Exception as e:
        logger.error("Error getting sync status: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.get("/log")
async def sync_log(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(50, description="Max log entries to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get sync audit trail.
    Requires authentication.
    """
    try:
        if entity_type and entity_type not in VALID_ENTITY_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid entity_type. Valid types: {VALID_ENTITY_TYPES}",
            )

        logs = await get_sync_log(db, entity_type=entity_type, limit=limit)
        return {"logs": logs, "count": len(logs)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting sync log: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")


@router.delete("/log/cleanup")
async def cleanup_sync_logs(
    keep_days: int = Query(30, description="Keep logs from the last N days"),
    keep_latest: int = Query(100, description="Always keep the latest N logs regardless of age"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Clean up old sync log entries.
    Keeps the most recent `keep_latest` entries and any entries from the last `keep_days` days.
    """
    from models.sync_log_entries import Sync_log_entries
    from sqlalchemy import delete as sa_delete, func

    try:
        # Count total logs
        total_stmt = select(func.count(Sync_log_entries.id))
        total_result = await db.execute(total_stmt)
        total_count = total_result.scalar() or 0

        if total_count <= keep_latest:
            return {
                "status": "no_cleanup_needed",
                "total_before": total_count,
                "deleted": 0,
                "remaining": total_count,
            }

        # Find the ID threshold for keep_latest
        latest_ids_stmt = (
            select(Sync_log_entries.id)
            .order_by(Sync_log_entries.id.desc())
            .limit(keep_latest)
        )
        latest_result = await db.execute(latest_ids_stmt)
        latest_ids = {row[0] for row in latest_result.all()}

        # Find the date threshold
        cutoff = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=keep_days)
        cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Delete logs that are older than cutoff AND not in the latest N
        delete_stmt = sa_delete(Sync_log_entries).where(
            Sync_log_entries.id.notin_(latest_ids),
            Sync_log_entries.started_at < cutoff_str,
        )
        result = await db.execute(delete_stmt)
        deleted_count = result.rowcount
        await db.commit()

        return {
            "status": "cleaned",
            "total_before": total_count,
            "deleted": deleted_count,
            "remaining": total_count - deleted_count,
            "kept_latest": keep_latest,
            "kept_days": keep_days,
        }
    except Exception as e:
        logger.error("Error cleaning up sync logs: %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/entity-types")
async def list_entity_types():
    """List all valid entity types that can be synced."""
    return {"entity_types": VALID_ENTITY_TYPES}


@router.get("/compare")
async def compare_db_vs_carerix(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare local DB record counts against live Carerix counts.
    Shows total Carerix records, records modified since last sync,
    and local DB counts for each entity type.
    """
    from sqlalchemy import func, select as sa_select
    from services.carerix_sync import _get_model_class

    # 1. Get token
    token = await _get_access_token()
    if not token:
        raise HTTPException(status_code=503, detail="Failed to acquire Carerix access token")

    # 2. Get sync metadata for last_sync_timestamp per entity
    status_list = await get_sync_status(db)
    status_map = {s["entity_type"]: s for s in status_list}

    # 3. Get live Carerix counts (total for all entities)
    try:
        live_counts = await get_carerix_live_counts(token)
    except Exception as e:
        logger.error("Failed to get live Carerix counts: %s", e)
        live_counts = {}

    # 4. Build comparison for each entity
    comparison = []
    for entity_type in VALID_ENTITY_TYPES:
        meta = status_map.get(entity_type, {})
        live = live_counts.get(entity_type, {})

        # Get local DB count
        local_count = 0
        model_class = _get_model_class(entity_type)
        if model_class:
            try:
                count_stmt = sa_select(func.count()).select_from(model_class)
                count_result = await db.execute(count_stmt)
                local_count = count_result.scalar() or 0
            except Exception as e:
                logger.warning("Could not count %s: %s", entity_type, e)

        # Get filtered count (modified since last sync) if we have a timestamp
        filtered_count = None
        last_sync = meta.get("last_sync_timestamp")
        if last_sync and token:
            try:
                filtered_counts = await get_carerix_live_counts(token, since=last_sync)
                filtered_count = filtered_counts.get(entity_type, {}).get("filtered")
            except Exception:
                pass

        entry = {
            "entity_type": entity_type,
            "carerix_total": live.get("total", 0),
            "carerix_modified_since_last_sync": filtered_count,
            "local_db_count": local_count,
            "last_sync_timestamp": last_sync,
            "last_full_sync": meta.get("last_full_sync"),
            "sync_status": meta.get("sync_status"),
            "difference": live.get("total", 0) - local_count,
            "error": live.get("error"),
        }
        comparison.append(entry)

    return {
        "comparison": comparison,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }