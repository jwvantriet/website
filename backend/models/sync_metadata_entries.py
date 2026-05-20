from core.database import Base
from sqlalchemy import Column, Integer, String, Float


class Sync_metadata_entries(Base):
    __tablename__ = "sync_metadata_entries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    entity_type = Column(String, nullable=True)
    last_sync_timestamp = Column(String, nullable=True)
    last_full_sync = Column(String, nullable=True)
    records_synced = Column(Integer, nullable=True)
    sync_status = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    total_expected = Column(Integer, nullable=True)
    current_fetched = Column(Integer, nullable=True)
    current_upserted = Column(Integer, nullable=True)
    # ETA tracking fields
    sync_started_at = Column(String, nullable=True)  # ISO timestamp when sync started
    avg_ms_per_record = Column(Float, nullable=True)  # Average milliseconds per record fetched
    estimated_seconds_remaining = Column(Integer, nullable=True)  # Estimated seconds to completion
    current_phase = Column(String, nullable=True)  # "fetching" or "upserting"