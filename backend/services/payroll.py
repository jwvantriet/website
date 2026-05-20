"""
Payroll business logic service.
Handles payroll periods, declaration entries, approvals, corrections, and planner data.
"""

import csv
import io
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll_periods import Payroll_periods
from models.declaration_entries import Declaration_entries
from models.declaration_types import Declaration_types
from models.correction_requests import Correction_requests
from models.approval_actions import Approval_actions
from models.payroll_runs import Payroll_runs

logger = logging.getLogger(__name__)


class PayrollService:
    """Service for payroll operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Payroll Periods ──

    async def create_period(self, month: int, year: int, created_by: str) -> Dict[str, Any]:
        """Create a new payroll period."""
        import calendar
        start_date = f"{year}-{month:02d}-01"
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day:02d}"

        period = Payroll_periods(
            month=month,
            year=year,
            start_date=start_date,
            end_date=end_date,
            status="draft",
            created_by=created_by,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )
        self.db.add(period)
        await self.db.commit()
        await self.db.refresh(period)
        return self._period_to_dict(period)

    async def get_periods(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all payroll periods."""
        stmt = select(Payroll_periods).order_by(Payroll_periods.year.desc(), Payroll_periods.month.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        periods = result.scalars().all()
        return [self._period_to_dict(p) for p in periods]

    async def get_period_by_id(self, period_id: int) -> Optional[Dict[str, Any]]:
        """Get a payroll period by ID."""
        stmt = select(Payroll_periods).where(Payroll_periods.id == period_id)
        result = await self.db.execute(stmt)
        period = result.scalar_one_or_none()
        if not period:
            return None
        return self._period_to_dict(period)

    async def update_period_status(self, period_id: int, new_status: str) -> Optional[Dict[str, Any]]:
        """Update period status."""
        stmt = select(Payroll_periods).where(Payroll_periods.id == period_id)
        result = await self.db.execute(stmt)
        period = result.scalar_one_or_none()
        if not period:
            return None
        period.status = new_status
        period.updated_at = datetime.now().isoformat()
        if new_status == "finalized":
            period.finalized_at = datetime.now().isoformat()
        await self.db.commit()
        await self.db.refresh(period)
        return self._period_to_dict(period)

    def _period_to_dict(self, p: Payroll_periods) -> Dict[str, Any]:
        return {
            "id": p.id,
            "month": p.month,
            "year": p.year,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "status": p.status,
            "created_by": p.created_by,
            "finalized_at": p.finalized_at,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }

    # ── Declaration Entries ──

    async def import_declarations_from_csv(self, period_id: int, csv_content: str, source_ref: str) -> Dict[str, Any]:
        """Import declaration entries from CSV content.
        Expected CSV columns: placement_id, company_id, date, declaration_type_code, amount
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        imported = 0
        errors = []

        # Load declaration types for lookup
        stmt = select(Declaration_types).where(Declaration_types.is_active == True)
        result = await self.db.execute(stmt)
        types_list = result.scalars().all()
        type_map = {t.code: t.id for t in types_list}

        for row_num, row in enumerate(reader, start=2):
            try:
                type_code = row.get("declaration_type_code", "").strip().upper()
                type_id = type_map.get(type_code)
                if not type_id:
                    errors.append(f"Row {row_num}: Unknown declaration type '{type_code}'")
                    continue

                entry = Declaration_entries(
                    payroll_period_id=period_id,
                    placement_id=int(row.get("placement_id", 0)),
                    company_id=int(row.get("company_id", 0)),
                    declaration_date=row.get("date", "").strip(),
                    declaration_type_id=type_id,
                    imported_amount=float(row.get("amount", 0)),
                    applicable_fee=0,
                    calculated_value=0,
                    status="imported",
                    approval_stage="pending_company_initial",
                    source_file_ref=source_ref,
                    created_at=datetime.now().isoformat(),
                    updated_at=datetime.now().isoformat(),
                )
                self.db.add(entry)
                imported += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        await self.db.commit()
        return {"imported": imported, "errors": errors, "total_rows": imported + len(errors)}

    async def get_entries_for_period(self, period_id: int, placement_id: int = None, company_id: int = None) -> List[Dict[str, Any]]:
        """Get all declaration entries for a period, optionally filtered."""
        stmt = select(Declaration_entries).where(Declaration_entries.payroll_period_id == period_id)
        if placement_id:
            stmt = stmt.where(Declaration_entries.placement_id == placement_id)
        if company_id:
            stmt = stmt.where(Declaration_entries.company_id == company_id)
        stmt = stmt.order_by(Declaration_entries.declaration_date, Declaration_entries.declaration_type_id)
        result = await self.db.execute(stmt)
        entries = result.scalars().all()
        return [self._entry_to_dict(e) for e in entries]

    async def get_planner_data(self, period_id: int, placement_id: int = None, company_id: int = None) -> Dict[str, Any]:
        """Get planner data: entries + corrections organized by day and type."""
        entries = await self.get_entries_for_period(period_id, placement_id, company_id)

        # Get corrections for this period
        corr_stmt = select(Correction_requests).where(Correction_requests.payroll_period_id == period_id)
        if placement_id:
            corr_stmt = corr_stmt.where(Correction_requests.placement_id == placement_id)
        if company_id:
            corr_stmt = corr_stmt.where(Correction_requests.company_id == company_id)
        result = await self.db.execute(corr_stmt)
        corrections = result.scalars().all()

        # Build correction map: entry_id -> list of corrections
        correction_map = {}
        for c in corrections:
            key = c.declaration_entry_id
            if key not in correction_map:
                correction_map[key] = []
            correction_map[key].append(self._correction_to_dict(c))

        # Get declaration types
        types_stmt = select(Declaration_types).where(Declaration_types.is_active == True).order_by(Declaration_types.sort_order)
        result = await self.db.execute(types_stmt)
        dec_types = [{"id": t.id, "code": t.code, "label": t.label, "unit": t.unit} for t in result.scalars().all()]

        # Organize entries by date
        planner = {}
        for entry in entries:
            day = entry["declaration_date"]
            if day not in planner:
                planner[day] = {}
            type_id = str(entry["declaration_type_id"])
            planner[day][type_id] = {
                **entry,
                "corrections": correction_map.get(entry["id"], []),
            }

        # Get period info
        period = await self.get_period_by_id(period_id)

        return {
            "period": period,
            "declaration_types": dec_types,
            "planner": planner,
            "entries": entries,
        }

    def _entry_to_dict(self, e: Declaration_entries) -> Dict[str, Any]:
        return {
            "id": e.id,
            "payroll_period_id": e.payroll_period_id,
            "placement_id": e.placement_id,
            "company_id": e.company_id,
            "declaration_date": e.declaration_date,
            "declaration_type_id": e.declaration_type_id,
            "imported_amount": e.imported_amount,
            "applicable_fee": e.applicable_fee,
            "calculated_value": e.calculated_value,
            "status": e.status,
            "approval_stage": e.approval_stage,
            "source_file_ref": e.source_file_ref,
            "notes": e.notes,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
        }

    # ── Approval Workflow ──

    async def approve_entry(self, entry_id: int, approver_id: str, approver_role: str, approver_name: str, action: str, note: str = None) -> Dict[str, Any]:
        """Process an approval action on a declaration entry."""
        stmt = select(Declaration_entries).where(Declaration_entries.id == entry_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()
        if not entry:
            return {"error": "Entry not found"}

        # Determine current stage and next stage
        stage_flow = {
            "pending_company_initial": ("company_initial", "pending_placement"),
            "pending_placement": ("placement", "pending_company_final"),
            "pending_company_final": ("company_final", "approved"),
        }

        current_stage = entry.approval_stage
        if current_stage not in stage_flow:
            return {"error": f"Entry not in approvable stage: {current_stage}"}

        stage_name, next_stage = stage_flow[current_stage]

        # Record the approval action
        approval = Approval_actions(
            entity_type="declaration_entry",
            entity_id=entry_id,
            approval_stage=stage_name,
            approver_role=approver_role,
            approver_id=approver_id,
            approver_name=approver_name,
            action=action,
            note=note,
            created_at=datetime.now().isoformat(),
        )
        self.db.add(approval)

        if action == "approved":
            entry.approval_stage = next_stage
            entry.status = next_stage if next_stage != "approved" else "approved"
        elif action == "declined":
            entry.approval_stage = "declined"
            entry.status = "declined"

        entry.updated_at = datetime.now().isoformat()
        await self.db.commit()

        return {"success": True, "new_stage": entry.approval_stage, "new_status": entry.status}

    async def get_pending_approvals(self, role: str, company_id: int = None, placement_id: int = None) -> List[Dict[str, Any]]:
        """Get entries pending approval for a specific role."""
        stage_map = {
            "company": ["pending_company_initial", "pending_company_final"],
            "placement": ["pending_placement"],
            "agency_admin": [],  # Agency sees all
            "agency_ops": [],
        }

        stages = stage_map.get(role, [])
        stmt = select(Declaration_entries)

        if stages:
            stmt = stmt.where(Declaration_entries.approval_stage.in_(stages))

        if company_id:
            stmt = stmt.where(Declaration_entries.company_id == company_id)
        if placement_id:
            stmt = stmt.where(Declaration_entries.placement_id == placement_id)

        stmt = stmt.order_by(Declaration_entries.declaration_date)
        result = await self.db.execute(stmt)
        entries = result.scalars().all()
        return [self._entry_to_dict(e) for e in entries]

    # ── Correction Requests ──

    async def create_correction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a correction request."""
        correction = Correction_requests(
            declaration_entry_id=data.get("declaration_entry_id"),
            payroll_period_id=data.get("payroll_period_id"),
            placement_id=data.get("placement_id"),
            company_id=data.get("company_id"),
            declaration_type_id=data.get("declaration_type_id"),
            requested_amount=data.get("requested_amount", 0),
            reason=data.get("reason", ""),
            status="requested",
            included_in_run=False,
            created_by=data.get("created_by", ""),
            created_at=datetime.now().isoformat(),
        )
        self.db.add(correction)
        await self.db.commit()
        await self.db.refresh(correction)
        return self._correction_to_dict(correction)

    async def process_correction(self, correction_id: int, action: str, approved_by: str, decline_reason: str = None) -> Dict[str, Any]:
        """Approve or decline a correction request."""
        stmt = select(Correction_requests).where(Correction_requests.id == correction_id)
        result = await self.db.execute(stmt)
        correction = result.scalar_one_or_none()
        if not correction:
            return {"error": "Correction not found"}

        if action == "approved":
            correction.status = "approved"
            correction.included_in_run = True
        elif action == "declined":
            if not decline_reason:
                return {"error": "Decline reason is mandatory"}
            correction.status = "declined"
            correction.decline_reason = decline_reason

        correction.approved_by = approved_by
        correction.approved_at = datetime.now().isoformat()

        # Record approval action
        approval = Approval_actions(
            entity_type="correction_request",
            entity_id=correction_id,
            approval_stage="correction_review",
            approver_role="company",
            approver_id=approved_by,
            approver_name=approved_by,
            action=action,
            note=decline_reason,
            created_at=datetime.now().isoformat(),
        )
        self.db.add(approval)
        await self.db.commit()

        return {"success": True, "status": correction.status}

    async def get_corrections(self, period_id: int = None, placement_id: int = None, company_id: int = None, status_filter: str = None) -> List[Dict[str, Any]]:
        """Get correction requests with optional filters."""
        stmt = select(Correction_requests)
        if period_id:
            stmt = stmt.where(Correction_requests.payroll_period_id == period_id)
        if placement_id:
            stmt = stmt.where(Correction_requests.placement_id == placement_id)
        if company_id:
            stmt = stmt.where(Correction_requests.company_id == company_id)
        if status_filter:
            stmt = stmt.where(Correction_requests.status == status_filter)
        stmt = stmt.order_by(Correction_requests.created_at.desc())
        result = await self.db.execute(stmt)
        corrections = result.scalars().all()
        return [self._correction_to_dict(c) for c in corrections]

    def _correction_to_dict(self, c: Correction_requests) -> Dict[str, Any]:
        return {
            "id": c.id,
            "declaration_entry_id": c.declaration_entry_id,
            "payroll_period_id": c.payroll_period_id,
            "placement_id": c.placement_id,
            "company_id": c.company_id,
            "declaration_type_id": c.declaration_type_id,
            "requested_amount": c.requested_amount,
            "reason": c.reason,
            "status": c.status,
            "decline_reason": c.decline_reason,
            "included_in_run": c.included_in_run,
            "created_by": c.created_by,
            "approved_by": c.approved_by,
            "created_at": c.created_at,
            "approved_at": c.approved_at,
        }

    # ── Dashboard Stats ──

    async def get_dashboard_stats(self, role: str, company_id: int = None, placement_id: int = None) -> Dict[str, Any]:
        """Get dashboard statistics based on role."""
        stats = {}

        # Count periods
        period_stmt = select(func.count(Payroll_periods.id))
        result = await self.db.execute(period_stmt)
        stats["total_periods"] = result.scalar() or 0

        # Count entries by status
        entry_base = select(func.count(Declaration_entries.id))
        if company_id:
            entry_base = entry_base.where(Declaration_entries.company_id == company_id)
        if placement_id:
            entry_base = entry_base.where(Declaration_entries.placement_id == placement_id)

        result = await self.db.execute(entry_base)
        stats["total_entries"] = result.scalar() or 0

        # Pending approvals
        pending_stages = []
        if role in ("company", "agency_admin", "agency_ops"):
            pending_stages = ["pending_company_initial", "pending_company_final"]
        elif role == "placement":
            pending_stages = ["pending_placement"]

        if pending_stages:
            pending_stmt = entry_base.where(Declaration_entries.approval_stage.in_(pending_stages))
            result = await self.db.execute(pending_stmt)
            stats["pending_approvals"] = result.scalar() or 0
        else:
            stats["pending_approvals"] = 0

        # Corrections
        corr_base = select(func.count(Correction_requests.id))
        if company_id:
            corr_base = corr_base.where(Correction_requests.company_id == company_id)
        if placement_id:
            corr_base = corr_base.where(Correction_requests.placement_id == placement_id)

        result = await self.db.execute(corr_base)
        stats["total_corrections"] = result.scalar() or 0

        pending_corr = corr_base.where(Correction_requests.status == "requested")
        result = await self.db.execute(pending_corr)
        stats["pending_corrections"] = result.scalar() or 0

        return stats