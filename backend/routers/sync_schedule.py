"""
Sync Schedule & Operations Timeline API Router.

Provides endpoints for:
- GET/PUT sync schedule configuration
- GET unified operations timeline (merged sync logs + webhook events)
- Background scheduler that triggers syncs at configured times
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db, db_manager
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.sync_schedule import SyncSchedule

router = APIRouter(prefix="/api/v1", tags=["operations"])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ScheduleResponse(BaseModel):
    enabled: bool
    sync_time_1: str
    sync_time_2: str
    timezone: str
    last_scheduled_run: Optional[str] = None
    next_sync_in_minutes: Optional[int] = None
    next_sync_time: Optional[str] = None


class ScheduleUpdate(BaseModel):
    enabled: Optional[bool] = None
    sync_time_1: Optional[str] = None
    sync_time_2: Optional[str] = None
    timezone: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: compute next sync time
# ---------------------------------------------------------------------------


def _parse_hhmm(time_str: str) -> tuple[int, int]:
    """Parse 'HH:MM' string into (hour, minute)."""
    parts = time_str.strip().split(":")
    return int(parts[0]), int(parts[1])


def _compute_next_sync(
    sync_time_1: str,
    sync_time_2: str,
    tz_name: str,
) -> tuple[Optional[datetime], Optional[int]]:
    """Return (next_sync_datetime_utc, minutes_until) for the two daily times."""
    try:
        from zoneinfo import ZoneInfo
    except ImportError:
        from backports.zoneinfo import ZoneInfo  # type: ignore

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")

    now_local = datetime.now(tz)
    h1, m1 = _parse_hhmm(sync_time_1)
    h2, m2 = _parse_hhmm(sync_time_2)

    today = now_local.date()
    candidates = [
        datetime(today.year, today.month, today.day, h1, m1, tzinfo=tz),
        datetime(today.year, today.month, today.day, h2, m2, tzinfo=tz),
    ]
    # Also consider tomorrow's first slot
    tomorrow = today + timedelta(days=1)
    candidates.append(
        datetime(tomorrow.year, tomorrow.month, tomorrow.day, h1, m1, tzinfo=tz)
    )

    future = [c for c in candidates if c > now_local]
    if not future:
        return None, None

    next_sync = min(future)
    diff = next_sync - now_local
    minutes = int(diff.total_seconds() / 60)
    return next_sync.astimezone(timezone.utc), minutes


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/sync/schedule")
async def get_schedule(
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    """Get the current sync schedule configuration."""
    result = await db.execute(select(SyncSchedule).where(SyncSchedule.id == 1))
    schedule = result.scalar_one_or_none()

    if not schedule:
        # Return defaults
        next_dt, next_min = _compute_next_sync("06:00", "18:00", "Europe/Amsterdam")
        return ScheduleResponse(
            enabled=True,
            sync_time_1="06:00",
            sync_time_2="18:00",
            timezone="Europe/Amsterdam",
            last_scheduled_run=None,
            next_sync_in_minutes=next_min,
            next_sync_time=next_dt.isoformat() if next_dt else None,
        )

    next_dt, next_min = _compute_next_sync(
        schedule.sync_time_1, schedule.sync_time_2, schedule.timezone
    )
    return ScheduleResponse(
        enabled=schedule.enabled,
        sync_time_1=schedule.sync_time_1,
        sync_time_2=schedule.sync_time_2,
        timezone=schedule.timezone,
        last_scheduled_run=(
            schedule.last_scheduled_run.isoformat()
            if schedule.last_scheduled_run
            else None
        ),
        next_sync_in_minutes=next_min,
        next_sync_time=next_dt.isoformat() if next_dt else None,
    )


@router.put("/sync/schedule")
async def update_schedule(
    body: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    """Update the sync schedule configuration."""
    result = await db.execute(select(SyncSchedule).where(SyncSchedule.id == 1))
    schedule = result.scalar_one_or_none()

    if not schedule:
        schedule = SyncSchedule(id=1)
        db.add(schedule)

    if body.enabled is not None:
        schedule.enabled = body.enabled
    if body.sync_time_1 is not None:
        # Validate HH:MM format
        _parse_hhmm(body.sync_time_1)
        schedule.sync_time_1 = body.sync_time_1
    if body.sync_time_2 is not None:
        _parse_hhmm(body.sync_time_2)
        schedule.sync_time_2 = body.sync_time_2
    if body.timezone is not None:
        schedule.timezone = body.timezone

    await db.commit()
    await db.refresh(schedule)

    next_dt, next_min = _compute_next_sync(
        schedule.sync_time_1, schedule.sync_time_2, schedule.timezone
    )
    return ScheduleResponse(
        enabled=schedule.enabled,
        sync_time_1=schedule.sync_time_1,
        sync_time_2=schedule.sync_time_2,
        timezone=schedule.timezone,
        last_scheduled_run=(
            schedule.last_scheduled_run.isoformat()
            if schedule.last_scheduled_run
            else None
        ),
        next_sync_in_minutes=next_min,
        next_sync_time=next_dt.isoformat() if next_dt else None,
    )


@router.get("/operations/timeline")
async def get_operations_timeline(
    hours: int = 48,
    db: AsyncSession = Depends(get_db),
    _user: UserResponse = Depends(get_current_user),
):
    """Get a unified timeline of sync runs and webhook events for the last N hours.

    Returns events sorted by time descending, each tagged with source='sync' or 'webhook'.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    cutoff_str = cutoff.strftime("%Y-%m-%d %H:%M:%S")

    timeline_items = []

    # 1. Fetch sync log entries
    try:
        sync_query = text("""
            SELECT id, entity_type, sync_type, started_at, completed_at,
                   records_fetched, records_created, records_updated,
                   sync_status, error_message, carerix_query_time_ms
            FROM sync_log_entries
            WHERE started_at >= :cutoff
            ORDER BY started_at DESC
            LIMIT 100
        """)
        sync_result = await db.execute(sync_query, {"cutoff": cutoff_str})
        sync_rows = sync_result.fetchall()

        for row in sync_rows:
            timeline_items.append({
                "source": "sync",
                "id": row[0],
                "entity_type": row[1],
                "event_type": row[2],  # sync_type: full/incremental
                "timestamp": row[3],  # started_at
                "completed_at": row[4],
                "records_fetched": row[5],
                "records_created": row[6],
                "records_updated": row[7],
                "status": row[8],
                "error_message": row[9],
                "query_time_ms": row[10],
            })
    except Exception as e:
        logger.warning("Could not fetch sync logs for timeline: %s", e)

    # 2. Fetch webhook events
    try:
        webhook_query = text("""
            SELECT id, entity_type, event_type, entity_id,
                   processing_status, created_at, processed_at,
                   error_message, changed_fields
            FROM webhook_events
            WHERE created_at >= :cutoff
            ORDER BY created_at DESC
            LIMIT 100
        """)
        wh_result = await db.execute(webhook_query, {"cutoff": cutoff_str})
        wh_rows = wh_result.fetchall()

        for row in wh_rows:
            timeline_items.append({
                "source": "webhook",
                "id": row[0],
                "entity_type": row[1],
                "event_type": row[2],
                "entity_id": row[3],
                "status": row[4],
                "timestamp": row[5],  # created_at
                "processed_at": row[6],
                "error_message": row[7],
                "changed_fields": row[8],
            })
    except Exception as e:
        logger.warning("Could not fetch webhook events for timeline: %s", e)

    # 3. Fetch schedule info
    schedule_info = None
    try:
        sched_result = await db.execute(select(SyncSchedule).where(SyncSchedule.id == 1))
        sched = sched_result.scalar_one_or_none()
        if sched:
            next_dt, next_min = _compute_next_sync(
                sched.sync_time_1, sched.sync_time_2, sched.timezone
            )
            schedule_info = {
                "enabled": sched.enabled,
                "sync_time_1": sched.sync_time_1,
                "sync_time_2": sched.sync_time_2,
                "timezone": sched.timezone,
                "next_sync_in_minutes": next_min,
                "next_sync_time": next_dt.isoformat() if next_dt else None,
                "last_scheduled_run": (
                    sched.last_scheduled_run.isoformat()
                    if sched.last_scheduled_run
                    else None
                ),
            }
    except Exception as e:
        logger.warning("Could not fetch schedule for timeline: %s", e)

    # Sort all items by timestamp descending
    def _get_ts(item: dict) -> str:
        ts = item.get("timestamp")
        if ts is None:
            return ""
        if isinstance(ts, datetime):
            return ts.isoformat()
        return str(ts)

    timeline_items.sort(key=_get_ts, reverse=True)

    # Convert datetime objects to strings for JSON serialization
    for item in timeline_items:
        for key in ["timestamp", "completed_at", "processed_at"]:
            val = item.get(key)
            if isinstance(val, datetime):
                item[key] = val.isoformat()

    return {
        "timeline": timeline_items,
        "schedule": schedule_info,
        "hours": hours,
        "total_items": len(timeline_items),
    }


