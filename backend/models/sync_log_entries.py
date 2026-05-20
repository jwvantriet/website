from core.database import Base
from sqlalchemy import Column, Integer, String


class Sync_log_entries(Base):
    __tablename__ = "sync_log_entries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    entity_type = Column(String, nullable=True)
    sync_type = Column(String, nullable=True)
    started_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)
    records_fetched = Column(Integer, nullable=True)
    records_created = Column(Integer, nullable=True)
    records_updated = Column(Integer, nullable=True)
    records_deleted = Column(Integer, nullable=True)
    records_skipped_unchanged = Column(Integer, nullable=True)
    sync_status = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    filter_used = Column(String, nullable=True)
    carerix_query_time_ms = Column(Integer, nullable=True)