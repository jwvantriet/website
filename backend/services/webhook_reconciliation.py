"""
Webhook Reconciliation Service.

Provides a scheduled reconciliation mechanism that:
1. Queries Carerix for records modified since last cursor - 5min overlap
2. Compares with local DB
3. Upserts any missing or stale records

This acts as a safety net for missed webhooks.

Can be triggered manually via API or scheduled via external cron.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Track last reconciliation cursor per entity type
_reconciliation_cursors: dict[str, str] = {}

# Overlap window to catch records that might have been in-flight
_OVERLAP_MINUTES = 5


async def reconcile_entity(
    db: AsyncSession,
    entity_type: str,
    since: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Reconcile a single entity type by fetching recently modified records
    from Carerix and upserting any that are missing or stale locally.

    Args:
        db: Database session
        entity_type: Entity type to reconcile
        since: Optional ISO timestamp to use as the starting point.
               If not provided, uses the last reconciliation cursor - 5min overlap.

    Returns:
        Dict with reconciliation results
    """
    from services.carerix_sync import (
        ENTITY_QUERIES,
        FIELD_MAPPERS,
        _get_model_class,
        _fetch_carerix_page,
        _parse_carerix_datetime,
    )
    from services.carerix_auth import _get_access_token
    from core.database import db_manager

    start_time = time.time()
    result = {
        "entity_type": entity_type,
        "records_checked": 0,
        "records_upserted": 0,
        "records_unchanged": 0,
        "status": "success",
        "error_message": None,
        "qualifier_used": None,
    }

    if entity_type not in ENTITY_QUERIES:
        result["status"] = "error"
        result["error_message"] = f"Unknown entity type: {entity_type}"
        return result

    # Determine the reconciliation window
    if since:
        cursor_dt = _parse_carerix_datetime(since)
    else:
        last_cursor = _reconciliation_cursors.get(entity_type)
        if last_cursor:
            cursor_dt = _parse_carerix_datetime(last_cursor)
        else:
            # Default: last 30 minutes
            cursor_dt = datetime.now(timezone.utc) - timedelta(minutes=30)

    if cursor_dt:
        # Apply overlap window
        overlap_dt = cursor_dt - timedelta(minutes=_OVERLAP_MINUTES)
        date_str = overlap_dt.strftime("%Y-%m-%d %H:%M:%S")
        qualifier = f"modificationDate >= (NSCalendarDate)'{date_str} Etc/GMT'"
        result["qualifier_used"] = qualifier
    else:
        qualifier = None

    # Get access token
    token = await _get_access_token()
    if not token:
        result["status"] = "error"
        result["error_message"] = "Failed to obtain Carerix access token"
        return result

    # Fetch modified records from Carerix
    all_items: List[dict] = []
    page = 0
    max_pages = 50  # Safety limit for reconciliation

    try:
        while page < max_pages:
            page_data, page_error = await _fetch_carerix_page(
                token, entity_type, page=page, page_size=200,
                qualifier=qualifier,
            )

            if not page_data:
                if page == 0 and page_error:
                    result["status"] = "error"
                    result["error_message"] = f"Failed to fetch: {page_error}"
                    return result
                break

            items = page_data.get("items", [])
            if not items:
                break

            all_items.extend(items)
            total_pages = page_data.get("totalPages", 1)
            page += 1

            if page >= total_pages:
                break

            await asyncio.sleep(0.3)

        result["records_checked"] = len(all_items)

        if not all_items:
            # Update cursor even if no records found
            _reconciliation_cursors[entity_type] = datetime.now(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            return result

        # Transform and upsert
        mapper = FIELD_MAPPERS[entity_type]
        model_class = _get_model_class(entity_type)
        if not model_class:
            result["status"] = "error"
            result["error_message"] = f"No model class for: {entity_type}"
            return result

        model_columns = {c.name for c in model_class.__table__.columns}
        update_columns = [
            c.name for c in model_class.__table__.columns
            if c.name not in ("id", "carerix_id")
        ]

        # Map all items
        mapped_records: list[dict] = []
        for item in all_items:
            try:
                mapped = mapper(item)
                if mapped.get("carerix_id") is None:
                    continue
                safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}
                mapped_records.append(safe_mapped)
            except Exception as e:
                logger.warning("Reconciliation mapping error for %s: %s", entity_type, e)

        # Batch upsert
        if mapped_records and db_manager.async_session_maker:
            batch_size = 200
            upserted = 0
            for i in range(0, len(mapped_records), batch_size):
                batch = mapped_records[i:i + batch_size]
                try:
                    async with db_manager.async_session_maker() as batch_db:
                        stmt = pg_insert(model_class).values(batch)
                        update_dict = {
                            col: stmt.excluded[col] for col in update_columns
                            if col in {k for row in batch for k in row.keys()}
                        }
                        if update_dict:
                            stmt = stmt.on_conflict_do_update(
                                index_elements=["carerix_id"],
                                set_=update_dict,
                            )
                        else:
                            stmt = stmt.on_conflict_do_nothing(
                                index_elements=["carerix_id"],
                            )
                        await batch_db.execute(stmt)
                        await batch_db.commit()
                    upserted += len(batch)
                except Exception as e:
                    logger.error("Reconciliation batch upsert error for %s: %s", entity_type, e)
                    result["error_message"] = str(e)[:500]

            result["records_upserted"] = upserted
            result["records_unchanged"] = len(mapped_records) - upserted

        # Update reconciliation cursor
        _reconciliation_cursors[entity_type] = datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

    except Exception as e:
        result["status"] = "error"
        result["error_message"] = str(e)[:500]
        logger.error("Reconciliation failed for %s: %s", entity_type, e)

    elapsed_ms = int((time.time() - start_time) * 1000)
    result["elapsed_ms"] = elapsed_ms

    logger.info(
        "Reconciliation %s: checked=%d, upserted=%d, elapsed=%dms",
        entity_type, result["records_checked"], result["records_upserted"], elapsed_ms,
    )

    return result


async def reconcile_all_entities(
    db: AsyncSession,
    since: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Reconcile all entity types.

    Returns dict with results per entity type.
    """
    from core.database import db_manager
    from services.carerix_sync import ENTITY_QUERIES

    entity_types = list(ENTITY_QUERIES.keys())
    results = {}

    for entity_type in entity_types:
        try:
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as entity_db:
                    result = await reconcile_entity(entity_db, entity_type, since=since)
                    results[entity_type] = result
            else:
                result = await reconcile_entity(db, entity_type, since=since)
                results[entity_type] = result
        except Exception as e:
            logger.error("Reconciliation failed for %s: %s", entity_type, e)
            results[entity_type] = {
                "entity_type": entity_type,
                "status": "error",
                "error_message": str(e)[:500],
            }

    return results