from core.database import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Correction_requests(Base):
    __tablename__ = "correction_requests"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    declaration_entry_id = Column(Integer, nullable=True)
    payroll_period_id = Column(Integer, nullable=True)
    placement_id = Column(Integer, nullable=True)
    company_id = Column(Integer, nullable=True)
    declaration_type_id = Column(Integer, nullable=True)
    requested_amount = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    status = Column(String, nullable=True)
    decline_reason = Column(String, nullable=True)
    included_in_run = Column(Boolean, nullable=True)
    created_by = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    approved_at = Column(String, nullable=True)