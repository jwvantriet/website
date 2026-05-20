from core.database import Base
from sqlalchemy import Column, Integer, String


class Approval_actions(Base):
    __tablename__ = "approval_actions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    approval_stage = Column(String, nullable=True)
    approver_role = Column(String, nullable=True)
    approver_id = Column(String, nullable=True)
    approver_name = Column(String, nullable=True)
    action = Column(String, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(String, nullable=True)