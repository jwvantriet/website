from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Declaration_types(Base):
    __tablename__ = "declaration_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    code = Column(String, nullable=True)
    label = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    finance_mapping = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    sort_order = Column(Integer, nullable=True)
    created_at = Column(String, nullable=True)