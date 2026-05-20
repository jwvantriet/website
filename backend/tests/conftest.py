"""
Shared test fixtures for the Confair Platform API test suite.

Provides:
- Async test client via httpx + FastAPI TestClient
- Database session management for test isolation
- Helper functions for authentication tokens
- Sample data factories with unique IDs (idempotent across runs)
"""

import asyncio
import os
import random
import sys
import time
from datetime import datetime, timedelta
from typing import AsyncGenerator, Dict, Any

import pytest
import pytest_asyncio
import jwt
from httpx import AsyncClient, ASGITransport

# Ensure the backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# ─── Constants ───────────────────────────────────────────────────────────────

JWT_SECRET = "confair_platform_jwt_secret_2026"
JWT_ALGORITHM = "HS256"


def _unique_id() -> int:
    """Generate a unique carerix_id using timestamp + random to avoid collisions."""
    return int(time.time() * 1000) % 2_000_000_000 + random.randint(1, 99999)


# ─── Event Loop ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ─── Async HTTP Client ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client bound to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


# ─── Token Helpers ───────────────────────────────────────────────────────────

def create_test_token(
    user_id: int = 1,
    email: str = "test@confair.nl",
    name: str = "Test User",
    role: str = "agency_admin",
    auth_source: str = "local",
    expired: bool = False,
) -> str:
    """Create a platform JWT token for testing."""
    if expired:
        exp = datetime.utcnow() - timedelta(hours=1)
    else:
        exp = datetime.utcnow() + timedelta(hours=24)

    payload = {
        "sub": str(user_id),
        "email": email,
        "name": name,
        "role": role,
        "auth_source": auth_source,
        "exp": exp,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ─── Sample Data Factories ───────────────────────────────────────────────────

def sample_employee_data(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate sample employee data with a unique carerix_id."""
    data = {
        "carerix_id": _unique_id(),
        "first_name": "Jan",
        "last_name": "de Vries",
        "last_name_prefix": "de",
        "initials": "J.",
        "name": "Jan de Vries",
        "email_address": "jan.devries@example.nl",
        "phone_number": "+31612345678",
        "mobile_number": "+31687654321",
        "city": "Amsterdam",
        "postal_code": "1012AB",
        "street": "Keizersgracht",
        "house_number": "100",
        "birth_date": "1990-05-15",
        "age": 35,
        "cv_summary": "Experienced software developer with 10 years in Java and Python.",
        "employee_information": "<p>Senior developer specializing in backend systems.</p>",
        "experience_information": "<p>10 years at various tech companies.</p>",
        "education_information": "<p>MSc Computer Science, TU Delft</p>",
        "current_employer_name": "TechCorp BV",
        "current_salary": 75000.00,
        "min_salary": 70000.00,
        "hours_per_week": 40.0,
        "days_per_week": 5,
        "fte": 1.0,
        "years_of_experience": 10,
        "has_car": True,
        "status_display": "Available",
        "status_indication_color": "green",
        "owner_display": "Recruiter A",
        "active_job_count": 0,
        "match_count": 3,
        "is_confidential": False,
        "deleted": False,
    }
    if overrides:
        data.update(overrides)
    # Always ensure carerix_id is unique if not explicitly overridden
    if overrides and "carerix_id" not in overrides:
        data["carerix_id"] = _unique_id()
    return data


def sample_job_data(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate sample job/placement data with a unique carerix_id."""
    data = {
        "carerix_id": _unique_id(),
        "name": "Senior Developer Placement",
        "employee_carerix_id": 10001,
        "vacancy_carerix_id": 30001,
        "company_carerix_id": 40001,
        "start_date": "2026-04-01",
        "end_date": "2026-09-30",
        "hours_per_week": 40.0,
        "days_per_week": 5,
        "cost_price": 55.00,
        "selling_price": 85.00,
        "hourly_tariff_invoice": 85.00,
        "hourly_wage_gross": 45.00,
        "margin_amount": 30.00,
        "margin_percentage": 35.29,
        "margin_ok": True,
        "job_information": "Backend development role at client site.",
        "status": 1,
        "status_display": "Active",
        "status_indication_color": "green",
        "owner_display": "Account Manager B",
        "is_template": False,
        "deleted": False,
    }
    if overrides:
        data.update(overrides)
    if overrides and "carerix_id" not in overrides:
        data["carerix_id"] = _unique_id()
    return data


def sample_vacancy_data(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate sample vacancy data with a unique carerix_id."""
    data = {
        "carerix_id": _unique_id(),
        "vacancy_no": f"VAC-2026-{random.randint(1000, 9999)}",
        "job_title": "Senior Python Developer",
        "vacancy_information": "<p>We are looking for an experienced Python developer.</p>",
        "requirements": "<p>5+ years Python, FastAPI, PostgreSQL</p>",
        "additional_information": "<p>Remote work possible 2 days/week.</p>",
        "company_name": "ClientCorp BV",
        "company_carerix_id": 40001,
        "work_city": "Rotterdam",
        "work_postal_code": "3011AA",
        "hours_per_week": 40.0,
        "fte": 1.0,
        "min_salary": 65000.00,
        "max_salary": 90000.00,
        "number_of_vacancies": 2,
        "status_display": "Open",
        "status_indication_color": "green",
        "owner_display": "Recruiter A",
        "deleted": False,
    }
    if overrides:
        data.update(overrides)
    if overrides and "carerix_id" not in overrides:
        data["carerix_id"] = _unique_id()
    return data


def sample_company_data(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate sample company data with a unique carerix_id."""
    data = {
        "carerix_id": _unique_id(),
        "name": "ClientCorp BV",
        "short_name": "ClientCorp",
        "email_address": "info@clientcorp.nl",
        "phone_number": "+31201234567",
        "url": "https://clientcorp.nl",
        "visit_city": "Rotterdam",
        "visit_postal_code": "3011AA",
        "status_display": "Active",
        "status_indication_color": "green",
        "owner_display": "Account Manager B",
        "deleted": False,
    }
    if overrides:
        data.update(overrides)
    if overrides and "carerix_id" not in overrides:
        data["carerix_id"] = _unique_id()
    return data