from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Contact_submissions(Base):
    __tablename__ = "contact_submissions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    company = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    inquiry_type = Column(String, nullable=False)
    field_of_expertise = Column(String, nullable=True)
    message = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=True)