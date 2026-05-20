from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Invoices(Base):
    __tablename__ = "invoices"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    invoice_type = Column(String, nullable=True)
    payroll_run_id = Column(Integer, nullable=True)
    issuing_party = Column(String, nullable=True)
    receiving_party = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    markup_amount = Column(Float, nullable=True)
    markup_logic = Column(String, nullable=True)
    status = Column(String, nullable=True)
    issue_date = Column(String, nullable=True)
    created_at = Column(String, nullable=True)