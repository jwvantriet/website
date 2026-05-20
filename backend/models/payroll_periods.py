from core.database import Base
from sqlalchemy import Column, Integer, String


class Payroll_periods(Base):
    __tablename__ = "payroll_periods"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    finalized_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)