"""
Candidate Self-Service Write Router.

Allows candidates to update their own profile data in Carerix
via a whitelisted set of fields. The flow:

1. Validate input (only whitelisted fields allowed)
2. Write to Carerix via GraphQL mutation
3. Register outbound write for echo suppression
4. Update local store on success
5. Return updated record

Authentication required.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.carerix_auth import _get_access_token, CARERIX_GRAPHQL_URL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])

# Whitelisted fields that candidates can update
ALLOWED_FIELDS = {
    "firstName",
    "lastName",
    "emailAddress",
    "phoneNumber",
    "mobileNumber",
    "city",
    "postalCode",
    "employeeInformation",
}


class CandidateUpdateRequest(BaseModel):
    """Request body for candidate profile update."""
    carerix_employee_id: int
    fields: Dict[str, Any]


class CandidateUpdateResponse(BaseModel):
    """Response for candidate profile update."""
    success: bool
    carerix_employee_id: int
    updated_fields: list[str]
    message: str


@router.post("/update", response_model=CandidateUpdateResponse)
async def update_candidate_profile(
    request: CandidateUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a candidate's profile in Carerix.

    Only whitelisted fields are allowed. The update is written to Carerix
    via GraphQL mutation, and the local database is updated on success.
    """
    # Validate fields — only allow whitelisted fields
    invalid_fields = set(request.fields.keys()) - ALLOWED_FIELDS
    if invalid_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Fields not allowed for update: {', '.join(sorted(invalid_fields))}. "
                   f"Allowed fields: {', '.join(sorted(ALLOWED_FIELDS))}",
        )

    if not request.fields:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # Get Carerix access token
    token = await _get_access_token()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to Carerix API. Please try again later.",
        )

    # Build GraphQL mutation
    employee_id = request.carerix_employee_id
    fields_to_update = request.fields

    # Build the mutation input
    field_assignments = []
    for field_name, field_value in fields_to_update.items():
        if isinstance(field_value, str):
            escaped_value = field_value.replace('"', '\\"')
            field_assignments.append(f'{field_name}: "{escaped_value}"')
        elif isinstance(field_value, (int, float)):
            field_assignments.append(f'{field_name}: {field_value}')
        elif isinstance(field_value, bool):
            field_assignments.append(f'{field_name}: {"true" if field_value else "false"}')
        elif field_value is None:
            field_assignments.append(f'{field_name}: null')

    fields_str = ", ".join(field_assignments)

    mutation = f"""
    mutation {{
      updateCREmployee(
        id: {employee_id},
        input: {{ {fields_str} }}
      ) {{
        employeeID
        firstName
        lastName
        emailAddress
        phoneNumber
        mobileNumber
        city
        postalCode
      }}
    }}
    """

    try:
        timeout = httpx.Timeout(connect=15.0, read=30.0, write=15.0, pool=15.0)
        async with httpx.AsyncClient(timeout=timeout) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json={"query": mutation},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code >= 400:
                body_text = response.text[:500]
                logger.error(
                    "Carerix mutation failed (HTTP %d): %s",
                    response.status_code, body_text,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Carerix API returned HTTP {response.status_code}",
                )

            result = response.json()

            if "errors" in result:
                error_msg = json.dumps(result["errors"][:2], default=str)
                logger.error("Carerix mutation GraphQL errors: %s", error_msg)
                raise HTTPException(
                    status_code=502,
                    detail=f"Carerix API error: {error_msg[:300]}",
                )

        # Register outbound write for echo suppression
        from services.webhook_processor import register_outbound_write
        register_outbound_write("employees", str(employee_id))

        # Update local database
        try:
            from models.employees import Employees
            from services.carerix_sync import FIELD_MAPPERS

            # Map Carerix field names to local DB column names
            carerix_to_local = {
                "firstName": "first_name",
                "lastName": "last_name",
                "emailAddress": "email_address",
                "phoneNumber": "phone_number",
                "mobileNumber": "mobile_number",
                "city": "city",
                "postalCode": "postal_code",
                "employeeInformation": "employee_information",
            }

            local_updates = {}
            for carerix_field, value in fields_to_update.items():
                local_col = carerix_to_local.get(carerix_field)
                if local_col:
                    local_updates[local_col] = value

            if local_updates:
                stmt = select(Employees).where(Employees.carerix_id == employee_id)
                emp_result = await db.execute(stmt)
                emp = emp_result.scalar_one_or_none()
                if emp:
                    for col, val in local_updates.items():
                        if hasattr(emp, col):
                            setattr(emp, col, val)
                    await db.commit()
                    logger.info("Updated local employee %d with %d fields", employee_id, len(local_updates))

        except Exception as e:
            logger.warning("Failed to update local DB for employee %d: %s", employee_id, e)
            # Don't fail the request — Carerix was updated successfully

        return CandidateUpdateResponse(
            success=True,
            carerix_employee_id=employee_id,
            updated_fields=list(fields_to_update.keys()),
            message=f"Successfully updated {len(fields_to_update)} field(s) in Carerix",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Candidate update failed for employee %d: %s", employee_id, e)
        raise HTTPException(
            status_code=500,
            detail=f"Update failed: {str(e)[:200]}",
        )