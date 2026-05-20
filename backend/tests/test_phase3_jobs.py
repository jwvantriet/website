"""
Phase 3: Job (Placement) API Tests

Tests cover:
1. List jobs (GET /api/v1/entities/crx_jobs)
2. Create job (POST /api/v1/entities/crx_jobs)
3. Get job by ID (GET /api/v1/entities/crx_jobs/{id})
4. Update job (PUT /api/v1/entities/crx_jobs/{id})
5. Delete job (DELETE /api/v1/entities/crx_jobs/{id})
6. Data integrity — verify all fields stored and returned
7. Verify NO "additionalinfo" fields on jobs
8. Relationship fields (employee_carerix_id, vacancy_carerix_id, company_carerix_id)
"""

import pytest
from httpx import AsyncClient

from tests.conftest import sample_job_data, sample_employee_data, _unique_id


# ─── Job CRUD ────────────────────────────────────────────────────────────────

class TestJobCRUD:
    """Test basic CRUD operations on crx_jobs."""

    @pytest.mark.asyncio
    async def test_list_jobs(self, client: AsyncClient):
        """GET /crx_jobs should return a list response."""
        resp = await client.get("/api/v1/entities/crx_jobs")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        print(f"  ✓ List jobs: {body['total']} total")

    @pytest.mark.asyncio
    async def test_create_job(self, client: AsyncClient):
        """POST /crx_jobs should create and return the job."""
        data = sample_job_data()
        resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["id"] is not None
        assert body["name"] == "Senior Developer Placement"
        assert body["carerix_id"] == data["carerix_id"]
        print(f"  ✓ Created job id={body['id']}: {body['name']}")

    @pytest.mark.asyncio
    async def test_get_job_by_id(self, client: AsyncClient):
        """GET /crx_jobs/{id} should return the correct job."""
        data = sample_job_data({"name": "Get Test Job"})
        create_resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        job_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/entities/crx_jobs/{job_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == job_id
        assert body["name"] == "Get Test Job"
        print(f"  ✓ Get job {job_id}: {body['name']}")

    @pytest.mark.asyncio
    async def test_get_nonexistent_job_returns_404(self, client: AsyncClient):
        """GET /crx_jobs/99999 should return 404."""
        resp = await client.get("/api/v1/entities/crx_jobs/99999")
        assert resp.status_code == 404
        print("  ✓ Nonexistent job → 404")

    @pytest.mark.asyncio
    async def test_update_job(self, client: AsyncClient):
        """PUT /crx_jobs/{id} should update fields."""
        data = sample_job_data({"name": "Before Update"})
        create_resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        job_id = create_resp.json()["id"]

        update_resp = await client.put(
            f"/api/v1/entities/crx_jobs/{job_id}",
            json={
                "name": "After Update",
                "selling_price": 95.00,
                "margin_percentage": 42.11,
                "status_display": "Extended",
            },
        )
        assert update_resp.status_code == 200
        body = update_resp.json()
        assert body["name"] == "After Update"
        assert body["selling_price"] == 95.00
        assert body["margin_percentage"] == 42.11
        assert body["status_display"] == "Extended"
        print(f"  ✓ Updated job {job_id}: name={body['name']}, selling_price={body['selling_price']}")

    @pytest.mark.asyncio
    async def test_delete_job(self, client: AsyncClient):
        """DELETE /crx_jobs/{id} should remove the job."""
        data = sample_job_data({"name": "To Delete"})
        create_resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        job_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/api/v1/entities/crx_jobs/{job_id}")
        assert del_resp.status_code == 200

        get_resp = await client.get(f"/api/v1/entities/crx_jobs/{job_id}")
        assert get_resp.status_code == 404
        print(f"  ✓ Deleted job {job_id} and verified 404")


# ─── Job Data Integrity ──────────────────────────────────────────────────────

class TestJobDataIntegrity:
    """Verify all job fields are stored and returned correctly."""

    @pytest.mark.asyncio
    async def test_all_job_fields_roundtrip(self, client: AsyncClient):
        """Create a job with ALL fields and verify they come back correctly."""
        uid = _unique_id()
        data = sample_job_data({
            "carerix_id": uid,
            "name": "Full Field Test Job",
            "employee_carerix_id": 10001,
            "vacancy_carerix_id": 30001,
            "company_carerix_id": 40001,
            "match_carerix_id": 50001,
            "start_date": "2026-04-01",
            "end_date": "2026-12-31",
            "hours_per_week": 36.0,
            "days_per_week": 4,
            "cost_price": 50.00,
            "selling_price": 80.00,
            "purchase_rate": 48.00,
            "hourly_tariff_invoice": 80.00,
            "hourly_wage_gross": 42.00,
            "margin_amount": 30.00,
            "margin_percentage": 37.50,
            "margin_ok": True,
            "sales_factor": 1.67,
            "salary": 72000,
            "customer_reference": "CR-2026-001",
            "external_identifier": "EXT-001",
            "job_information": "<p>Full-stack development at client site.</p>",
            "memo_general": "Standard placement terms apply.",
            "memo_declaration": "Weekly declarations required.",
            "invoice_subject": "Development services Q2 2026",
            "phone_number": "+31201234567",
            "status": 1,
            "status_display": "Active",
            "status_indication_color": "green",
            "owner_display": "Account Manager B",
            "is_template": False,
            "deleted": False,
            "carerix_created_date": "2026-03-15T09:00:00Z",
            "carerix_modified_date": "2026-04-01T12:00:00Z",
            "raw_json": '{"placement_type": "temporary", "contract_type": "phase_a"}',
        })

        resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        assert resp.status_code == 201
        body = resp.json()

        for key, expected_value in data.items():
            actual_value = body.get(key)
            assert actual_value == expected_value, (
                f"Field '{key}' mismatch: expected {expected_value!r}, got {actual_value!r}"
            )

        print(f"  ✓ All {len(data)} fields verified for job id={body['id']}")

    @pytest.mark.asyncio
    async def test_no_additionalinfo_field_on_job(self, client: AsyncClient):
        """Verify jobs do NOT have an 'additional_information' or 'additionalinfo' field."""
        data = sample_job_data()
        resp = await client.post("/api/v1/entities/crx_jobs", json=data)
        assert resp.status_code == 201
        body = resp.json()

        assert "additional_information" not in body, "Job should NOT have additional_information field"
        assert "additionalinfo" not in body, "Job should NOT have additionalinfo field"
        assert "additional_info" not in body, "Job should NOT have additional_info field"
        assert "raw_json" in body, "Job SHOULD have raw_json field for extra data"
        print("  ✓ Confirmed: jobs have NO additionalinfo fields (raw_json exists for extra data)")


# ─── Job Relationship Fields ─────────────────────────────────────────────────

class TestJobRelationships:
    """Verify FK reference fields on jobs."""

    @pytest.mark.asyncio
    async def test_job_references_employee(self, client: AsyncClient):
        """Job should store employee_carerix_id correctly."""
        emp_crx_id = _unique_id()
        emp_data = sample_employee_data({"carerix_id": emp_crx_id, "name": "Ref Employee"})
        await client.post("/api/v1/entities/employees", json=emp_data)

        job_data = sample_job_data({
            "employee_carerix_id": emp_crx_id,
            "name": "Job for Ref Employee",
        })
        resp = await client.post("/api/v1/entities/crx_jobs", json=job_data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["employee_carerix_id"] == emp_crx_id
        print(f"  ✓ Job {body['id']} references employee carerix_id={emp_crx_id}")

    @pytest.mark.asyncio
    async def test_job_references_vacancy_and_company(self, client: AsyncClient):
        """Job should store vacancy and company references."""
        vac_id = _unique_id()
        comp_id = _unique_id()
        match_id = _unique_id()
        job_data = sample_job_data({
            "vacancy_carerix_id": vac_id,
            "company_carerix_id": comp_id,
            "match_carerix_id": match_id,
        })
        resp = await client.post("/api/v1/entities/crx_jobs", json=job_data)
        assert resp.status_code == 201
        body = resp.json()
        assert body["vacancy_carerix_id"] == vac_id
        assert body["company_carerix_id"] == comp_id
        assert body["match_carerix_id"] == match_id
        print(f"  ✓ Job {body['id']} references: vacancy={vac_id}, company={comp_id}, match={match_id}")


# ─── Job Batch Operations ────────────────────────────────────────────────────

class TestJobBatch:
    """Test batch operations on jobs."""

    @pytest.mark.asyncio
    async def test_batch_create_jobs(self, client: AsyncClient):
        """POST /crx_jobs/batch should create multiple jobs."""
        items = [
            sample_job_data({"name": "Batch Job 1"}),
            sample_job_data({"name": "Batch Job 2"}),
            sample_job_data({"name": "Batch Job 3"}),
        ]
        resp = await client.post(
            "/api/v1/entities/crx_jobs/batch",
            json={"items": items},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert len(body) == 3
        names = [j["name"] for j in body]
        assert "Batch Job 1" in names
        assert "Batch Job 2" in names
        assert "Batch Job 3" in names
        print(f"  ✓ Batch created {len(body)} jobs: {names}")

    @pytest.mark.asyncio
    async def test_batch_delete_jobs(self, client: AsyncClient):
        """DELETE /crx_jobs/batch should delete multiple jobs."""
        ids = []
        for i in range(2):
            data = sample_job_data({"name": f"BatchDel Job {i}"})
            r = await client.post("/api/v1/entities/crx_jobs", json=data)
            ids.append(r.json()["id"])

        resp = await client.request(
            "DELETE",
            "/api/v1/entities/crx_jobs/batch",
            json={"ids": ids},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["deleted_count"] == 2
        print(f"  ✓ Batch deleted {body['deleted_count']} jobs")


# ─── Job Query & Filtering ───────────────────────────────────────────────────

class TestJobQuery:
    """Test query and pagination on jobs."""

    @pytest.mark.asyncio
    async def test_job_pagination(self, client: AsyncClient):
        """Verify skip and limit work on jobs."""
        resp = await client.get("/api/v1/entities/crx_jobs?limit=5&skip=0")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) <= 5
        assert body["limit"] == 5
        print(f"  ✓ Job pagination: limit=5, got {len(body['items'])} items")

    @pytest.mark.asyncio
    async def test_job_all_endpoint(self, client: AsyncClient):
        """GET /crx_jobs/all should return jobs."""
        resp = await client.get("/api/v1/entities/crx_jobs/all")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        print(f"  ✓ /all endpoint: {body['total']} total jobs")