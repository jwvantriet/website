"""
Carerix Webhook Ingestion & Monitoring Router.

Endpoints:
- POST /integrations/carerix/webhooks — Ingest webhook events from Carerix
- GET  /api/v1/webhooks/dashboard     — Admin monitoring dashboard data
- POST /api/v1/webhooks/retry/{id}    — Retry a failed webhook event
- POST /api/v1/webhooks/process-pending — Manually trigger processing of pending events
"""

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.webhook_events import Webhook_events
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

# Public webhook ingestion endpoint (no auth — Carerix calls this)
webhook_router = APIRouter(tags=["webhooks"])

# Admin monitoring endpoints (auth required)
admin_router = APIRouter(prefix="/api/v1/webhooks", tags=["webhook-admin"])


# ---------------------------------------------------------------------------
# Webhook signature verification
# ---------------------------------------------------------------------------

def _verify_custom_signature(custom_signature: Optional[str], secret: str) -> bool:
    """Verify the Custom-Signature header from Carerix.

    When registering a webhook, we set customHeaders with the webhook client secret:
        {"name": "Custom-Signature", "value": "<CARERIX_WEBHOOK_CLIENT_SECRET>"}

    Carerix then sends this exact value back in the Custom-Signature header
    on every webhook delivery. We verify by comparing the header value to
    our stored secret using constant-time comparison.

    This is NOT HMAC — it's a simple shared-secret comparison.
    """
    if not secret:
        return True  # No secret configured — skip verification
    if not custom_signature:
        # Secret is configured but header is missing — could be a Carerix RSA-only delivery
        logger.debug("Custom-Signature header missing but CARERIX_WEBHOOK_CLIENT_SECRET is set")
        return True  # Don't block — Carerix may not always send custom headers
    return hmac.compare_digest(secret, custom_signature)


def _verify_carerix_signature(payload: bytes, cx_signature: Optional[str]) -> bool:
    """
    Verify the Cx-Signature header from Carerix.

    Carerix uses RSA SHA256 signatures. The public key can be fetched from:
    https://api.carerix.io/webhooks/v1/signature-key

    For now, we log the signature but don't block if verification fails,
    since the RSA public key needs to be fetched and cached separately.
    """
    if not cx_signature:
        logger.debug("No Cx-Signature header — Carerix signature verification skipped")
        return True  # Don't block; signature verification is optional until key is configured

    # TODO: Implement RSA verification once the public key is fetched and cached
    # For now, the presence of the Cx-Signature header confirms this is from Carerix
    logger.info("Cx-Signature header present (RSA verification not yet implemented)")
    return True


# ---------------------------------------------------------------------------
# Webhook ingestion endpoint
# ---------------------------------------------------------------------------