# ---------------------------------------------------------------------------
# Background scheduler
# ---------------------------------------------------------------------------

_scheduler_task: Optional[asyncio.Task] = None
_scheduler_running = False


async def _scheduler_loop():
    """Background loop that checks every 60 seconds if it's time to run a scheduled sync."""
    global _scheduler_running
    _scheduler_running = True
    logger.info("Sync scheduler started")

    while _scheduler_running:
        try:
            await asyncio.sleep(60)

            if not db_manager.async_session_maker:
                continue

            async with db_manager.async_session_maker() as db:
                result = await db.execute(select(SyncSchedule).where(SyncSchedule.id == 1))
                schedule = result.scalar_one_or_none()

                if not schedule or not schedule.enabled:
                    continue

                # Check if current time matches either sync slot (within 2-minute window)
                try:
                    from zoneinfo import ZoneInfo
                except ImportError:
                    from backports.zoneinfo import ZoneInfo  # type: ignore

                try:
                    tz = ZoneInfo(schedule.timezone)
                except Exception:
                    tz = ZoneInfo("UTC")

                now_local = datetime.now(tz)
                h1, m1 = _parse_hhmm(schedule.sync_time_1)
                h2, m2 = _parse_hhmm(schedule.sync_time_2)

                current_h = now_local.hour
                current_m = now_local.minute

                should_sync = False
                # Check if we're within a 2-minute window of either sync time
                for sh, sm in [(h1, m1), (h2, m2)]:
                    target_minutes = sh * 60 + sm
                    current_minutes = current_h * 60 + current_m
                    diff = abs(current_minutes - target_minutes)
                    if diff <= 1:  # Within 1 minute
                        should_sync = True
                        break

                if not should_sync:
                    continue

                # Check if we already ran recently (within last 30 minutes)
                if schedule.last_scheduled_run:
                    last_run_local = schedule.last_scheduled_run.astimezone(tz) if schedule.last_scheduled_run.tzinfo else schedule.last_scheduled_run.replace(tzinfo=tz)
                    if (now_local - last_run_local).total_seconds() < 1800:
                        continue

                # Time to sync! Update last_scheduled_run and trigger
                logger.info(
                    "Scheduled sync triggered at %s (schedule: %s, %s %s)",
                    now_local.strftime("%H:%M"),
                    schedule.sync_time_1,
                    schedule.sync_time_2,
                    schedule.timezone,
                )
                schedule.last_scheduled_run = datetime.now(timezone.utc)
                await db.commit()

            # Trigger sync via the existing background mechanism
            # Import here to avoid circular imports
            from routers.carerix_sync import _run_sync_in_background

            asyncio.create_task(_run_sync_in_background("all", full_sync=False))

        except asyncio.CancelledError:
            logger.info("Sync scheduler cancelled")
            break
        except Exception as e:
            logger.error("Scheduler error: %s", e, exc_info=True)
            await asyncio.sleep(60)  # Wait before retrying

    _scheduler_running = False
    logger.info("Sync scheduler stopped")


def start_scheduler():
    """Start the background scheduler task. Called from app lifespan."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("Sync scheduler task created")


def stop_scheduler():
    """Stop the background scheduler task. Called from app shutdown."""
    global _scheduler_running, _scheduler_task
    _scheduler_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
    logger.info("Sync scheduler task stopped")