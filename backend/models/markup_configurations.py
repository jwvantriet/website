from core.database import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Markup_configurations(Base):
    __tablename__ = "markup_configurations"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    company_id = Column(Integer, nullable=True)
    model_type = Column(String, nullable=True)
    percentage_value = Column(Float, nullable=True)
    fixed_amount = Column(Float, nullable=True)
    tier_definitions = Column(String, nullable=True)
    valid_from = Column(String, nullable=True)
    valid_to = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)