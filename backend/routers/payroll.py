"""
Payroll router — handles periods, entries, planner data, approvals, corrections, and file upload.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payroll import PayrollService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payroll", tags=["payroll"])


# ── Request/Response Models ──

class CreatePeriodRequest(BaseModel):
    month: int
    year: int
    created_by: str = ""


class UpdatePeriodStatusRequest(BaseModel):
    status: str


class ApproveEntryRequest(BaseModel):
    entry_id: int
    approver_id: str
    approver_role: str
    approver_name: str
    action: str  # "approved" or "declined"
    note: Optional[str] = None


class CreateCorrectionRequest(BaseModel):
    declaration_entry_id: Optional[int] = None
    payroll_period_id: int
    placement_id: int
    company_id: int
    declaration_type_id: int
    requested_amount: float
    reason: str
    created_by: str = ""


class ProcessCorrectionRequest(BaseModel):
    action: str  # "approved" or "declined"
    approved_by: str
    decline_reason: Optional[str] = None


class CreateEntryRequest(BaseModel):
    payroll_period_id: int
    placement_id: int
    company_id: int
    declaration_date: str
    declaration_type_id: int
    imported_amount: float
    notes: Optional[str] = None


# ── Payroll Period Endpoints ──

@router.get("/periods")
async def list_periods(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List all payroll periods."""
    service = PayrollService(db)
    return await service.get_periods(skip, limit)


@router.get("/periods/{period_id}")
async def get_period(period_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific payroll period."""
    service = PayrollService(db)
    period = await service.get_period_by_id(period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    return period


@router.post("/periods")
async def create_period(data: CreatePeriodRequest, db: AsyncSession = Depends(get_db)):
    """Create a new payroll period."""
    service = PayrollService(db)
    return await service.create_period(data.month, data.year, data.created_by)


@router.patch("/periods/{period_id}/status")
async def update_period_status(period_id: int, data: UpdatePeriodStatusRequest, db: AsyncSession = Depends(get_db)):
    """Update payroll period status."""
    service = PayrollService(db)
    result = await service.update_period_status(period_id, data.status)
    if not result:
        raise HTTPException(status_code=404, detail="Period not found")
    return result


# ── Declaration Entry Endpoints ──

@router.get("/entries")
async def list_entries(
    period_id: int,
    placement_id: Optional[int] = None,
    company_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """List declaration entries for a period."""
    service = PayrollService(db)
    return await service.get_entries_for_period(period_id, placement_id, company_id)


@router.post("/entries")
async def create_entry(data: CreateEntryRequest, db: AsyncSession = Depends(get_db)):
    """Create a single declaration entry."""
    from datetime import datetime
    from models.declaration_entries import Declaration_entries

    entry = Declaration_entries(
        payroll_period_id=data.payroll_period_id,
        placement_id=data.placement_id,
        company_id=data.company_id,
        declaration_date=data.declaration_date,
        declaration_type_id=data.declaration_type_id,
        imported_amount=data.imported_amount,
        applicable_fee=0,
        calculated_value=0,
        status="imported",
        approval_stage="pending_company_initial",
        notes=data.notes,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "status": "created"}


@router.post("/upload")
async def upload_declarations(
    period_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV file with declaration entries."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    csv_text = content.decode("utf-8")

    service = PayrollService(db)
    result = await service.import_declarations_from_csv(period_id, csv_text, file.filename)
    return result


# ── Planner Data ──

@router.get("/planner/{period_id}")
async def get_planner_data(
    period_id: int,
    placement_id: Optional[int] = None,
    company_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get monthly planner data for a period."""
    service = PayrollService(db)
    return await service.get_planner_data(period_id, placement_id, company_id)


# ── Approval Endpoints ──

@router.post("/approve")
async def approve_entry(data: ApproveEntryRequest, db: AsyncSession = Depends(get_db)):
    """Approve or decline a declaration entry."""
    service = PayrollService(db)
    result = await service.approve_entry(
        entry_id=data.entry_id,
        approver_id=data.approver_id,
        approver_role=data.approver_role,
        approver_name=data.approver_name,
        action=data.action,
        note=data.note,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/pending-approvals")
async def get_pending_approvals(
    role: str,
    company_id: Optional[int] = None,
    placement_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get entries pending approval for a role."""
    service = PayrollService(db)
    return await service.get_pending_approvals(role, company_id, placement_id)


# ── Correction Endpoints ──

@router.post("/corrections")
async def create_correction(data: CreateCorrectionRequest, db: AsyncSession = Depends(get_db)):
    """Create a correction request."""
    service = PayrollService(db)
    return await service.create_correction(data.dict())


@router.post("/corrections/{correction_id}/process")
async def process_correction(correction_id: int, data: ProcessCorrectionRequest, db: AsyncSession = Depends(get_db)):
    """Approve or decline a correction request."""
    service = PayrollService(db)
    result = await service.process_correction(correction_id, data.action, data.approved_by, data.decline_reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/corrections")
async def list_corrections(
    period_id: Optional[int] = None,
    placement_id: Optional[int] = None,
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List correction requests."""
    service = PayrollService(db)
    return await service.get_corrections(period_id, placement_id, company_id, status)


# ── Dashboard ──

@router.get("/dashboard-stats")
async def get_dashboard_stats(
    role: str,
    company_id: Optional[int] = None,
    placement_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics."""
    service = PayrollService(db)
    return await service.get_dashboard_stats(role, company_id, placement_id)


# ── Declaration Types ──

@router.get("/declaration-types")
async def list_declaration_types(db: AsyncSession = Depends(get_db)):
    """List all active declaration types."""
    from sqlalchemy import select
    from models.declaration_types import Declaration_types

    stmt = select(Declaration_types).where(Declaration_types.is_active == True).order_by(Declaration_types.sort_order)
    result = await db.execute(stmt)
    types = result.scalars().all()
    return [
        {"id": t.id, "code": t.code, "label": t.label, "unit": t.unit, "sort_order": t.sort_order}
        for t in types
    ]