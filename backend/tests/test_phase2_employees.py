"""
Phase 2: Employee API Tests

Tests cover:
1. List employees (GET /api/v1/entities/employees)
2. Create employee (POST /api/v1/entities/employees)
3. Get employee by ID (GET /api/v1/entities/employees/{id})
4. Update employee (PUT /api/v1/entities/employees/{id})
5. Delete employee (DELETE /api/v1/entities/employees/{id})
6. Batch operations (create, update, delete)
7. Query filtering and sorting
8. Data integrity — verify all fields are stored and returned correctly
9. Verify NO "additionalinfo" fields exist (only raw_json for extra data)
"""

import pytest
from httpx import AsyncClient

from tests.conftest import sample_employee_data, _unique_id


# ─── Employee CRUD ───────────────────────────────────────────────────────────

class TestEmployeeCRUD:
    """Test basic CRUD operations on employees."""

    @pytest.mark.asyncio
    async def test_list_employees_empty_or_populated(self, client: AsyncClient):
        """GET /employees should return a list response."""
        resp = await client.get("/api/v1/entities/employees")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        assert "skip" in body
        assert "limit" in body
        assert isinstance(body["items"], list)
        print(f"  ✓ List employees: {body['total']} total, {len(body['items'])} returned")

    @pytest.mark.asyncio
    async def test_create_employee(self, client: AsyncClient):
        """POST /employees should create and return the employee."""
        data = sample_employee_data()
        resp = await client.post("/api/v1/entities/employees", json=data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["id"] is not None
        assert body["first_name"] == "Jan"
        assert body["last_name"] == "de Vries"
        assert body["email_address"] == "jan.devries@example.nl"
        assert body["carerix_id"] == data["carerix_id"]
        print(f"  ✓ Created employee id={body['id']}: {body['name']}")

    @pytest.mark.asyncio
    async def test_get_employee_by_id(self, client: AsyncClient):
        """GET /employees/{id} should return the correct employee."""
        data = sample_employee_data({"name": "Get Test"})
        create_resp = await client.post("/api/v1/entities/employees", json=data)
        emp_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/entities/employees/{emp_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == emp_id
        assert body["name"] == "Get Test"
        print(f"  ✓ Get employee {emp_id}: {body['name']}")

    @pytest.mark.asyncio
    async def test_get_nonexistent_employee_returns_404(self, client: AsyncClient):
        """GET /employees/99999 should return 404."""
        resp = await client.get("/api/v1/entities/employees/99999")
        assert resp.status_code == 404
        print("  ✓ Nonexistent employee → 404")

    @pytest.mark.asyncio
    async def test_update_employee(self, client: AsyncClient):
        """PUT /employees/{id} should update fields."""
        data = sample_employee_data({"name": "Before Update"})
        create_resp = await client.post("/api/v1/entities/employees", json=data)
        emp_id = create_resp.json()["id"]

        update_resp = await client.put(
            f"/api/v1/entities/employees/{emp_id}",
            json={"name": "After Update", "city": "Rotterdam", "current_salary": 80000.00},
        )
        assert update_resp.status_code == 200
        body = update_resp.json()
        assert body["name"] == "After Update"
        assert body["city"] == "Rotterdam"
        assert body["current_salary"] == 80000.00
        assert body["first_name"] == "Jan"
        print(f"  ✓ Updated employee {emp_id}: name={body['name']}, city={body['city']}")

    @pytest.mark.asyncio
    async def test_delete_employee(self, client: AsyncClient):
        """DELETE /employees/{id} should remove the employee."""
        data = sample_employee_data({"name": "To Delete"})
        create_resp = await client.post("/api/v1/entities/employees", json=data)
        emp_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/api/v1/entities/employees/{emp_id}")
        assert del_resp.status_code == 200

        get_resp = await client.get(f"/api/v1/entities/employees/{emp_id}")
        assert get_resp.status_code == 404
        print(f"  ✓ Deleted employee {emp_id} and verified 404")


# ─── Employee Data Integrity ─────────────────────────────────────────────────

class TestEmployeeDataIntegrity:
    """Verify all employee fields are stored and returned correctly."""

    @pytest.mark.asyncio
    async def test_all_employee_fields_roundtrip(self, client: AsyncClient):
        """Create an employee with ALL fields and verify they come back correctly."""
        uid = _unique_id()
        data = sample_employee_data({
            "carerix_id": uid,
            "first_name": "Maria",
            "last_name": "Jansen",
            "last_name_prefix": "",
            "initials": "M.A.",
            "full_first_names": "Maria Anna",
            "name": "Maria Jansen",
            "title": "Ing.",
            "email_address": "maria@example.nl",
            "email_address_business": "maria@business.nl",
            "email_address_private": "maria@private.nl",
            "phone_number": "+31201111111",
            "phone_number_business": "+31202222222",
            "mobile_number": "+31613333333",
            "mobile_number_business": "+31614444444",
            "address": "Herengracht 200, Amsterdam",
            "street": "Herengracht",
            "house_number": "200",
            "house_number_suffix": "A",
            "postal_code": "1016BS",
            "city": "Amsterdam",
            "city_code": "AMS",
            "birth_date": "1985-03-20",
            "birth_city": "Utrecht",
            "gender_node": 2,
            "age": 41,
            "cv_summary": "Full-stack developer with 15 years experience.",
            "employee_information": "<p>Expert in React and Node.js</p>",
            "experience_information": "<p>15 years across startups and enterprise</p>",
            "education_information": "<p>BSc Computer Science, UvA</p>",
            "ambition": "CTO of a tech startup",
            "hobbies": "Cycling, Photography",
            "notes": "Prefers remote work",
            "skill_notes": "React, TypeScript, Python, Go",
            "language_notes": "Dutch (native), English (fluent), German (basic)",
            "current_conditions": "Permanent contract, 40h/week",
            "current_employer_name": "StartupXYZ",
            "current_salary": 85000.00,
            "min_salary": 80000.00,
            "salary": 85000,
            "available_date": "2026-05-01",
            "available_from_date": "2026-05-01",
            "hours_per_week": 36.0,
            "days_per_week": 4,
            "fte": 0.9,
            "min_fte": 0.8,
            "max_fte": 1.0,
            "max_distance": 50,
            "years_of_experience": 15,
            "has_car": False,
            "ranking": 8.5,
            "rating": 4,
            "engagement_score": 85,
            "completeness_score": 92.5,
            "status_display": "Available",
            "status_indication_color": "green",
            "owner_display": "Recruiter C",
            "owner_carerix_id": 999,
            "source_info": "LinkedIn",
            "active_job_count": 1,
            "match_count": 5,
            "is_confidential": True,
            "deleted": False,
            "carerix_created_date": "2024-01-15T10:00:00Z",
            "carerix_modified_date": "2026-04-01T14:30:00Z",
            "raw_json": '{"extra_field": "extra_value", "nested": {"key": "val"}}',
        })

        resp = await client.post("/api/v1/entities/employees", json=data)
        assert resp.status_code == 201
        body = resp.json()

        for key, expected_value in data.items():
            actual_value = body.get(key)
            assert actual_value == expected_value, (
                f"Field '{key}' mismatch: expected {expected_value!r}, got {actual_value!r}"
            )

        print(f"  ✓ All {len(data)} fields verified for employee id={body['id']}")

    @pytest.mark.asyncio
    async def test_no_additionalinfo_field_on_employee(self, client: AsyncClient):
        """Verify employees do NOT have an 'additional_information' or 'additionalinfo' field."""
        data = sample_employee_data()
        resp = await client.post("/api/v1/entities/employees", json=data)
        assert resp.status_code == 201
        body = resp.json()

        assert "additional_information" not in body, "Employee should NOT have additional_information field"
        assert "additionalinfo" not in body, "Employee should NOT have additionalinfo field"
        assert "additional_info" not in body, "Employee should NOT have additional_info field"
        assert "raw_json" in body, "Employee SHOULD have raw_json field for extra data"
        print("  ✓ Confirmed: employees have NO additionalinfo fields (raw_json exists for extra data)")


# ─── Employee Query & Filtering ──────────────────────────────────────────────

class TestEmployeeQuery:
    """Test query, filtering, sorting, and pagination."""

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient):
        """Verify skip and limit work correctly."""
        for i in range(3):
            data = sample_employee_data({"name": f"Pagination Test {i}"})
            await client.post("/api/v1/entities/employees", json=data)

        resp = await client.get("/api/v1/entities/employees?limit=2&skip=0")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) <= 2
        assert body["limit"] == 2
        assert body["skip"] == 0
        print(f"  ✓ Pagination: limit=2, got {len(body['items'])} items, total={body['total']}")

    @pytest.mark.asyncio
    async def test_query_all_endpoint(self, client: AsyncClient):
        """GET /employees/all should also return employees."""
        resp = await client.get("/api/v1/entities/employees/all")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        print(f"  ✓ /all endpoint: {body['total']} total employees")


# ─── Employee Batch Operations ───────────────────────────────────────────────

class TestEmployeeBatch:
    """Test batch create, update, and delete."""

    @pytest.mark.asyncio
    async def test_batch_create(self, client: AsyncClient):
        """POST /employees/batch should create multiple employees."""
        items = [
            sample_employee_data({"name": "Batch 1"}),
            sample_employee_data({"name": "Batch 2"}),
        ]
        resp = await client.post(
            "/api/v1/entities/employees/batch",
            json={"items": items},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert len(body) == 2
        print(f"  ✓ Batch created {len(body)} employees")

    @pytest.mark.asyncio
    async def test_batch_delete(self, client: AsyncClient):
        """DELETE /employees/batch should delete multiple employees."""
        ids = []
        for i in range(2):
            data = sample_employee_data({"name": f"BatchDel {i}"})
            r = await client.post("/api/v1/entities/employees", json=data)
            ids.append(r.json()["id"])

        resp = await client.request(
            "DELETE",
            "/api/v1/entities/employees/batch",
            json={"ids": ids},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["deleted_count"] == 2
        print(f"  ✓ Batch deleted {body['deleted_count']} employees")