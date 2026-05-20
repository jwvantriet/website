"""Sync schedule configuration model."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from models.base import Base


class SyncSchedule(Base):
    """Stores the automated sync schedule configuration.

    Only one row is expected (id=1). The two time fields store HH:MM strings
    representing the two daily full-sync times in UTC.
    """

    __tablename__ = "sync_schedules"

    id = Column(Integer, primary_key=True, default=1)
    enabled = Column(Boolean, default=True, nullable=False)
    sync_time_1 = Column(String, default="06:00", nullable=False)
    sync_time_2 = Column(String, default="18:00", nullable=False)
    timezone = Column(String, default="Europe/Amsterdam", nullable=False)
    last_scheduled_run = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())