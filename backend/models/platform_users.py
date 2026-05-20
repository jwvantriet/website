from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Platform_users(Base):
    __tablename__ = "platform_users"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    auth_source = Column(String, nullable=True)
    role = Column(String, nullable=True)
    carerix_id = Column(Integer, nullable=True)
    company_id = Column(Integer, nullable=True)
    placement_id = Column(Integer, nullable=True)
    email = Column(String, nullable=True)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    last_login = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)