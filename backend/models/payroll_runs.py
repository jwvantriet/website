from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Payroll_runs(Base):
    __tablename__ = "payroll_runs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    payroll_period_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    entry_count = Column(Integer, nullable=True)
    correction_count = Column(Integer, nullable=True)
    total_amount = Column(Float, nullable=True)
    finalized_by = Column(String, nullable=True)
    finalized_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)