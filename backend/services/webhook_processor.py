"""
Webhook Event Processor.

Processes pending webhook events by:
1. Fetching the full record from Carerix GraphQL API
2. Transforming via FIELD_MAPPERS (reuses carerix_sync.py)
3. Upserting into the local warehouse table
4. Updating the webhook_event status

Includes retry logic with exponential backoff.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Maximum retries before marking as permanently failed
MAX_RETRIES = 3

# Echo suppression: track outbound request IDs to suppress echo webhooks
# Key: entity_type:entity_id, Value: expiry timestamp
_echo_suppression_cache: dict[str, float] = {}
_ECHO_TTL_SECONDS = 120  # Suppress echoes for 2 minutes after outbound write


def register_outbound_write(entity_type: str, entity_id: str):
    """Register an outbound write to suppress the resulting echo webhook."""
    key = f"{entity_type}:{entity_id}"
    _echo_suppression_cache[key] = time.time() + _ECHO_TTL_SECONDS
    logger.debug("Registered echo suppression for %s (TTL=%ds)", key, _ECHO_TTL_SECONDS)


def _is_echo(entity_type: str, entity_id: str) -> bool:
    """Check if a webhook event is an echo from our own outbound write."""
    key = f"{entity_type}:{entity_id}"
    expiry = _echo_suppression_cache.get(key)
    if expiry and time.time() < expiry:
        return True
    # Clean up expired entry
    _echo_suppression_cache.pop(key, None)
    return False


# Alternate GraphQL query configs for single-record webhook lookups.
# Some entities use optimized bulk endpoints (e.g., crTaskPage for crx_todos)
# that don't support single-record qualifiers. For webhook processing,
# we fall back to the general endpoint that supports ID-based qualifiers.
_WEBHOOK_SINGLE_RECORD_OVERRIDES = {
    "crx_todos": {
        "query_name": "crToDoPage",  # General CRToDo endpoint (supports toDoID qualifier)
        # Use the same fields as the bulk config
    },
}


async def _fetch_single_record(
    token: str,
    entity_type: str,
    qualifier: str,
    config: dict,
) -> tuple:
    """Fetch a single record for webhook processing.

    For most entities, this delegates directly to _fetch_carerix_page.
    For entities with alternate webhook query configs (e.g., crx_todos),
    it temporarily overrides the query_name to use an endpoint that
    supports single-record qualifiers.

    Returns:
        Tuple of (page_data, error_message) — same as _fetch_carerix_page.
    """
    from services.carerix_sync import ENTITY_QUERIES, _fetch_carerix_page

    override = _WEBHOOK_SINGLE_RECORD_OVERRIDES.get(entity_type)

    if not override:
        # Standard path — use the normal entity query
        return await _fetch_carerix_page(
            token, entity_type, page=0, page_size=1,
            qualifier=qualifier,
        )

    # Override path — temporarily swap the query_name in ENTITY_QUERIES
    original_query_name = config["query_name"]
    override_query_name = override["query_name"]

    logger.info(
        "Webhook single-record fetch for %s: using %s instead of %s (qualifier: %s)",
        entity_type, override_query_name, original_query_name, qualifier,
    )

    # Temporarily patch ENTITY_QUERIES for this fetch
    ENTITY_QUERIES[entity_type]["query_name"] = override_query_name
    try:
        page_data, page_error = await _fetch_carerix_page(
            token, entity_type, page=0, page_size=1,
            qualifier=qualifier,
        )
    finally:
        # Always restore the original query_name for bulk sync
        ENTITY_QUERIES[entity_type]["query_name"] = original_query_name

    # If the override also failed, log it clearly
    if page_error and not page_data:
        logger.warning(
            "Webhook single-record fetch for %s failed even with %s: %s",
            entity_type, override_query_name, page_error[:200] if page_error else "unknown",
        )

    return page_data, page_error


async def process_webhook_event(event_db_id: int):
    """
    Process a single webhook event.

    Steps:
    1. Load event from DB
    2. Check for echo suppression
    3. Fetch full record from Carerix GraphQL
    4. Transform using FIELD_MAPPERS
    5. Upsert into warehouse table
    6. Update event status
    """
    from core.database import db_manager
    from services.carerix_sync import (
        ENTITY_QUERIES,
        FIELD_MAPPERS,
        _get_model_class,
        _fetch_carerix_page,
    )
    from services.carerix_auth import _get_access_token
    from models.webhook_events import Webhook_events

    if not db_manager.async_session_maker:
        logger.error("Database session maker not available for webhook processing")
        return

    async with db_manager.async_session_maker() as db:
        # Load the event
        result = await db.execute(
            select(Webhook_events).where(Webhook_events.id == event_db_id)
        )
        event = result.scalar_one_or_none()
        if not event:
            logger.warning("Webhook event %d not found", event_db_id)
            return

        # Skip if already processed
        if event.processing_status in ("completed", "duplicate", "echo_suppressed"):
            return

        # Mark as processing
        event.processing_status = "processing"
        await db.commit()

        try:
            entity_type = event.entity_type
            entity_id = event.entity_id
            event_type = event.event_type

            # Extract and persist changed_fields from raw payload if not already set
            if not event.changed_fields and event.raw_payload:
                try:
                    raw = json.loads(event.raw_payload)
                    data_block = raw.get("data", {})
                    changed = data_block.get("changedFields", [])
                    if not changed:
                        changed = raw.get("changedFields", [])
                    if changed:
                        event.changed_fields = json.dumps(changed)
                except Exception:
                    pass

            # Check echo suppression
            if _is_echo(entity_type, entity_id):
                event.processing_status = "echo_suppressed"
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await db.commit()
                logger.info(
                    "Webhook event %d suppressed (echo from outbound write): %s/%s",
                    event_db_id, entity_type, entity_id,
                )
                return

            # Validate entity type
            if entity_type not in ENTITY_QUERIES:
                # If entity_type is empty but we can infer from raw payload, try that
                if not entity_type and event.raw_payload:
                    try:
                        raw = json.loads(event.raw_payload)
                        raw_type = (raw.get("type") or raw.get("eventType") or "").lower()
                        type_map = {
                            "cremployee": "employees",
                            "crmatch": "crx_matches",
                            "crvacancy": "crx_vacancies",
                            "crpublication": "crx_publications",
                            "crjob": "crx_jobs",
                            "crtodo": "crx_todos",
                            "crcompany": "companies",
                        }
                        for prefix, mapped_type in type_map.items():
                            if raw_type.startswith(prefix + ":") or raw_type.startswith(prefix):
                                entity_type = mapped_type
                                event.entity_type = entity_type
                                break
                    except Exception:
                        pass

                if entity_type not in ENTITY_QUERIES:
                    event.processing_status = "failed"
                    event.error_message = f"Unknown entity type: {entity_type}"
                    event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                    await db.commit()
                    logger.warning("Unknown entity type in webhook: %s", entity_type)
                    return

            # Handle delete events
            if event_type in ("deleted", "delete"):
                event.processing_status = "completed"
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await db.commit()
                logger.info(
                    "Webhook delete event %d for %s/%s — marked completed (no local delete implemented)",
                    event_db_id, entity_type, entity_id,
                )
                return

            # Fetch full record from Carerix GraphQL
            token = await _get_access_token()
            if not token:
                # No valid credentials at all — mark as pending_api_access
                # so it can be reprocessed once credentials are fixed
                event.processing_status = "pending_api_access"
                event.error_message = (
                    "No valid Carerix API credentials available. "
                    "Event stored; will be processed when credentials are configured."
                )
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await db.commit()
                logger.warning(
                    "Webhook event %d: no API credentials, marked pending_api_access: %s/%s",
                    event_db_id, entity_type, entity_id,
                )
                return

            config = ENTITY_QUERIES[entity_type]
            id_field = config["id_field"]

            # Build qualifier to fetch this specific record
            qualifier = f"{id_field} = {entity_id}"

            # --- Special handling for crx_todos ---
            # The bulk sync uses crTaskPage (CRTask entity) which is efficient
            # for fetching all tasks, but it returns 500 errors when queried
            # with a single-record qualifier like "toDoID = X".
            # For webhook single-record lookups, we use crToDoPage instead,
            # which properly supports the toDoID qualifier.
            page_data, page_error = await _fetch_single_record(
                token, entity_type, qualifier, config,
            )

            if page_error and not page_data:
                # Check if this is a permissions error (403) vs a transient error
                error_str = str(page_error).lower()
                if "403" in error_str or "forbidden" in error_str:
                    event.processing_status = "pending_api_access"
                    event.error_message = (
                        f"GraphQL API returned 403 Forbidden. "
                        f"Current credentials lack data access permissions. "
                        f"Event stored; will be processed when proper API credentials are configured."
                    )
                    event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                    await db.commit()
                    logger.warning(
                        "Webhook event %d: API access forbidden (403), marked pending_api_access: %s/%s",
                        event_db_id, entity_type, entity_id,
                    )
                    return
                raise Exception(f"Failed to fetch record from Carerix: {page_error}")

            items = (page_data or {}).get("items", [])
            if not items:
                # Record might have been deleted in Carerix between webhook and fetch
                event.processing_status = "completed"
                event.error_message = "Record not found in Carerix (may have been deleted)"
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await db.commit()
                logger.info(
                    "Webhook event %d: record %s/%s not found in Carerix",
                    event_db_id, entity_type, entity_id,
                )
                return

            # Transform using FIELD_MAPPERS
            mapper = FIELD_MAPPERS[entity_type]
            item = items[0]
            mapped = mapper(item)

            carerix_id = mapped.get("carerix_id")
            if carerix_id is None:
                event.processing_status = "failed"
                event.error_message = "Mapped record has null carerix_id"
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                await db.commit()
                return

            # Get model class and upsert
            model_class = _get_model_class(entity_type)
            if not model_class:
                raise Exception(f"No model class for entity type: {entity_type}")

            model_columns = {c.name for c in model_class.__table__.columns}
            safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}

            update_columns = [
                c.name for c in model_class.__table__.columns
                if c.name not in ("id", "carerix_id")
            ]

            # Upsert using PostgreSQL INSERT ... ON CONFLICT
            async with db_manager.async_session_maker() as upsert_db:
                stmt = pg_insert(model_class).values(**safe_mapped)
                update_dict = {
                    col: stmt.excluded[col] for col in update_columns
                    if col in safe_mapped
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
                await upsert_db.execute(stmt)
                await upsert_db.commit()

            # Mark as completed
            event.processing_status = "completed"
            event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            event.error_message = None
            await db.commit()

            logger.info(
                "Webhook event %d processed successfully: %s/%s (carerix_id=%s)",
                event_db_id, entity_type, entity_id, carerix_id,
            )

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)[:500]}"
            retry_count = (event.retry_count or 0) + 1
            event.retry_count = retry_count

            if retry_count >= MAX_RETRIES:
                event.processing_status = "failed"
                event.error_message = f"Failed after {retry_count} retries. Last error: {error_msg}"
                event.processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                logger.error(
                    "Webhook event %d permanently failed after %d retries: %s",
                    event_db_id, retry_count, error_msg,
                )
            else:
                event.processing_status = "pending"
                event.error_message = f"Retry {retry_count}/{MAX_RETRIES}: {error_msg}"
                logger.warning(
                    "Webhook event %d failed (attempt %d/%d), will retry: %s",
                    event_db_id, retry_count, MAX_RETRIES, error_msg,
                )

            try:
                await db.commit()
            except Exception:
                await db.rollback()

            # Schedule retry with exponential backoff
            if retry_count < MAX_RETRIES:
                delay = 2 ** retry_count  # 2s, 4s, 8s
                await asyncio.sleep(delay)
                await process_webhook_event(event_db_id)