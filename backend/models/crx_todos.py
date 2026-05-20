from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Crx_todos(Base):
    __tablename__ = "crx_todos"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    carerix_id = Column(Integer, nullable=True)
    subject = Column(String, nullable=True)
    todo_name = Column(String, nullable=True)
    todo_title = Column(String, nullable=True)
    todo_type = Column(String, nullable=True)
    todo_type_key = Column(Integer, nullable=True)
    status = Column(Integer, nullable=True)
    status_display = Column(String, nullable=True)
    priority = Column(Integer, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    deadline = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_all_day = Column(Boolean, nullable=True)
    is_email = Column(Boolean, nullable=True)
    is_meeting = Column(Boolean, nullable=True)
    is_note = Column(Boolean, nullable=True)
    is_task = Column(Boolean, nullable=True)
    email_body = Column(String, nullable=True)
    notes_text = Column(String, nullable=True)
    from_address = Column(String, nullable=True)
    to_address = Column(String, nullable=True)
    cc_address = Column(String, nullable=True)
    employee_carerix_id = Column(Integer, nullable=True)
    vacancy_carerix_id = Column(Integer, nullable=True)
    company_carerix_id = Column(Integer, nullable=True)
    match_carerix_id = Column(Integer, nullable=True)
    job_carerix_id = Column(Integer, nullable=True)
    contact_carerix_id = Column(Integer, nullable=True)
    owner_display = Column(String, nullable=True)
    owner_carerix_id = Column(Integer, nullable=True)
    deleted = Column(Boolean, nullable=True)
    carerix_created_date = Column(String, nullable=True)
    carerix_modified_date = Column(String, nullable=True)
    raw_json = Column(String, nullable=True)