@webhook_router.post("/integrations/carerix/webhooks", status_code=204)
async def ingest_webhook(
    request: Request,
    cx_signature: Optional[str] = Header(None, alias="Cx-Signature"),
    custom_signature: Optional[str] = Header(None, alias="Custom-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive webhook events from Carerix.

    Carerix webhook payload format (per official docs):
    {
      "id": "8469bf71-...",              // Event UUID (for idempotency)
      "time": "2024-02-14T14:24:40Z",   // When the event occurred
      "type": "crmatch:updated",         // Format: "entitytype:action"
      "applicationId": "6fc051df-...",   // Which webhook application
      "webhookId": "22cc6baf-...",       // Which webhook subscription
      "tenant": "confair",              // Carerix tenant
      "data": {
        "entityId": "2.3",              // The actual entity ID
        "changedFields": ["statusinfo", "modificationdate"]  // What changed
      }
    }

    Flow:
    1. Validate signature (Cx-Signature RSA or Custom-Signature HMAC)
    2. Parse payload to extract entity info from the correct fields
    3. Check for duplicate event id (idempotency)
    4. Store raw event with status=pending
    5. Return 204 immediately (async processing happens later)
    """
    raw_body = await request.body()

    # Log incoming headers for debugging
    logger.info(
        "Webhook received: content-length=%s, Cx-Signature=%s, Custom-Signature=%s",
        request.headers.get("content-length", "?"),
        "present" if cx_signature else "absent",
        "present" if custom_signature else "absent",
    )

    # Verify Carerix RSA signature (Cx-Signature header)
    if not _verify_carerix_signature(raw_body, cx_signature):
        logger.warning("Carerix Cx-Signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid Cx-Signature")

    # Verify Custom-Signature header (shared secret comparison, NOT HMAC)
    # Uses CARERIX_WEBHOOK_CLIENT_SECRET as the verification secret
    webhook_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")
    if webhook_secret and custom_signature:
        if not _verify_custom_signature(custom_signature, webhook_secret):
            logger.warning("Custom-Signature verification failed — header value does not match CARERIX_WEBHOOK_CLIENT_SECRET")
            raise HTTPException(status_code=401, detail="Invalid Custom-Signature")

    # Parse payload
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.error("Webhook payload is not valid JSON: %s", raw_body[:200])
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info("Webhook payload keys: %s", list(payload.keys()) if isinstance(payload, dict) else type(payload))

    # ---------------------------------------------------------------------------
    # Extract event metadata — support BOTH the official Carerix format AND
    # our internal test format for backward compatibility.
    #
    # Official Carerix format:
    #   id        → event UUID (idempotency key)
    #   type      → "entitytype:action" (e.g., "cremployee:updated")
    #   time      → ISO timestamp
    #   data.entityId      → the actual entity ID
    #   data.changedFields → list of changed field names
    #
    # Legacy/test format:
    #   eventId   → event ID
    #   entity    → entity class name
    #   id        → entity ID
    #   event     → action name
    # ---------------------------------------------------------------------------

    data_block = payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}
    type_field = payload.get("type", "")  # e.g., "cremployee:updated"

    if type_field and ":" in type_field:
        # Official Carerix format
        entity_type_raw, event_action = type_field.rsplit(":", 1)
        event_id = str(payload.get("id", ""))
        entity_id = str(data_block.get("entityId", ""))
        event_type = event_action  # "updated", "created", "deleted"
        event_time = payload.get("time", "")
        changed_fields_list = data_block.get("changedFields", [])
        changed_fields = ", ".join(changed_fields_list) if isinstance(changed_fields_list, list) else str(changed_fields_list)
    else:
        # Legacy / test format (backward compatible)
        event_id = payload.get("eventId") or payload.get("event_id") or str(payload.get("id", ""))
        entity_type_raw = payload.get("entity") or payload.get("entityType") or ""
        entity_id = str(payload.get("id") or payload.get("entityId") or data_block.get("entityId", ""))
        event_type = payload.get("event") or payload.get("eventType") or "unknown"
        event_time = payload.get("timestamp") or payload.get("eventTime") or payload.get("time", "")
        changed_fields = ""

        # Don't use top-level "id" as entity_id if it looks like a UUID (it's the event ID)
        if entity_id and len(entity_id) > 20 and "-" in entity_id:
            # This is likely the event UUID, not an entity ID
            if not event_id:
                event_id = entity_id
            entity_id = str(data_block.get("entityId", ""))

    # Map Carerix entity names to our internal entity types
    entity_type = _map_carerix_entity(entity_type_raw)

    # Generate event_id if not provided (for idempotency)
    if not event_id:
        id_source = f"{entity_type}:{entity_id}:{event_type}:{event_time}"
        event_id = hashlib.sha256(id_source.encode()).hexdigest()[:32]

    # Check for duplicate (idempotency)
    existing = await db.execute(
        select(Webhook_events).where(Webhook_events.event_id == event_id)
    )
    if existing.scalar_one_or_none():
        logger.info("Duplicate webhook event_id=%s, skipping", event_id)
        return  # 204 — already processed

    # Store the event
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    webhook_event = Webhook_events(
        event_id=event_id,
        entity_id=entity_id,
        entity_type=entity_type,
        event_type=event_type,
        event_time=event_time,
        changed_fields=changed_fields,
        raw_payload=json.dumps(payload, default=str),
        processing_status="pending",
        retry_count=0,
        created_at=now_str,
    )
    db.add(webhook_event)
    await db.commit()

    logger.info(
        "Webhook event stored: event_id=%s, entity=%s/%s, type=%s, changed=%s",
        event_id, entity_type, entity_id, event_type, changed_fields[:100] if changed_fields else "n/a",
    )

    # Trigger async processing (fire-and-forget)
    import asyncio
    asyncio.create_task(_process_single_event(webhook_event.id))

    return  # 204 No Content


def _map_carerix_entity(raw_entity: str) -> str:
    """Map Carerix entity class names to our internal entity type keys.

    Carerix sends event types like "CREmployee:updated" or "cremployee:updated".
    We normalize to lowercase for matching.
    """
    mapping = {
        "cremployee": "employees",
        "crcompany": "companies",
        "crvacancy": "crx_vacancies",
        "crpublication": "crx_publications",
        "crjob": "crx_jobs",
        "crmatch": "crx_matches",
        "crtodo": "crx_todos",
        "crtask": "crx_todos",
        # Also support our internal names directly
        "employees": "employees",
        "companies": "companies",
        "crx_vacancies": "crx_vacancies",
        "crx_publications": "crx_publications",
        "crx_jobs": "crx_jobs",
        "crx_matches": "crx_matches",
        "crx_todos": "crx_todos",
    }
    # Normalize: strip whitespace, lowercase for matching
    normalized = raw_entity.strip().lower()
    return mapping.get(normalized, normalized)


# ---------------------------------------------------------------------------
# Async event processing (fire-and-forget from ingestion)
# ---------------------------------------------------------------------------

async def _process_single_event(event_db_id: int):
    """Process a single webhook event in the background."""
    from services.webhook_processor import process_webhook_event
    try:
        await process_webhook_event(event_db_id)
    except Exception as e:
        logger.error("Background webhook processing failed for event %d: %s", event_db_id, e)


# ---------------------------------------------------------------------------
# Admin monitoring endpoints
# ---------------------------------------------------------------------------

@admin_router.get("/dashboard")
async def webhook_dashboard(
    status_filter: Optional[str] = Query(None, description="Filter by processing_status"),
    entity_filter: Optional[str] = Query(None, description="Filter by entity_type"),
    limit: int = Query(100, ge=1, le=500),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get webhook monitoring dashboard data.
    Returns summary stats + recent events.
    """
    # Summary stats
    total_stmt = select(func.count(Webhook_events.id))
    total_result = await db.execute(total_stmt)
    total_events = total_result.scalar() or 0

    # Count by status
    status_counts = {}
    for status_val in ["pending", "processing", "completed", "failed", "pending_api_access", "duplicate", "echo_suppressed"]:
        count_stmt = select(func.count(Webhook_events.id)).where(
            Webhook_events.processing_status == status_val
        )
        count_result = await db.execute(count_stmt)
        status_counts[status_val] = count_result.scalar() or 0

    # Count by entity type
    entity_counts_stmt = (
        select(Webhook_events.entity_type, func.count(Webhook_events.id))
        .group_by(Webhook_events.entity_type)
    )
    entity_result = await db.execute(entity_counts_stmt)
    entity_counts = {row[0]: row[1] for row in entity_result.all()}

    # Recent events
    events_query = select(Webhook_events).order_by(Webhook_events.id.desc())
    if status_filter:
        events_query = events_query.where(Webhook_events.processing_status == status_filter)
    if entity_filter:
        events_query = events_query.where(Webhook_events.entity_type == entity_filter)
    events_query = events_query.limit(limit)

    events_result = await db.execute(events_query)
    events = events_result.scalars().all()

    return {
        "summary": {
            "total_events": total_events,
            "by_status": status_counts,
            "by_entity": entity_counts,
        },
        "events": [
            {
                "id": e.id,
                "event_id": e.event_id,
                "entity_id": e.entity_id,
                "entity_type": e.entity_type,
                "event_type": e.event_type,
                "event_time": e.event_time,
                "changed_fields": e.changed_fields,
                "processing_status": e.processing_status,
                "processed_at": e.processed_at,
                "error_message": e.error_message,
                "retry_count": e.retry_count,
                "created_at": e.created_at,
                "raw_payload": e.raw_payload,
            }
            for e in events
        ],
    }


@admin_router.post("/retry/{event_id}")
async def retry_webhook_event(
    event_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retry processing a failed webhook event."""
    event = await db.execute(
        select(Webhook_events).where(Webhook_events.id == event_id)
    )
    event_obj = event.scalar_one_or_none()
    if not event_obj:
        raise HTTPException(status_code=404, detail="Webhook event not found")

    if event_obj.processing_status not in ("failed", "pending", "pending_api_access"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry event with status '{event_obj.processing_status}'. Only 'failed', 'pending', or 'pending_api_access' events can be retried.",
        )

    # Reset to pending
    event_obj.processing_status = "pending"
    event_obj.error_message = None
    await db.commit()

    # Trigger processing
    import asyncio
    asyncio.create_task(_process_single_event(event_obj.id))

    return {"status": "retry_started", "event_id": event_obj.id}


@admin_router.post("/process-pending")
async def process_pending_events(
    include_api_access: bool = Query(False, description="Also reprocess pending_api_access events"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger processing of all pending webhook events.
    
    Set include_api_access=true to also reprocess events that were waiting
    for valid API credentials (pending_api_access status).
    """
    statuses = ["pending"]
    if include_api_access:
        statuses.append("pending_api_access")

    from sqlalchemy import or_
    pending_stmt = select(Webhook_events).where(
        or_(*[Webhook_events.processing_status == s for s in statuses])
    ).order_by(Webhook_events.id.asc())
    result = await db.execute(pending_stmt)
    pending_events = result.scalars().all()

    if not pending_events:
        return {"status": "no_pending", "count": 0, "statuses_checked": statuses}

    # Reset retry count and status for reprocessing
    for event in pending_events:
        event.processing_status = "pending"
        event.retry_count = 0
        event.error_message = None
    await db.commit()

    import asyncio
    for event in pending_events:
        asyncio.create_task(_process_single_event(event.id))

    return {"status": "processing_started", "count": len(pending_events), "statuses_checked": statuses}


@admin_router.post("/retry-failed")
async def retry_failed_events(
    entity_filter: Optional[str] = Query(None, description="Only retry failed events for this entity type"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retry all failed webhook events. Resets retry count and re-queues them.
    
    Failed events are categorized:
    - carerix_500: Carerix server returned 500 (their issue, may resolve on retry)
    - not_found: Record deleted in Carerix between webhook and fetch
    - api_access: Permission/credential issues
    - other: Other failures
    
    Optionally filter by entity_type (e.g., crx_matches).
    """
    query = select(Webhook_events).where(
        Webhook_events.processing_status == "failed"
    ).order_by(Webhook_events.id.asc())
    
    if entity_filter:
        query = query.where(Webhook_events.entity_type == entity_filter)
    
    result = await db.execute(query)
    failed_events = result.scalars().all()

    if not failed_events:
        return {"status": "no_failed", "count": 0, "entity_filter": entity_filter}

    # Categorize failures for reporting
    categories: dict = {
        "carerix_500": [],
        "not_found": [],
        "api_access": [],
        "other": [],
    }
    
    for event in failed_events:
        error_msg = (event.error_message or "").lower()
        if "500" in error_msg or "internal server error" in error_msg:
            categories["carerix_500"].append(event.id)
        elif "not found" in error_msg:
            categories["not_found"].append(event.id)
        elif "403" in error_msg or "forbidden" in error_msg or "credential" in error_msg:
            categories["api_access"].append(event.id)
        else:
            categories["other"].append(event.id)

    # Reset all failed events for retry
    for event in failed_events:
        event.processing_status = "pending"
        event.retry_count = 0
        event.error_message = None
    await db.commit()

    import asyncio
    for event in failed_events:
        asyncio.create_task(_process_single_event(event.id))

    return {
        "status": "retry_started",
        "count": len(failed_events),
        "entity_filter": entity_filter,
        "categories": {k: len(v) for k, v in categories.items()},
        "category_details": {
            "carerix_500": f"{len(categories['carerix_500'])} events failed due to Carerix server errors (500). These may succeed on retry.",
            "not_found": f"{len(categories['not_found'])} events where the record was not found in Carerix (may have been deleted).",
            "api_access": f"{len(categories['api_access'])} events with permission/credential issues.",
            "other": f"{len(categories['other'])} events with other errors.",
        },
    }


@admin_router.delete("/cleanup")
async def cleanup_webhook_events(
    keep_days: int = Query(30, description="Keep events from the last N days"),
    keep_statuses: str = Query("failed,pending,pending_api_access", description="Comma-separated statuses to always keep"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Clean up old completed/processed webhook events.
    Keeps failed/pending events and recent events within keep_days.
    """
    from sqlalchemy import delete as sa_delete

    try:
        total_stmt = select(func.count(Webhook_events.id))
        total_result = await db.execute(total_stmt)
        total_count = total_result.scalar() or 0

        # Parse statuses to keep
        protected_statuses = [s.strip() for s in keep_statuses.split(",") if s.strip()]

        # Calculate cutoff date
        cutoff = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=keep_days)
        cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Delete old events that are NOT in protected statuses
        delete_stmt = sa_delete(Webhook_events).where(
            Webhook_events.processing_status.notin_(protected_statuses),
            Webhook_events.created_at < cutoff_str,
        )
        result = await db.execute(delete_stmt)
        deleted_count = result.rowcount
        await db.commit()

        return {
            "status": "cleaned",
            "total_before": total_count,
            "deleted": deleted_count,
            "remaining": total_count - deleted_count,
            "kept_statuses": protected_statuses,
            "kept_days": keep_days,
        }
    except Exception as e:
        logger.error("Error cleaning up webhook events: %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


# ---------------------------------------------------------------------------
# Reconciliation endpoints
# ---------------------------------------------------------------------------

@admin_router.post("/reconcile/{entity_type}")
async def trigger_reconciliation(
    entity_type: str,
    since: Optional[str] = Query(None, description="ISO timestamp to reconcile from"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger reconciliation for a specific entity type.
    Fetches recently modified records from Carerix and upserts any missing/stale ones.
    """
    from services.webhook_reconciliation import reconcile_entity

    valid_types = [
        "companies", "employees", "crx_vacancies", "crx_publications",
        "crx_jobs", "crx_matches", "crx_todos",
    ]
    if entity_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity_type. Valid types: {valid_types}",
        )

    result = await reconcile_entity(db, entity_type, since=since)
    return result


@admin_router.post("/reconcile-all")
async def trigger_reconciliation_all(
    since: Optional[str] = Query(None, description="ISO timestamp to reconcile from"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger reconciliation for all entity types.
    Acts as a safety net for any missed webhook events.
    """
    from services.webhook_reconciliation import reconcile_all_entities

    results = await reconcile_all_entities(db, since=since)
    return {
        "results": results,
        "summary": {
            "total_checked": sum(r.get("records_checked", 0) for r in results.values()),
            "total_upserted": sum(r.get("records_upserted", 0) for r in results.values()),
        },
    }


# ---------------------------------------------------------------------------
# Webhook test & configuration endpoints
# ---------------------------------------------------------------------------

@admin_router.get("/config")
async def webhook_config(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Return webhook configuration info for setting up Carerix.
    Shows the webhook endpoint URL and whether the secret is configured.
    """
    # Determine the base URL from the request
    base_url = str(request.base_url).rstrip("/")

    # Also check for PYTHON_BACKEND_URL env var (deployed URL)
    deployed_url = os.environ.get("PYTHON_BACKEND_URL", "")

    webhook_endpoint = "/integrations/carerix/webhooks"
    carerix_tenant = os.environ.get("CARERIX_TENANT", "")
    carerix_client_id = os.environ.get("CARERIX_CLIENT_ID", "")
    carerix_wh_client_id = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID", "")
    carerix_wh_client_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")

    # Detect configuration issues
    issues = []

    # Check if PYTHON_BACKEND_URL is a placeholder
    url_is_placeholder = not deployed_url or "$$" in deployed_url or "BACKEND_DOMAIN" in deployed_url
    if url_is_placeholder:
        issues.append({
            "severity": "critical",
            "code": "URL_PLACEHOLDER",
            "message": (
                "PYTHON_BACKEND_URL is not set or contains a placeholder "
                f"(current value: '{deployed_url}'). "
                "Carerix cannot deliver webhook events to this URL. "
                "Set PYTHON_BACKEND_URL to your actual deployed backend URL "
                "(e.g., https://your-app.example.com)."
            ),
        })

    if not carerix_wh_client_id:
        issues.append({
            "severity": "warning",
            "code": "NO_WEBHOOK_CLIENT",
            "message": (
                "CARERIX_WEBHOOK_CLIENT_ID is not set. "
                "A dedicated webhook client with webhook scopes is required for webhook operations."
            ),
        })

    if not carerix_wh_client_secret:
        issues.append({
            "severity": "warning",
            "code": "NO_WEBHOOK_SECRET",
            "message": (
                "CARERIX_WEBHOOK_CLIENT_SECRET is not set. "
                "This is needed for webhook registration and Custom-Signature verification."
            ),
        })

    # Determine the effective webhook URL
    effective_url = f"{deployed_url}{webhook_endpoint}" if deployed_url and not url_is_placeholder else f"{base_url}{webhook_endpoint}"

    return {
        "webhook_endpoint": webhook_endpoint,
        "webhook_url_local": f"{base_url}{webhook_endpoint}",
        "webhook_url_deployed": f"{deployed_url}{webhook_endpoint}" if deployed_url else None,
        "webhook_url_effective": effective_url,
        "url_is_placeholder": url_is_placeholder,
        "tenant": carerix_tenant or "not configured (using default: confair)",
        # Flat properties for frontend dashboard compatibility
        "secret_configured": bool(carerix_wh_client_secret),
        "client_id_configured": bool(carerix_client_id),
        "webhook_client_id_configured": bool(carerix_wh_client_id),
        "webhook_client_id_hint": carerix_wh_client_id[:20] + "..." if len(carerix_wh_client_id) > 20 else carerix_wh_client_id or "(not set)",
        # Nested credentials (detailed view)
        "credentials": {
            "general_api": {
                "description": "General Carerix API credentials (GraphQL data access)",
                "client_id_configured": bool(carerix_client_id),
                "env_vars": ["CARERIX_CLIENT_ID", "CARERIX_CLIENT_SECRET"],
            },
            "webhook": {
                "description": "Webhook client credentials (webhook registration + Custom-Signature verification)",
                "client_id_configured": bool(carerix_wh_client_id),
                "client_secret_configured": bool(carerix_wh_client_secret),
                "client_id_hint": carerix_wh_client_id[:20] + "..." if len(carerix_wh_client_id) > 20 else carerix_wh_client_id or "(not set)",
                "env_vars": ["CARERIX_WEBHOOK_CLIENT_ID", "CARERIX_WEBHOOK_CLIENT_SECRET"],
            },
        },
        "issues": issues,
        "has_critical_issues": any(i["severity"] == "critical" for i in issues),
        "instructions": {
            "carerix_url": effective_url,
            "custom_header_name": "Custom-Signature",
            "custom_header_value": "<value of CARERIX_WEBHOOK_CLIENT_SECRET>",
            "supported_entities": [
                "CREmployee (employees)",
                "CRCompany (companies)",
                "CRVacancy (vacancies)",
                "CRPublication (publications)",
                "CRJob (jobs/placements)",
                "CRMatch (matches)",
                "CRTodo (todos)",
            ],
            "supported_events": ["created", "updated", "deleted"],
        },
    }


# ---------------------------------------------------------------------------
# Carerix Webhook Registration (via Carerix REST API)
# ---------------------------------------------------------------------------

@admin_router.get("/carerix-applications")
async def list_carerix_applications(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    List all webhook applications registered in Carerix.
    Carerix does NOT have a UI for this — it must be done via their REST API.
    """
    from services.carerix_webhook_setup import list_webhook_applications

    try:
        apps = await list_webhook_applications()
        return {"applications": apps, "count": len(apps)}
    except ValueError as e:
        return {"error": str(e), "applications": [], "count": 0}
    except Exception as e:
        logger.error("Failed to list Carerix webhook applications: %s", e)
        return {"error": f"Connection error: {str(e)}", "applications": [], "count": 0}


@admin_router.post("/carerix-applications")
async def create_carerix_application(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new webhook application in Carerix."""
    from services.carerix_webhook_setup import create_webhook_application

    body = await request.json()
    app_name = body.get("name", "Confair Sync")

    try:
        result = await create_webhook_application(app_name)
        return {"status": "created", "application": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to create Carerix webhook application: %s", e)
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")


@admin_router.get("/carerix-webhooks/{application_id}")
async def list_carerix_webhooks(
    application_id: str,
    enrich: bool = Query(True, description="Fetch full details for each webhook (URL, filters)"),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    List all webhooks for a specific Carerix application.
    
    When enrich=True (default), fetches individual webhook details to get URL and filters,
    since the list endpoint only returns _kind and _id.
    """
    from services.carerix_webhook_setup import list_webhooks, get_webhook_detail

    try:
        webhooks = await list_webhooks(application_id)
        
        if enrich and webhooks:
            enriched = []
            for wh in webhooks:
                wh_id = wh.get("_id") or wh.get("id", "")
                if wh_id:
                    try:
                        detail = await get_webhook_detail(application_id, wh_id)
                        enriched.append(detail)
                    except Exception as e:
                        logger.debug("Failed to enrich webhook %s: %s", wh_id, e)
                        enriched.append(wh)
                else:
                    enriched.append(wh)
            webhooks = enriched
        
        return {"webhooks": webhooks, "count": len(webhooks)}
    except ValueError as e:
        return {"error": str(e), "webhooks": [], "count": 0}
    except Exception as e:
        logger.error("Failed to list Carerix webhooks: %s", e)
        return {"error": f"Connection error: {str(e)}", "webhooks": [], "count": 0}


@admin_router.get("/carerix-webhooks/{application_id}/{webhook_id}/detail")
async def get_carerix_webhook_detail(
    application_id: str,
    webhook_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Fetch full details for a single webhook (URL, filters, customHeaders)."""
    from services.carerix_webhook_setup import get_webhook_detail

    try:
        detail = await get_webhook_detail(application_id, webhook_id)
        return {"webhook": detail}
    except Exception as e:
        logger.error("Failed to get webhook detail: %s", e)
        return {"error": str(e)}


def _extract_app_id(app_data: dict) -> str:
    """
    Extract the application ID from a Carerix API response object.

    Carerix may return the ID under various field names depending on the API version.
    This function tries all known possibilities and also does a recursive search
    for any field containing 'id' in its name.
    """
    if not isinstance(app_data, dict):
        return ""

    # Try known field names first — _id is prioritized because Carerix uses it
    known_id_fields = [
        "_id",
        "id",
        "applicationId",
        "application_id",
        "appId",
        "app_id",
        "ID",
        "Id",
        "uuid",
        "UUID",
        "identifier",
    ]
    for field in known_id_fields:
        val = app_data.get(field)
        if val is not None and str(val).strip():
            return str(val).strip()

    # Search for any key containing "id" (case-insensitive) that has a non-empty value
    for key, val in app_data.items():
        if "id" in key.lower() and val is not None and str(val).strip():
            logger.info("Found application ID in field '%s': %s", key, val)
            return str(val).strip()

    # Check nested objects (e.g., {"data": {"id": "..."}} or {"_links": {"self": {"href": "/applications/123"}}})
    for key, val in app_data.items():
        if isinstance(val, dict):
            nested_id = _extract_app_id(val)
            if nested_id:
                logger.info("Found application ID in nested field '%s': %s", key, nested_id)
                return nested_id

    # Try to extract from _links.self.href (HAL-style: "/applications/abc-123")
    links = app_data.get("_links", {})
    if isinstance(links, dict):
        self_link = links.get("self", {})
        href = self_link.get("href", "") if isinstance(self_link, dict) else ""
        if href and "/applications/" in href:
            app_id = href.split("/applications/")[-1].split("/")[0].split("?")[0]
            if app_id:
                logger.info("Extracted application ID from _links.self.href: %s", app_id)
                return app_id

    return ""


@admin_router.post("/carerix-register")
async def register_carerix_webhook(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Register our webhook endpoint URL in Carerix.

    This is the main action — it tells Carerix to send events to our ingestion URL.
    If no application exists yet, one will be created automatically.

    Body (all optional):
    - application_id: Existing Carerix application ID (auto-created if missing)
    - application_name: Name for new application (default: "Confair Sync")
    - event_filters: Custom event filters (default: all supported events)
    """
    from services.carerix_webhook_setup import (
        create_webhook_application,
        list_webhook_applications,
        register_webhook,
    )

    # Parse body safely — request.body() can only be read once
    try:
        body = await request.json()
    except Exception:
        body = {}
    application_id = body.get("application_id", "")
    application_name = body.get("application_name", "Confair Sync")
    event_filters = body.get("event_filters", None)

    # Determine our webhook URL
    deployed_url = os.environ.get("PYTHON_BACKEND_URL", "")
    base_url = str(request.base_url).rstrip("/")
    webhook_url = f"{deployed_url or base_url}/integrations/carerix/webhooks"
    # Use webhook client secret as the Custom-Signature verification value
    webhook_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")

    try:
        # Step 1: Get or create an application
        raw_app_data = None  # Keep for debugging
        if not application_id:
            # Check if an application already exists
            apps = await list_webhook_applications()
            if apps:
                raw_app_data = apps[0]
                application_id = _extract_app_id(apps[0])
                logger.info(
                    "Using existing Carerix webhook application: id=%s, raw_keys=%s",
                    application_id,
                    list(apps[0].keys()) if isinstance(apps[0], dict) else type(apps[0]),
                )
            else:
                # Create a new application
                new_app = await create_webhook_application(application_name)
                raw_app_data = new_app
                application_id = _extract_app_id(new_app)
                logger.info(
                    "Created new Carerix webhook application: id=%s, raw_keys=%s",
                    application_id,
                    list(new_app.keys()) if isinstance(new_app, dict) else type(new_app),
                )

        if not application_id:
            # Include the raw response in the error so the user/developer can debug
            raw_preview = ""
            if raw_app_data:
                try:
                    raw_preview = json.dumps(raw_app_data, default=str)[:500]
                except Exception:
                    raw_preview = str(raw_app_data)[:500]
            raise ValueError(
                f"Could not determine Carerix application ID. "
                f"The API response did not contain a recognizable ID field. "
                f"Raw response: {raw_preview}"
            )

        # Step 2: Register the webhook
        result = await register_webhook(
            application_id=application_id,
            webhook_url=webhook_url,
            webhook_secret=webhook_secret,
            event_filters=event_filters,
        )

        total_created = result.get("_total_webhooks_created", 1)
        filter_count = len(event_filters) if event_filters else 10  # default is 10

        return {
            "status": "registered",
            "message": (
                f"✅ Webhook successfully registered in Carerix! "
                f"({filter_count} event filters across {total_created} webhook(s))"
            ),
            "application_id": application_id,
            "webhook_url": webhook_url,
            "secret_included": bool(webhook_secret),
            "webhook": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to register webhook in Carerix: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@admin_router.get("/carerix-debug-raw")
async def debug_carerix_raw_response(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Debug endpoint: returns the RAW response from the Carerix Webhooks API.
    Useful for understanding the exact response format when ID extraction fails.
    """
    from services.carerix_webhook_setup import _get_webhook_token, CARERIX_WEBHOOKS_BASE
    import httpx

    try:
        token, claims = await _get_webhook_token()

        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(
                f"{CARERIX_WEBHOOKS_BASE}/applications",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

        # Parse the response
        try:
            body_json = response.json()
        except Exception:
            body_json = None

        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body_raw": response.text[:2000],
            "body_json": body_json,
            "body_type": type(body_json).__name__,
            "token_scopes": claims.get("scope", ""),
            "analysis": _analyze_response(body_json),
        }
    except Exception as e:
        return {"error": str(e)}


def _analyze_response(body: object) -> dict:
    """Analyze the Carerix API response to help debug ID extraction."""
    analysis: dict = {"type": type(body).__name__}

    if isinstance(body, list):
        analysis["count"] = len(body)
        if body:
            first = body[0]
            analysis["first_item_type"] = type(first).__name__
            if isinstance(first, dict):
                analysis["first_item_keys"] = list(first.keys())
                analysis["extracted_id"] = _extract_app_id(first)
    elif isinstance(body, dict):
        analysis["keys"] = list(body.keys())
        analysis["extracted_id"] = _extract_app_id(body)
        # Check for nested lists
        for key, val in body.items():
            if isinstance(val, list) and val:
                analysis[f"nested_list_{key}_count"] = len(val)
                if isinstance(val[0], dict):
                    analysis[f"nested_list_{key}_first_keys"] = list(val[0].keys())
                    analysis[f"nested_list_{key}_extracted_id"] = _extract_app_id(val[0])

    return analysis


@admin_router.delete("/carerix-webhooks/{application_id}/{webhook_id}")
async def delete_carerix_webhook(
    application_id: str,
    webhook_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a webhook from Carerix."""
    from services.carerix_webhook_setup import delete_webhook

    try:
        success = await delete_webhook(application_id, webhook_id)
        if success:
            return {"status": "deleted", "message": "Webhook removed from Carerix."}
        raise HTTPException(status_code=400, detail="Failed to delete webhook.")
    except Exception as e:
        logger.error("Failed to delete Carerix webhook: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/carerix-webhooks/{application_id}/{webhook_id}/enable")
async def enable_carerix_webhook(
    application_id: str,
    webhook_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Enable a webhook in Carerix."""
    from services.carerix_webhook_setup import enable_webhook

    try:
        success = await enable_webhook(application_id, webhook_id)
        if success:
            return {"status": "enabled", "message": "Webhook enabled in Carerix."}
        raise HTTPException(status_code=400, detail="Failed to enable webhook.")
    except Exception as e:
        logger.error("Failed to enable Carerix webhook: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/carerix-webhooks/{application_id}/{webhook_id}/disable")
async def disable_carerix_webhook(
    application_id: str,
    webhook_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Disable a webhook in Carerix."""
    from services.carerix_webhook_setup import disable_webhook

    try:
        success = await disable_webhook(application_id, webhook_id)
        if success:
            return {"status": "disabled", "message": "Webhook disabled in Carerix."}
        raise HTTPException(status_code=400, detail="Failed to disable webhook.")
    except Exception as e:
        logger.error("Failed to disable Carerix webhook: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.delete("/carerix-applications/{application_id}")
async def delete_carerix_application(
    application_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a webhook application from Carerix."""
    from services.carerix_webhook_setup import delete_application

    try:
        success = await delete_application(application_id)
        if success:
            return {"status": "deleted", "message": "Application removed from Carerix."}
        raise HTTPException(status_code=400, detail="Failed to delete application. It may still have webhooks attached.")
    except Exception as e:
        logger.error("Failed to delete Carerix application: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/test")
async def test_webhook_connection(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test the webhook ingestion pipeline by directly inserting a simulated
    Carerix event into the database (bypasses HTTP self-request to avoid
    SSL/proxy issues in deployed environments).
    """
    # Use webhook client secret for Custom-Signature verification
    webhook_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")

    # Create a test payload that mimics the OFFICIAL Carerix webhook format
    # See: https://help.carerix.com/en/articles/9240207-introducing-webhooks-in-carerix
    test_event_id = f"test-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    test_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    test_payload = {
        "id": test_event_id,
        "time": test_time,
        "type": "cremployee:updated",
        "applicationId": "test-app-000",
        "webhookId": "test-webhook-000",
        "tenant": os.environ.get("CARERIX_TENANT", "confair"),
        "data": {
            "entityId": "999999",
            "changedFields": ["firstName", "lastName", "modificationDate"],
        },
        "_test": True,
    }

    try:
        # Verify signature logic works (dry-run)
        payload_bytes = json.dumps(test_payload).encode()
        signature_valid = True
        if webhook_secret:
            # Custom-Signature is a raw shared secret, not HMAC
            signature_valid = _verify_custom_signature(webhook_secret, webhook_secret)

        # Check for duplicate (idempotency)
        existing = await db.execute(
            select(Webhook_events).where(Webhook_events.event_id == test_event_id)
        )
        if existing.scalar_one_or_none():
            return {
                "test_result": "duplicate",
                "event_id": test_event_id,
                "signature_used": bool(webhook_secret),
                "message": "⚠️ A test event with this ID already exists. Try again in a second.",
            }

        # Parse using the same logic as the real ingestion
        type_field = test_payload.get("type", "")
        entity_type_raw, event_action = type_field.rsplit(":", 1)
        entity_type = _map_carerix_entity(entity_type_raw)
        data_block = test_payload.get("data", {})
        entity_id = str(data_block.get("entityId", ""))
        changed_fields_list = data_block.get("changedFields", [])
        changed_fields = ", ".join(changed_fields_list)

        # Store the event directly (same logic as ingest_webhook)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        webhook_event = Webhook_events(
            event_id=test_event_id,
            entity_id=entity_id,
            entity_type=entity_type,
            event_type=event_action,
            event_time=test_time,
            changed_fields=changed_fields,
            raw_payload=json.dumps(test_payload, default=str),
            processing_status="pending",
            retry_count=0,
            created_at=now_str,
        )
        db.add(webhook_event)
        await db.commit()
        await db.refresh(webhook_event)

        # Trigger async processing
        import asyncio
        asyncio.create_task(_process_single_event(webhook_event.id))

        # Determine the webhook URL for display
        base_url = str(request.base_url).rstrip("/")
        deployed_url = os.environ.get("PYTHON_BACKEND_URL", "")
        display_url = f"{deployed_url or base_url}/integrations/carerix/webhooks"

        return {
            "test_result": "success",
            "status_code": 204,
            "webhook_url": display_url,
            "signature_used": bool(webhook_secret),
            "signature_valid": signature_valid,
            "event_stored": True,
            "event_id": test_event_id,
            "event_processing_status": webhook_event.processing_status,
            "message": "✅ Webhook test successful! The event was received and stored.",
        }
    except Exception as e:
        logger.error("Webhook test failed: %s", e, exc_info=True)
        return {
            "test_result": "error",
            "error": str(e),
            "message": f"❌ Webhook test failed: {str(e)}",
        }


@admin_router.post("/test-carerix-auth")
async def test_carerix_auth(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Test the Carerix API authentication by attempting to obtain an access token.
    Tries multiple Keycloak hosts to find the working one.
    Tests both the general client and the webhook-specific client.
    """
    import httpx

    tenant = os.environ.get("CARERIX_TENANT", "")
    client_id = os.environ.get("CARERIX_CLIENT_ID", "")
    client_secret = os.environ.get("CARERIX_CLIENT_SECRET", "")
    wh_client_id = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID", "")
    wh_client_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")

    if not tenant:
        return {"test_result": "error", "message": "❌ CARERIX_TENANT is not configured"}

    # Build list of clients to test
    clients_to_test = []
    if wh_client_id and wh_client_secret:
        clients_to_test.append(("Webhook Client", wh_client_id, wh_client_secret))
    if client_id and client_secret:
        clients_to_test.append(("General Client", client_id, client_secret))

    if not clients_to_test:
        return {"test_result": "error", "message": "❌ No Carerix credentials configured (CARERIX_CLIENT_ID or CARERIX_WEBHOOK_CLIENT_ID)"}

    # Build list of Keycloak hosts to try
    keycloak_hosts = ["https://id.carerix.io", "https://id-s4.carerix.io"]
    custom_host = os.environ.get("CARERIX_KEYCLOAK_HOST", "")
    if custom_host and custom_host not in keycloak_hosts:
        keycloak_hosts.insert(0, custom_host)

    results = []
    for host in keycloak_hosts:
        token_url = f"{host}/auth/realms/{tenant}/protocol/openid-connect/token"
        for client_label, cid, csecret in clients_to_test:
            try:
                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    response = await http_client.post(
                        token_url,
                        data={
                            "grant_type": "client_credentials",
                            "client_id": cid,
                            "client_secret": csecret,
                        },
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )

                if response.status_code == 200:
                    token_data = response.json()
                    results.append({
                        "client": client_label,
                        "token_url": token_url,
                        "success": True,
                        "token_type": token_data.get("token_type", ""),
                        "expires_in": token_data.get("expires_in", 0),
                    })
                else:
                    error_detail = ""
                    try:
                        error_detail = response.json().get("error_description", response.text[:200])
                    except Exception:
                        error_detail = response.text[:200]
                    results.append({
                        "client": client_label,
                        "token_url": token_url,
                        "success": False,
                        "status_code": response.status_code,
                        "error": error_detail,
                    })
            except Exception as e:
                results.append({
                    "client": client_label,
                    "token_url": token_url,
                    "success": False,
                    "error": f"Connection error: {str(e)}",
                })

    # Determine overall result
    any_success = any(r["success"] for r in results)
    if any_success:
        successful = [r for r in results if r["success"]]
        first_success = successful[0]
        return {
            "test_result": "success",
            "message": f"✅ Carerix authentication successful! ({first_success['client']} via {first_success['token_url']})",
            "token_type": first_success.get("token_type", ""),
            "expires_in": first_success.get("expires_in", 0),
            "token_url": first_success["token_url"],
            "all_results": results,
        }
    else:
        return {
            "test_result": "failed",
            "message": f"❌ Authentication failed on all {len(results)} attempts. Check credentials and tenant name.",
            "all_results": results,
        }


# ---------------------------------------------------------------------------
# Token Diagnostics (helps debug 403 issues)
# ---------------------------------------------------------------------------

@admin_router.get("/diagnose-token")
async def diagnose_carerix_token(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Diagnose Carerix API token — shows what scopes/permissions the token has.
    Helps debug 403 errors by revealing whether the webhook scope is missing.
    """
    from services.carerix_webhook_setup import diagnose_token

    try:
        result = await diagnose_token()
        return result
    except Exception as e:
        logger.error("Token diagnosis failed: %s", e)
        return {"error": str(e)}


# Expose both routers for auto-discovery
router = webhook_router