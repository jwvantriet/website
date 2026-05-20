from core.database import Base
from sqlalchemy import Column, Integer, String


class Webhook_events(Base):
    __tablename__ = "webhook_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    event_id = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    event_type = Column(String, nullable=True)
    event_time = Column(String, nullable=True)
    changed_fields = Column(String, nullable=True)
    raw_payload = Column(String, nullable=True)
    processing_status = Column(String, nullable=True)
    processed_at = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, nullable=True)
    created_at = Column(String, nullable=True)