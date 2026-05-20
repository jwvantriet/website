from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Declaration_entries(Base):
    __tablename__ = "declaration_entries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    payroll_period_id = Column(Integer, nullable=True)
    placement_id = Column(Integer, nullable=True)
    company_id = Column(Integer, nullable=True)
    declaration_date = Column(String, nullable=True)
    declaration_type_id = Column(Integer, nullable=True)
    imported_amount = Column(Float, nullable=True)
    applicable_fee = Column(Float, nullable=True)
    calculated_value = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    approval_stage = Column(String, nullable=True)
    source_file_ref = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)