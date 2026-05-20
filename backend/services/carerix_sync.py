"""
Carerix Sync Service — Pulls data from Carerix GraphQL API and upserts into local database.

Replaces the Xano sync layer. Supports incremental sync using modificationDate filtering.

Entity types supported:
- companies (CRCompany)
- employees (CREmployee)
- crx_vacancies (CRVacancy)
- crx_publications (CRPublication)
- crx_jobs (CRJob)
- crx_matches (CRMatch)
- crx_todos (CRToDo)
"""

import asyncio
import json
import logging
import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.carerix_auth import _get_access_token, CARERIX_GRAPHQL_URL

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Safe type conversion helpers — Carerix GraphQL returns mixed types
# ---------------------------------------------------------------------------

def _safe_int(value) -> Optional[int]:
    """Safely convert a value to int, returning None on failure."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _safe_composite_id(value) -> Optional[int]:
    """Convert a Carerix composite _id (e.g. '14.9021') to a unique integer.

    Carerix matches use composite IDs like 'employeeID.matchID'.
    We combine them as: part1 * 10_000_000 + part2 to ensure uniqueness.
    Falls back to hash-based integer for unexpected formats.
    """
    if value is None:
        return None
    s = str(value)
    if "." in s:
        parts = s.split(".", 1)
        try:
            p1 = int(parts[0])
            p2 = int(parts[1])
            return p1 * 10_000_000 + p2
        except (ValueError, TypeError):
            pass
    # Fallback: try direct int conversion
    try:
        return int(value)
    except (ValueError, TypeError):
        pass
    # Last resort: deterministic hash
    return abs(hash(s)) % (2**31 - 1)


def _safe_float(value) -> Optional[float]:
    """Safely convert a value to float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _safe_str(value) -> Optional[str]:
    """Safely convert a value to string, returning None for None."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str)
    return str(value)


def _safe_bool(value) -> Optional[bool]:
    """Safely convert a value to bool."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.lower() in ("true", "1", "yes")
    return bool(value)


# Maximum size for raw_json field in bytes.
# Records with cvSummary/employeeInformation can produce raw_json > 400KB.
# Since all important fields are extracted into dedicated columns, we truncate
# raw_json to keep batch INSERT statements manageable (< 5MB per batch).
_MAX_RAW_JSON_BYTES = 50_000  # 50KB


def _truncated_raw_json(item: dict) -> str:
    """Serialize item to JSON, truncating if it exceeds _MAX_RAW_JSON_BYTES.

    Large text fields (cvSummary, employeeInformation, motivation, notes, etc.)
    are already extracted into dedicated DB columns, so truncating raw_json
    only loses redundant data.
    """
    raw = json.dumps(item, default=str)
    if len(raw) <= _MAX_RAW_JSON_BYTES:
        return raw
    # Truncate large text fields in a copy to reduce size
    truncated = dict(item)
    large_fields = [
        "cvSummary", "employeeInformation", "companyInformation",
        "companyProfile", "vacancyInformation", "offerInformation",
        "requirements", "introInformation", "motivation", "notes",
        "experienceInformation", "educationInformation",
        "introInformationHTML", "vacancyInformationHTML",
        "requirementsInformationHTML", "offerInformationHTML",
        "companyInformationHTML", "functionContactInformationHTML",
    ]
    for field in large_fields:
        val = truncated.get(field)
        if isinstance(val, str) and len(val) > 500:
            truncated[field] = val[:500] + "...[truncated]"
    raw = json.dumps(truncated, default=str)
    if len(raw) > _MAX_RAW_JSON_BYTES:
        raw = raw[:_MAX_RAW_JSON_BYTES - 20] + '..."__truncated":true}'
    return raw


# ---------------------------------------------------------------------------
# GraphQL query templates per entity type
# ---------------------------------------------------------------------------

ENTITY_QUERIES = {
    "companies": {
        "query_name": "crCompanyPage",
        "id_field": "companyID",
        "fields": """
            companyID
            name
            shortName
            division
            companyInformation
            companyProfile
            emailAddress
            phoneNumber
            faxNumber
            url
            linkedInUrl
            visitAddress
            mailingAddress
            kvkNumber
            taxNumber
            companySize
            statusDisplay
            statusIndicationColor
            creationDate
            modificationDate
        """,
    },
    "employees": {
        "query_name": "crEmployeePage",
        "id_field": "employeeID",
        "fields": """
            employeeID
            firstName
            lastName
            lastNamePrefix
            initials
            fullFirstNames
            name
            title
            emailAddress
            phoneNumber
            mobileNumber
            city
            postalCode
            birthDate
            age
            cvSummary
            employeeInformation
            statusDisplay
            statusIndicationColor
            creationDate
            modificationDate
        """,
    },
    "crx_vacancies": {
        "query_name": "crVacancyPage",
        "id_field": "vacancyID",
        "fields": """
            vacancyID
            vacancyNo
            jobTitle
            titleInformation
            introInformation
            vacancyInformation
            offerInformation
            companyInformation
            requirements
            workLocation
            workCity
            startDate
            endDate
            hoursPerWeek
            numberOfVacancies
            statusDisplay
            statusIndicationColor
            creationDate
            modificationDate
            toCompany { _id }
        """,
    },
    "crx_publications": {
        "query_name": "crPublicationPage",
        "id_field": "publicationID",
        "fields": """
            publicationID
            titleInformation
            introInformation
            introInformationHTML
            vacancyInformation
            vacancyInformationHTML
            requirementsInformation
            requirementsInformationHTML
            offerInformation
            offerInformationHTML
            companyInformation
            companyInformationHTML
            applicationContactInformation
            functionContactInformation
            functionContactInformationHTML
            workLocation
            vacancyNo
            applyUrl
            publicationStart
            publicationEnd
            status
            statusDisplay
            closed
            deleted
            modificationDate
            toVacancy { _id }
            toCompany { _id }
        """,
    },
    "crx_jobs": {
        "query_name": "crJobPage",
        "id_field": "jobID",
        "fields": """
            jobID
            name
            startDate
            endDate
            hoursPerWeek
            costPrice
            sellingPrice
            purchaseRate
            status
            statusDisplay
            statusIndicationColor
            creationDate
            modificationDate
            toEmployee { _id }
            toVacancy { _id }
            toCompany { _id }
        """,
    },
    "crx_matches": {
        "query_name": "crMatchPage",
        "id_field": "_id",
        "fields": """
            _id
            title
            statusDisplay
            statusIndicationColor
            motivation
            notes
            fitScore
            cvSummary
            salary
            costPrice
            sellingPrice
            sortOrder
            sourceInfo
            creationDate
            modificationDate
            toEmployee { _id }
            toVacancy { _id }
            toCompany { _id }
            toPublication { _id }
        """,
    },
    "crx_todos": {
        "query_name": "crTaskPage",
        "id_field": "toDoID",
        # Use crTaskPage instead of crToDoPage — this queries the CRTask entity
        # which is a subtype of CRToDo containing only tasks (isTask=1).
        # crTaskPage returns ~186K records vs ~1.9M for crToDoPage, eliminating
        # the need for client-side filtering and making sync 10x faster.
        # Discovered via GraphQL introspection; sample: CRToDo.task/2467508
        "page_size": 200,
        "max_pages": 1000,  # 1000 * 200 = 200K capacity (enough for ~186K tasks)
        "fields": """
            toDoID
            subject
            name
            title
            toDoTypeKey
            todoTypeKey
            isTask
            isEmail
            isMeeting
            isNote
            status
            statusDisplay
            priority
            startDate
            endDate
            deadline
            location
            isAllDay
            creationDate
            modificationDate
            toEmployee { _id }
            toVacancy { _id }
            toCompany { _id }
        """,
    },
}

# Minimal fields for fallback queries when full field list fails
ENTITY_MINIMAL_FIELDS = {
    "companies": "companyID name shortName emailAddress statusDisplay modificationDate",
    "employees": "employeeID firstName lastName name emailAddress statusDisplay modificationDate",
    "crx_vacancies": "vacancyID vacancyNo jobTitle statusDisplay modificationDate",
    "crx_publications": "publicationID titleInformation statusDisplay modificationDate",
    "crx_jobs": "jobID name statusDisplay modificationDate",
    "crx_matches": "_id title statusDisplay modificationDate",
    "crx_todos": "toDoID subject name isTask statusDisplay modificationDate",
}


# ---------------------------------------------------------------------------
# Field mapping: Carerix GraphQL field → local DB column
# ---------------------------------------------------------------------------

FIELD_MAPPERS = {
    "companies": lambda item: {
        "carerix_id": _safe_int(item.get("companyID")),
        "name": _safe_str(item.get("name")) or "",
        "short_name": _safe_str(item.get("shortName")),
        "division": _safe_str(item.get("division")),
        "company_information": _safe_str(item.get("companyInformation")),
        "company_profile": _safe_str(item.get("companyProfile")),
        "email_address": _safe_str(item.get("emailAddress")),
        "phone_number": _safe_str(item.get("phoneNumber")),
        "fax_number": _safe_str(item.get("faxNumber")),
        "url": _safe_str(item.get("url")),
        "linkedin_url": _safe_str(item.get("linkedInUrl")),
        # visitAddress and mailingAddress are plain strings in Carerix GraphQL
        "visit_street": _safe_str(item.get("visitAddress")),
        "mailing_street": _safe_str(item.get("mailingAddress")),
        "kvk_number": _safe_str(item.get("kvkNumber")),
        "tax_number": _safe_str(item.get("taxNumber")),
        "company_size": _safe_int(item.get("companySize")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "status_indication_color": _safe_str(item.get("statusIndicationColor")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "employees": lambda item: {
        "carerix_id": _safe_int(item.get("employeeID")),
        "first_name": _safe_str(item.get("firstName")),
        "last_name": _safe_str(item.get("lastName")),
        "last_name_prefix": _safe_str(item.get("lastNamePrefix")),
        "initials": _safe_str(item.get("initials")),
        "full_first_names": _safe_str(item.get("fullFirstNames")),
        "name": _safe_str(item.get("name")),
        "title": _safe_str(item.get("title")),
        "email_address": _safe_str(item.get("emailAddress")),
        "phone_number": _safe_str(item.get("phoneNumber")),
        "mobile_number": _safe_str(item.get("mobileNumber")),
        "city": _safe_str(item.get("city")),
        "postal_code": _safe_str(item.get("postalCode")),
        "birth_date": _safe_str(item.get("birthDate")),
        "age": _safe_int(item.get("age")),
        "cv_summary": _safe_str(item.get("cvSummary")),
        "employee_information": _safe_str(item.get("employeeInformation")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "status_indication_color": _safe_str(item.get("statusIndicationColor")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "crx_vacancies": lambda item: {
        "carerix_id": _safe_int(item.get("vacancyID")),
        "vacancy_no": _safe_str(item.get("vacancyNo")),
        "job_title": _safe_str(item.get("jobTitle")),
        "title_information": _safe_str(item.get("titleInformation")),
        "intro_information": _safe_str(item.get("introInformation")),
        "vacancy_information": _safe_str(item.get("vacancyInformation")),
        "offer_information": _safe_str(item.get("offerInformation")),
        "company_information": _safe_str(item.get("companyInformation")),
        "requirements": _safe_str(item.get("requirements")),
        "work_location": _safe_str(item.get("workLocation")),
        "work_city": _safe_str(item.get("workCity")),
        "start_date": _safe_str(item.get("startDate")),
        "end_date": _safe_str(item.get("endDate")),
        "hours_per_week": _safe_float(item.get("hoursPerWeek")),
        "number_of_vacancies": _safe_int(item.get("numberOfVacancies")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "status_indication_color": _safe_str(item.get("statusIndicationColor")),
        "company_carerix_id": _safe_int((item.get("toCompany") or {}).get("_id")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "crx_publications": lambda item: {
        "carerix_id": _safe_int(item.get("publicationID")),
        "title_information": _safe_str(item.get("titleInformation")),
        "intro_information": _safe_str(item.get("introInformation")),
        "intro_information_html": _safe_str(item.get("introInformationHTML")),
        "vacancy_information": _safe_str(item.get("vacancyInformation")),
        "vacancy_information_html": _safe_str(item.get("vacancyInformationHTML")),
        "requirements_information": _safe_str(item.get("requirementsInformation")),
        "requirements_information_html": _safe_str(item.get("requirementsInformationHTML")),
        "offer_information": _safe_str(item.get("offerInformation")),
        "offer_information_html": _safe_str(item.get("offerInformationHTML")),
        "company_information": _safe_str(item.get("companyInformation")),
        "company_information_html": _safe_str(item.get("companyInformationHTML")),
        "application_contact_information": _safe_str(item.get("applicationContactInformation")),
        "function_contact_information": _safe_str(item.get("functionContactInformation")),
        "function_contact_information_html": _safe_str(item.get("functionContactInformationHTML")),
        "work_location": _safe_str(item.get("workLocation")),
        "vacancy_no": _safe_str(item.get("vacancyNo")),
        "apply_url": _safe_str(item.get("applyUrl")),
        "publication_start": _safe_str(item.get("publicationStart")),
        "publication_end": _safe_str(item.get("publicationEnd")),
        "status": _safe_int(item.get("status")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "closed": _safe_bool(item.get("closed")),
        "deleted": _safe_bool(item.get("deleted")),
        "vacancy_carerix_id": _safe_int((item.get("toVacancy") or {}).get("_id")),
        "company_carerix_id": _safe_int((item.get("toCompany") or {}).get("_id")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "crx_jobs": lambda item: {
        "carerix_id": _safe_int(item.get("jobID")),
        "name": _safe_str(item.get("name")),
        "start_date": _safe_str(item.get("startDate")),
        "end_date": _safe_str(item.get("endDate")),
        "hours_per_week": _safe_float(item.get("hoursPerWeek")),
        "cost_price": _safe_float(item.get("costPrice")),
        "selling_price": _safe_float(item.get("sellingPrice")),
        "purchase_rate": _safe_float(item.get("purchaseRate")),
        "status": _safe_int(item.get("status")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "status_indication_color": _safe_str(item.get("statusIndicationColor")),
        "employee_carerix_id": _safe_int((item.get("toEmployee") or {}).get("_id")),
        "vacancy_carerix_id": _safe_int((item.get("toVacancy") or {}).get("_id")),
        "company_carerix_id": _safe_int((item.get("toCompany") or {}).get("_id")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "crx_matches": lambda item: {
        "carerix_id": _safe_composite_id(item.get("_id")),
        "match_title": _safe_str(item.get("title")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "status_indication_color": _safe_str(item.get("statusIndicationColor")),
        "motivation": _safe_str(item.get("motivation")),
        "notes": _safe_str(item.get("notes")),
        "fit_score": _safe_int(item.get("fitScore")),
        "cv_summary": _safe_str(item.get("cvSummary")),
        "salary": _safe_float(item.get("salary")),
        "cost_price": _safe_float(item.get("costPrice")),
        "selling_price": _safe_float(item.get("sellingPrice")),
        "sort_order": _safe_int(item.get("sortOrder")),
        "source_info": _safe_str(item.get("sourceInfo")),
        "employee_carerix_id": _safe_int((item.get("toEmployee") or {}).get("_id")),
        "vacancy_carerix_id": _safe_int((item.get("toVacancy") or {}).get("_id")),
        "company_carerix_id": _safe_int((item.get("toCompany") or {}).get("_id")),
        "publication_carerix_id": _safe_int((item.get("toPublication") or {}).get("_id")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
    "crx_todos": lambda item: {
        "carerix_id": _safe_int(item.get("toDoID")),
        "subject": _safe_str(item.get("subject")),
        "todo_name": _safe_str(item.get("name")),
        "todo_title": _safe_str(item.get("title")),
        "todo_type_key": _safe_int(item.get("toDoTypeKey") or item.get("todoTypeKey")),
        "is_task": _safe_bool(item.get("isTask")),
        "is_email": _safe_bool(item.get("isEmail")),
        "is_meeting": _safe_bool(item.get("isMeeting")),
        "is_note": _safe_bool(item.get("isNote")),
        "status": _safe_int(item.get("status")),
        "status_display": _safe_str(item.get("statusDisplay")),
        "priority": _safe_int(item.get("priority")),
        "start_date": _safe_str(item.get("startDate")),
        "end_date": _safe_str(item.get("endDate")),
        "deadline": _safe_str(item.get("deadline")),
        "location": _safe_str(item.get("location")),
        "is_all_day": _safe_bool(item.get("isAllDay")),
        "employee_carerix_id": _safe_int((item.get("toEmployee") or {}).get("_id")),
        "vacancy_carerix_id": _safe_int((item.get("toVacancy") or {}).get("_id")),
        "company_carerix_id": _safe_int((item.get("toCompany") or {}).get("_id")),
        "carerix_created_date": _safe_str(item.get("creationDate")),
        "carerix_modified_date": _safe_str(item.get("modificationDate")),
        "raw_json": _truncated_raw_json(item),
    },
}


# ---------------------------------------------------------------------------
# ORM model mapping
# ---------------------------------------------------------------------------

def _get_model_class(entity_type: str):
    """Get the SQLAlchemy model class for an entity type."""
    from models.companies import Companies
    from models.employees import Employees
    from models.crx_vacancies import Crx_vacancies
    from models.crx_publications import Crx_publications
    from models.crx_jobs import Crx_jobs
    from models.crx_matches import Crx_matches
    from models.crx_todos import Crx_todos

    mapping = {
        "companies": Companies,
        "employees": Employees,
        "crx_vacancies": Crx_vacancies,
        "crx_publications": Crx_publications,
        "crx_jobs": Crx_jobs,
        "crx_matches": Crx_matches,
        "crx_todos": Crx_todos,
    }
    return mapping.get(entity_type)


# ---------------------------------------------------------------------------
# Date comparison helper for incremental sync
# ---------------------------------------------------------------------------

def _parse_carerix_datetime(date_str: Optional[str]) -> Optional[datetime]:
    """Parse a Carerix modificationDate string into a timezone-aware datetime (UTC).

    Carerix returns dates in various formats:
    - "2026-04-03T15:28:10"
    - "2026-04-03T15:28:10.123"
    - "2026-04-03 15:28:10"
    - "2026-04-03T15:28:10Z"
    """
    if not date_str:
        return None
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(date_str, fmt)
            # Treat as UTC if no timezone info
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Core sync logic
# ---------------------------------------------------------------------------

# Global cancellation flag — checked between pages to allow stopping syncs
_sync_cancelled: dict[str, bool] = {}


def cancel_sync(entity_type: str):
    """Signal a running sync to stop after the current page."""
    _sync_cancelled[entity_type] = True


def is_sync_cancelled(entity_type: str) -> bool:
    """Check if a sync has been requested to cancel."""
    return _sync_cancelled.get(entity_type, False)


def clear_sync_cancelled(entity_type: str):
    """Clear the cancellation flag for an entity."""
    _sync_cancelled[entity_type] = False


# Sentinel prefix for 401 errors — allows sync loop to detect token expiry
_AUTH_ERROR_PREFIX = "AUTH_EXPIRED:"


async def _fetch_carerix_page(
    token: str, entity_type: str, page: int = 0, page_size: int = 200,
    use_minimal: bool = False, _retry_count: int = 0,
    qualifier: Optional[str] = None,
    sort_property: Optional[str] = None,
    sort_direction: str = "ASC",
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Fetch a single page of data from Carerix GraphQL API.

    Args:
        token: OAuth2 access token.
        entity_type: One of the supported entity types.
        page: Page number (0-indexed).
        page_size: Number of items per page.
        use_minimal: If True, use minimal field set (fallback for errors).
        _retry_count: Internal retry counter.
        qualifier: Optional Carerix qualifier string for server-side filtering.
            Example: "modificationDate >= (NSCalendarDate)'2026-04-03 00:00:00 Etc/GMT'"
        sort_property: Optional property to sort by (e.g., "employeeID").
        sort_direction: Sort direction, "ASC" or "DESC".

    Returns:
        Tuple of (page_data, error_message).
        If successful, page_data contains the response and error_message is None.
        If failed, page_data is None and error_message describes the issue.
        For 401 errors, error_message starts with _AUTH_ERROR_PREFIX so the
        caller can detect token expiry and refresh immediately.
    """
    config = ENTITY_QUERIES.get(entity_type)
    if not config:
        return None, f"Unknown entity type: {entity_type}"

    fields = ENTITY_MINIMAL_FIELDS.get(entity_type, config["fields"]) if use_minimal else config["fields"]

    # Build pageable object with optional sort
    sort_clause = ""
    if sort_property:
        sort_clause = f', sort: {{property: "{sort_property}", direction: {sort_direction}}}'
    pageable = f'{{page: {page}, size: {page_size}{sort_clause}}}'

    # Use GraphQL variables for qualifier to avoid escaping issues
    if qualifier:
        query = """
        query($qualifier: String) {
          %s(pageable: %s, qualifier: $qualifier) {
            totalElements
            totalPages
            numberOfElements
            items {
              %s
            }
          }
        }
        """ % (config["query_name"], pageable, fields)
        variables = {"qualifier": qualifier}
    else:
        query = """
        {
          %s(pageable: %s) {
            totalElements
            totalPages
            numberOfElements
            items {
              %s
            }
          }
        }
        """ % (config["query_name"], pageable, fields)
        variables = None

    # Use generous timeouts: 30s connect, 90s read (large pages can be slow)
    timeout = httpx.Timeout(connect=30.0, read=90.0, write=30.0, pool=30.0)

    try:
        request_body = {"query": query}
        if variables:
            request_body["variables"] = variables

        async with httpx.AsyncClient(timeout=timeout) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json=request_body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            # Handle HTTP errors — parse body BEFORE raising
            if response.status_code >= 400:
                body_text = response.text[:500]
                error_msg = f"HTTP {response.status_code} fetching {entity_type} page {page}: {body_text}"
                logger.error(error_msg)

                # 401 Unauthorized — token expired, signal caller to refresh
                if response.status_code == 401:
                    return None, f"{_AUTH_ERROR_PREFIX}{error_msg}"

                # Try minimal fields as fallback for HTTP 400 (query validation errors)
                if response.status_code == 400 and not use_minimal:
                    logger.info(
                        "HTTP 400 for %s — retrying with minimal fields...",
                        entity_type,
                    )
                    return await _fetch_carerix_page(
                        token, entity_type, page, page_size, use_minimal=True,
                        qualifier=qualifier, sort_property=sort_property,
                        sort_direction=sort_direction,
                    )
                return None, error_msg

            result = response.json()

            if "errors" in result:
                error_details = json.dumps(result["errors"][:3], default=str)
                error_msg = f"GraphQL errors for {entity_type} page {page}: {error_details}"
                logger.error(error_msg)

                # If data is still present (partial errors), use it
                page_data = result.get("data", {}).get(config["query_name"])
                if page_data and page_data.get("items"):
                    logger.info(
                        "Partial data available for %s page %d despite errors (%d items)",
                        entity_type, page, len(page_data.get("items", [])),
                    )
                    return page_data, f"Partial: {error_details[:200]}"

                # No usable data — try minimal fields as fallback
                if not use_minimal:
                    logger.info(
                        "Retrying %s page %d with minimal fields...",
                        entity_type, page,
                    )
                    return await _fetch_carerix_page(
                        token, entity_type, page, page_size, use_minimal=True,
                        qualifier=qualifier, sort_property=sort_property,
                        sort_direction=sort_direction,
                    )

                return None, error_msg

            page_data = result.get("data", {}).get(config["query_name"], {})
            return page_data, None

    except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadTimeout) as e:
        error_msg = f"Timeout/connection error fetching {entity_type} page {page} (size={page_size}): {type(e).__name__}"
        logger.error(error_msg)

        # Retry up to 3 times with exponential backoff before reducing page size
        if _retry_count < 3:
            wait_secs = 2 * (_retry_count + 1)  # 2s, 4s, 6s
            logger.info(
                "Retrying %s page %d after %ds (attempt %d/3)...",
                entity_type, page, wait_secs, _retry_count + 1,
            )
            await asyncio.sleep(wait_secs)
            return await _fetch_carerix_page(
                token, entity_type, page, page_size,
                use_minimal=use_minimal, _retry_count=_retry_count + 1,
                qualifier=qualifier, sort_property=sort_property,
                sort_direction=sort_direction,
            )

        # After retries exhausted, try smaller page size
        if page_size > 50:
            logger.info("Retrying %s page %d with smaller page size (50)...", entity_type, page)
            return await _fetch_carerix_page(
                token, entity_type, page, page_size=50,
                use_minimal=use_minimal, _retry_count=0,
                qualifier=qualifier, sort_property=sort_property,
                sort_direction=sort_direction,
            )
        return None, error_msg
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code} fetching {entity_type} page {page}: {e.response.text[:300]}"
        logger.error(error_msg)
        # 401 via raised exception
        if e.response.status_code == 401:
            return None, f"{_AUTH_ERROR_PREFIX}{error_msg}"
        # Try minimal fields as fallback for HTTP 400
        if e.response.status_code == 400 and not use_minimal:
            logger.info("Retrying %s with minimal fields after HTTPStatusError...", entity_type)
            return await _fetch_carerix_page(
                token, entity_type, page, page_size, use_minimal=True,
                qualifier=qualifier, sort_property=sort_property,
                sort_direction=sort_direction,
            )
        return None, error_msg
    except Exception as e:
        error_msg = f"Error fetching {entity_type} page {page}: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


# Track last progress update time per entity to throttle DB writes
_last_progress_update: dict[str, float] = {}
_PROGRESS_UPDATE_INTERVAL = 5.0  # Update at most every 5 seconds

# Track sync start times for ETA calculation
_sync_start_times: dict[str, float] = {}


async def _update_sync_progress(
    db: AsyncSession,
    entity_type: str,
    total_expected: int,
    current_fetched: int,
    current_upserted: int,
    force: bool = False,
    phase: str = "fetching",
):
    """Update sync_metadata with progress info for real-time tracking.

    Throttled to update at most every 5 seconds to reduce DB session creation
    and avoid DNS resolver contention in deployed environments.
    Uses the MAIN session with a lightweight UPDATE statement.

    Calculates ETA based on elapsed time and records processed so far.
    """
    from models.sync_metadata_entries import Sync_metadata_entries

    now = time.time()
    last_update = _last_progress_update.get(entity_type, 0)

    # Throttle: skip if updated recently (unless forced)
    if not force and (now - last_update) < _PROGRESS_UPDATE_INTERVAL:
        return

    # Calculate ETA
    avg_ms_per_record = None
    estimated_seconds_remaining = None
    start_time = _sync_start_times.get(entity_type)

    if start_time and total_expected > 0:
        elapsed_s = now - start_time
        if phase == "fetching" and current_fetched > 0:
            avg_ms_per_record = (elapsed_s * 1000) / current_fetched
            remaining_records = total_expected - current_fetched
            estimated_seconds_remaining = int((remaining_records * avg_ms_per_record) / 1000)
        elif phase == "upserting" and current_upserted > 0:
            # During upsert phase, estimate based on upsert speed
            # We need to estimate upsert-only time; use a simpler approach
            records_to_upsert = current_fetched  # total records to upsert
            if records_to_upsert > 0:
                # Rough: upsert is much faster than fetch, estimate ~10% of fetch time
                upsert_remaining = records_to_upsert - current_upserted
                if current_upserted > 0:
                    upsert_elapsed = elapsed_s * 0.1  # approximate upsert portion
                    avg_ms_per_upsert = (upsert_elapsed * 1000) / current_upserted if current_upserted > 0 else 0
                    estimated_seconds_remaining = int((upsert_remaining * avg_ms_per_upsert) / 1000)

    try:
        values = {
            "total_expected": total_expected,
            "current_fetched": current_fetched,
            "current_upserted": current_upserted,
            "current_phase": phase,
        }
        if avg_ms_per_record is not None:
            values["avg_ms_per_record"] = round(avg_ms_per_record, 1)
        if estimated_seconds_remaining is not None:
            values["estimated_seconds_remaining"] = max(0, estimated_seconds_remaining)

        stmt = (
            update(Sync_metadata_entries)
            .where(Sync_metadata_entries.entity_type == entity_type)
            .values(**values)
        )
        await db.execute(stmt)
        await db.commit()
        _last_progress_update[entity_type] = now
    except Exception as e:
        logger.debug("Could not update sync progress: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass


async def sync_entity(
    db: AsyncSession,
    entity_type: str,
    full_sync: bool = False,
    max_pages: int = 500,
) -> Dict[str, Any]:
    """
    Sync a single entity type from Carerix to local database.

    Args:
        db: Database session
        entity_type: One of the supported entity types
        full_sync: If True, fetch all records. If False, only fetch modified since last sync.
        max_pages: Maximum number of pages to fetch (safety limit, 500 pages × 200 = 100,000 records)

    Returns:
        Dict with sync results (records_fetched, records_created, records_updated, etc.)
    """
    from models.sync_metadata_entries import Sync_metadata_entries
    from models.sync_log_entries import Sync_log_entries

    start_time = time.time()
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Register start time for ETA calculation
    _sync_start_times[entity_type] = start_time

    result = {
        "entity_type": entity_type,
        "sync_type": "full" if full_sync else "incremental",
        "records_fetched": 0,
        "records_created": 0,
        "records_updated": 0,
        "records_skipped_unchanged": 0,
        "status": "running",
        "error_message": None,
    }

    # Get model class
    model_class = _get_model_class(entity_type)
    if not model_class:
        result["status"] = "error"
        result["error_message"] = f"Unknown entity type: {entity_type}"
        return result

    # Get field mapper
    mapper = FIELD_MAPPERS.get(entity_type)
    if not mapper:
        result["status"] = "error"
        result["error_message"] = f"No field mapper for: {entity_type}"
        return result

    # Update or create sync_metadata to "running" and read last_sync_timestamp
    meta_row = None
    last_sync_ts: Optional[str] = None  # Used for incremental filtering
    try:
        stmt = (
            select(Sync_metadata_entries)
            .where(Sync_metadata_entries.entity_type == entity_type)
        )
        meta_result = await db.execute(stmt)
        meta_row = meta_result.scalar_one_or_none()
        if meta_row:
            # Save last_sync_timestamp BEFORE resetting — needed for incremental filtering
            if not full_sync and meta_row.last_sync_timestamp:
                last_sync_ts = meta_row.last_sync_timestamp
                result["_last_sync_ts"] = last_sync_ts  # For audit log (internal)
            meta_row.sync_status = "running"
            meta_row.error_message = None
            meta_row.total_expected = 0
            meta_row.current_fetched = 0
            meta_row.current_upserted = 0
            meta_row.sync_started_at = started_at
            meta_row.avg_ms_per_record = None
            meta_row.estimated_seconds_remaining = None
            meta_row.current_phase = "fetching"
            await db.commit()
        else:
            # Auto-create metadata row if it doesn't exist
            meta_row = Sync_metadata_entries(
                entity_type=entity_type,
                sync_status="running",
                records_synced=0,
                total_expected=0,
                current_fetched=0,
                current_upserted=0,
                sync_started_at=started_at,
                current_phase="fetching",
            )
            db.add(meta_row)
            await db.commit()
            await db.refresh(meta_row)
            logger.info("Created sync_metadata row for %s", entity_type)
    except Exception as e:
        logger.warning("Could not update/create sync_metadata: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Get access token
    token = await _get_access_token()
    if not token:
        result["status"] = "error"
        result["error_message"] = "Failed to obtain Carerix access token"
        # Update metadata with error
        await _finalize_sync_metadata(db, meta_row, result, start_time, full_sync)
        await _insert_sync_log(db, entity_type, full_sync, started_at, result, start_time)
        return result

    all_errors: List[str] = []

    # Clear any previous cancellation flag
    clear_sync_cancelled(entity_type)

    # Check for entity-specific server-side qualifier (e.g., crx_todos: isTask=1)
    entity_config = ENTITY_QUERIES.get(entity_type, {})
    server_qualifier: Optional[str] = entity_config.get("server_qualifier")

    # Incremental sync: use modificationDate qualifier to only fetch changed records
    if not full_sync and last_sync_ts:
        sync_dt = _parse_carerix_datetime(last_sync_ts)
        if sync_dt:
            date_str = sync_dt.strftime("%Y-%m-%d %H:%M:%S")
            mod_qualifier = f"modificationDate >= (NSCalendarDate)'{date_str} Etc/GMT'"
            # Combine with any entity-specific qualifier
            if server_qualifier:
                server_qualifier = f"{server_qualifier} AND {mod_qualifier}"
            else:
                server_qualifier = mod_qualifier
            result["_qualifier_used"] = server_qualifier
            logger.info(
                "%s: INCREMENTAL sync — using modificationDate qualifier since %s: %s",
                entity_type, last_sync_ts, server_qualifier,
            )

    if server_qualifier:
        if "_qualifier_used" not in result:
            result["_qualifier_used"] = server_qualifier
        logger.info(
            "%s: using server-side qualifier: %s",
            entity_type, server_qualifier,
        )
    else:
        logger.info(
            "%s: FULL sync — fetching ALL records (no date filter)",
            entity_type,
        )

    # Determine sort property for ordered pagination
    id_field = ENTITY_QUERIES[entity_type]["id_field"]
    sort_property = id_field if id_field != "_id" else None

    # Use entity-specific page_size and max_pages if configured
    default_page_size = entity_config.get("page_size", 200)
    effective_max_pages = entity_config.get("max_pages", max_pages)

    try:
        # Fetch all pages with robust retry logic
        all_items = []
        page = 0
        total_elements = 0
        consecutive_failures = 0
        max_consecutive_failures = 5
        _token_refresh_count = 0
        _max_token_refreshes = 50  # Allow up to 50 token refreshes for long syncs (tokens expire every 300s)
        current_page_size = default_page_size

        while page < effective_max_pages:
            # Check for cancellation between pages
            if is_sync_cancelled(entity_type):
                logger.info("Sync for %s cancelled by user after %d items", entity_type, len(all_items))
                result["status"] = "cancelled"
                result["error_message"] = f"Cancelled by user after fetching {len(all_items)} records"
                break

            page_data, page_error = await _fetch_carerix_page(
                token, entity_type, page, page_size=current_page_size,
                qualifier=server_qualifier, sort_property=sort_property,
            )

            if page_error:
                all_errors.append(page_error)

            if not page_data:
                # --- Handle 401 (token expired) immediately ---
                if page_error and page_error.startswith(_AUTH_ERROR_PREFIX):
                    if _token_refresh_count < _max_token_refreshes:
                        _token_refresh_count += 1
                        logger.warning(
                            "%s: token expired at page %d (%d items fetched). "
                            "Refreshing token (attempt %d/%d)...",
                            entity_type, page, len(all_items),
                            _token_refresh_count, _max_token_refreshes,
                        )
                        await asyncio.sleep(1)
                        token = await _get_access_token()
                        if token:
                            # Retry the SAME page with new token — no page size change
                            consecutive_failures = 0
                            continue
                        else:
                            result["status"] = "error"
                            result["error_message"] = "Failed to refresh Carerix access token after 401"
                            break
                    else:
                        result["status"] = "partial"
                        result["error_message"] = (
                            f"Token expired {_max_token_refreshes} times. "
                            f"Fetched {len(all_items)} of {total_elements} records."
                        )
                        break

                # --- Handle other failures ---
                consecutive_failures += 1

                if page == 0:
                    # First page failure — try with fresh token
                    if consecutive_failures <= 2:
                        logger.warning(
                            "Page 0 failed for %s (attempt %d), retrying...",
                            entity_type, consecutive_failures,
                        )
                        await asyncio.sleep(2)
                        token = await _get_access_token()
                        if not token:
                            result["status"] = "error"
                            result["error_message"] = "Failed to refresh Carerix access token"
                            break
                        continue
                    result["status"] = "error"
                    result["error_message"] = page_error or "Failed to fetch first page from Carerix"
                    break

                # Non-first page, non-401 failure: timeout or other transient error
                if consecutive_failures <= 2:
                    # Simple retry with a delay — most transient errors resolve themselves
                    wait_secs = 2 * consecutive_failures
                    logger.warning(
                        "%s: page %d failed (attempt %d), retrying after %ds...",
                        entity_type, page, consecutive_failures, wait_secs,
                    )
                    await asyncio.sleep(wait_secs)
                    continue

                if consecutive_failures <= 4 and current_page_size > 50:
                    # Reduce page size for persistent timeouts on deep pages
                    old_size = current_page_size
                    current_page_size = max(50, current_page_size // 2)
                    items_so_far = len(all_items)
                    page = items_so_far // current_page_size
                    logger.warning(
                        "%s: reducing page size %d→%d and retrying from page %d (have %d items)",
                        entity_type, old_size, current_page_size, page, items_so_far,
                    )
                    consecutive_failures = 0
                    await asyncio.sleep(3)
                    # Also refresh token in case it expired
                    new_token = await _get_access_token()
                    if new_token:
                        token = new_token
                    continue

                if consecutive_failures >= max_consecutive_failures:
                    logger.warning(
                        "Stopping %s after %d consecutive failures at page %d. Got %d items (expected %d).",
                        entity_type, consecutive_failures, page, len(all_items), total_elements,
                    )
                    if result["status"] == "running":
                        result["status"] = "partial"
                        result["error_message"] = (
                            f"Stopped after {consecutive_failures} consecutive failures at page {page} "
                            f"(page_size={current_page_size}). "
                            f"Fetched {len(all_items)} of {total_elements} records. "
                            f"Last error: {page_error or 'unknown'}"
                        )
                    break

                # Skip this page and try the next one
                logger.warning(
                    "Skipping page %d for %s (attempt %d/%d). Error: %s",
                    page, entity_type, consecutive_failures, max_consecutive_failures, page_error,
                )
                page += 1
                await asyncio.sleep(1.5)
                continue

            # --- Success ---
            consecutive_failures = 0

            items = page_data.get("items", [])
            total_pages = page_data.get("totalPages", 1)
            total_elements = page_data.get("totalElements", 0)

            if not items:
                break

            # Deduplicate: when page size changes mid-sync, we may re-fetch some items
            if current_page_size < default_page_size and all_items:
                id_field = ENTITY_QUERIES[entity_type]["id_field"]
                existing_ids = {item.get(id_field) for item in all_items if item.get(id_field) is not None}
                new_items = [item for item in items if item.get(id_field) not in existing_ids]
                if len(new_items) < len(items):
                    logger.info(
                        "%s: deduplicated page %d: %d items → %d new",
                        entity_type, page, len(items), len(new_items),
                    )
                items = new_items

            all_items.extend(items)
            logger.info(
                "Fetched page %d/%d for %s (%d items so far / %d total, page_size=%d)",
                page + 1, total_pages, entity_type, len(all_items), total_elements,
                current_page_size,
            )

            # Update progress for real-time tracking (uses separate DB session)
            await _update_sync_progress(db, entity_type, total_elements, len(all_items), 0, phase="fetching")

            page += 1

            # Recalculate total_pages based on current page size
            if total_elements > 0:
                effective_total_pages = math.ceil(total_elements / current_page_size)
                if page >= effective_total_pages:
                    break
            elif page >= total_pages:
                break

            # Adaptive delay: longer delays for deep pagination to avoid rate-limiting
            if page > 50:
                await asyncio.sleep(1.0)
            elif page > 20:
                await asyncio.sleep(0.5)
            else:
                await asyncio.sleep(0.3)

        result["records_fetched"] = len(all_items)

        if current_page_size < default_page_size:
            logger.info(
                "%s: completed fetch with reduced page size (final size=%d, default=%d)",
                entity_type, current_page_size, default_page_size,
            )

        if _token_refresh_count > 0:
            logger.info(
                "%s: token was refreshed %d times during sync",
                entity_type, _token_refresh_count,
            )

        # Apply client-side filter if defined (e.g., crx_todos → only isTask=1)
        filter_fn = ENTITY_QUERIES.get(entity_type, {}).get("filter_fn")
        if filter_fn and all_items:
            pre_filter_count = len(all_items)
            all_items = [item for item in all_items if filter_fn(item)]
            filtered_out = pre_filter_count - len(all_items)
            logger.info(
                "%s: filtered %d → %d items (removed %d non-matching records)",
                entity_type, pre_filter_count, len(all_items), filtered_out,
            )
            result["records_fetched"] = len(all_items)

        if total_elements > 0 and len(all_items) < total_elements and not filter_fn:
            logger.warning(
                "%s: fetched %d of %d total records (%.0f%%)",
                entity_type, len(all_items), total_elements,
                (len(all_items) / total_elements) * 100,
            )

        # Incremental sync fetches only records modified since last sync.
        # Full sync fetches all records (use full=true to trigger).

        if not all_items:
            result["status"] = "success" if result["status"] == "running" else result["status"]
            logger.info("No items fetched for %s", entity_type)
        else:
            # Batch upsert using PostgreSQL INSERT ... ON CONFLICT DO UPDATE
            # This is orders of magnitude faster than one-by-one sessions.
            from core.database import db_manager
            from sqlalchemy.dialects.postgresql import insert as pg_insert

            error_count = 0
            skipped_count = 0
            upserted_count = 0

            # Pre-compute model columns once
            model_columns = {c.name for c in model_class.__table__.columns}
            # Columns to update on conflict (exclude id and carerix_id)
            update_columns = [
                c.name for c in model_class.__table__.columns
                if c.name not in ("id", "carerix_id")
            ]

            # --- Adaptive batch sizing ---
            # Estimate payload size per record to prevent oversized SQL statements.
            # Target: each batch INSERT should be < 5MB to avoid connection hangs.
            _MAX_BATCH_BYTES = 5_000_000  # 5MB target per batch
            _DEFAULT_BATCH_SIZE = 500
            _MIN_BATCH_SIZE = 10

            # Map all items first, then split into size-aware batches
            all_mapped: list[dict] = []
            for item in all_items:
                try:
                    mapped = mapper(item)
                    carerix_id = mapped.get("carerix_id")
                    if carerix_id is None:
                        skipped_count += 1
                        continue
                    # Filter to valid model columns only
                    safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}
                    all_mapped.append(safe_mapped)
                except Exception as e:
                    error_count += 1
                    item_id = item.get(ENTITY_QUERIES[entity_type]["id_field"], "unknown")
                    err_msg = f"Mapping error for {entity_type} id={item_id}: {type(e).__name__}: {str(e)[:200]}"
                    logger.warning(err_msg)
                    if error_count <= 10:
                        all_errors.append(err_msg)

            # Build size-aware batches
            mapped_batches: list[list[dict]] = []
            current_batch: list[dict] = []
            current_batch_bytes = 0

            for record in all_mapped:
                # Estimate record size: sum of string field lengths + overhead per field
                record_bytes = sum(
                    len(str(v)) if v is not None else 4
                    for v in record.values()
                ) + len(record) * 20  # ~20 bytes overhead per column name/separator

                # Start new batch if adding this record would exceed limit
                if current_batch and (
                    current_batch_bytes + record_bytes > _MAX_BATCH_BYTES
                    or len(current_batch) >= _DEFAULT_BATCH_SIZE
                ):
                    mapped_batches.append(current_batch)
                    current_batch = []
                    current_batch_bytes = 0

                current_batch.append(record)
                current_batch_bytes += record_bytes

            if current_batch:
                mapped_batches.append(current_batch)

            total_to_upsert = sum(len(b) for b in mapped_batches)
            batch_sizes = [len(b) for b in mapped_batches]
            logger.info(
                "%s: prepared %d records in %d batches for upsert "
                "(batch sizes: min=%d, max=%d, avg=%d; %d skipped null ID, %d mapping errors)",
                entity_type, total_to_upsert, len(mapped_batches),
                min(batch_sizes) if batch_sizes else 0,
                max(batch_sizes) if batch_sizes else 0,
                total_to_upsert // max(len(mapped_batches), 1),
                skipped_count, error_count,
            )

            # Execute batch upserts with timeout protection
            _BATCH_TIMEOUT_SECS = 120  # 2 minutes max per batch

            for batch_idx, batch in enumerate(mapped_batches):
                try:
                    async def _execute_batch(b: list[dict]):
                        async with db_manager.async_session_maker() as batch_db:
                            stmt = pg_insert(model_class).values(b)
                            # ON CONFLICT (carerix_id) DO UPDATE SET ...
                            update_dict = {
                                col: stmt.excluded[col] for col in update_columns
                                if col in {k for row in b for k in row.keys()}
                            }
                            if update_dict:
                                stmt = stmt.on_conflict_do_update(
                                    index_elements=["carerix_id"],
                                    set_=update_dict,
                                )
                            else:
                                stmt = stmt.on_conflict_do_nothing(
                                    index_elements=["carerix_id"],
                                )
                            await batch_db.execute(stmt)
                            await batch_db.commit()

                    await asyncio.wait_for(
                        _execute_batch(batch),
                        timeout=_BATCH_TIMEOUT_SECS,
                    )

                    upserted_count += len(batch)
                    logger.info(
                        "Batch %d/%d: upserted %d %s records (total: %d/%d)",
                        batch_idx + 1, len(mapped_batches), len(batch),
                        entity_type, upserted_count, total_to_upsert,
                    )

                except asyncio.TimeoutError:
                    batch_error_msg = (
                        f"Batch {batch_idx+1} TIMED OUT for {entity_type} "
                        f"({len(batch)} records, {_BATCH_TIMEOUT_SECS}s limit) — falling back to individual inserts"
                    )
                    logger.warning(batch_error_msg)
                    all_errors.append(batch_error_msg)
                    # Fall through to individual insert fallback below
                    for record in batch:
                        try:
                            async with db_manager.async_session_maker() as record_db:
                                stmt = pg_insert(model_class).values(**record)
                                update_dict = {
                                    col: stmt.excluded[col] for col in update_columns
                                    if col in record
                                }
                                if update_dict:
                                    stmt = stmt.on_conflict_do_update(
                                        index_elements=["carerix_id"],
                                        set_=update_dict,
                                    )
                                else:
                                    stmt = stmt.on_conflict_do_nothing(
                                        index_elements=["carerix_id"],
                                    )
                                await asyncio.wait_for(
                                    record_db.execute(stmt),
                                    timeout=30,
                                )
                                await record_db.commit()
                            upserted_count += 1
                        except Exception as inner_e:
                            error_count += 1
                            rec_id = record.get("carerix_id", "unknown")
                            err_msg = f"Individual upsert error for {entity_type} carerix_id={rec_id}: {type(inner_e).__name__}: {str(inner_e)[:200]}"
                            logger.warning(err_msg)
                            if error_count <= 10:
                                all_errors.append(err_msg)

                except Exception as e:
                    # If batch fails, fall back to individual inserts for this batch
                    batch_error_msg = f"Batch {batch_idx+1} failed for {entity_type}: {type(e).__name__}: {str(e)[:200]}"
                    logger.warning("%s — falling back to individual inserts", batch_error_msg)
                    all_errors.append(batch_error_msg)

                    for record in batch:
                        try:
                            async with db_manager.async_session_maker() as record_db:
                                stmt = pg_insert(model_class).values(**record)
                                update_dict = {
                                    col: stmt.excluded[col] for col in update_columns
                                    if col in record
                                }
                                if update_dict:
                                    stmt = stmt.on_conflict_do_update(
                                        index_elements=["carerix_id"],
                                        set_=update_dict,
                                    )
                                else:
                                    stmt = stmt.on_conflict_do_nothing(
                                        index_elements=["carerix_id"],
                                    )
                                await record_db.execute(stmt)
                                await record_db.commit()
                            upserted_count += 1
                        except Exception as inner_e:
                            error_count += 1
                            rec_id = record.get("carerix_id", "unknown")
                            err_msg = f"Individual upsert error for {entity_type} carerix_id={rec_id}: {type(inner_e).__name__}: {str(inner_e)[:200]}"
                            logger.warning(err_msg)
                            if error_count <= 10:
                                all_errors.append(err_msg)

                # Update progress after each batch
                await _update_sync_progress(
                    db, entity_type, total_elements, len(all_items), upserted_count,
                    force=True, phase="upserting",
                )

            # Compute created vs updated by comparing DB count before/after
            # For simplicity, report all as "created" for new records and "updated" for existing
            result["records_created"] = upserted_count  # Approximate — includes updates
            result["records_updated"] = 0  # Will be refined below

            # Only upgrade to "success" if we weren't already in a degraded state (partial/cancelled)
            if result["status"] == "running":
                result["status"] = "success"
            # If status was "partial" (incomplete fetch), keep it as partial
            if skipped_count > 0:
                logger.info("%s: skipped %d records with null carerix_id", entity_type, skipped_count)
            if error_count > 0:
                upsert_error_msg = f"{error_count} records had upsert errors, {skipped_count} skipped (null ID)"
                if all_errors:
                    upsert_error_msg += f". Errors: {'; '.join(all_errors[:5])}"
                # Append to existing error message if present (e.g., from partial fetch)
                if result["error_message"]:
                    result["error_message"] += f" | Upsert: {upsert_error_msg}"
                else:
                    result["error_message"] = upsert_error_msg

            logger.info(
                "Sync %s complete: %d fetched, %d upserted, %d errors, %d skipped (null ID)",
                entity_type,
                result["records_fetched"],
                upserted_count,
                error_count,
                skipped_count,
            )

    except Exception as e:
        result["status"] = "error"
        result["error_message"] = str(e)
        if all_errors:
            result["error_message"] += f". Previous errors: {'; '.join(all_errors[:3])}"
        logger.error("Sync %s failed: %s", entity_type, e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Finalize
    await _finalize_sync_metadata(db, meta_row, result, start_time, full_sync)
    await _insert_sync_log(db, entity_type, full_sync, started_at, result, start_time)

    return result


async def _finalize_sync_metadata(
    db: AsyncSession, meta_row, result: dict, start_time: float, full_sync: bool
):
    """Update sync_metadata after sync completes.

    Tries the main session first to avoid creating extra connections.
    Falls back to a separate session only if the main session fails.
    """
    from core.database import db_manager
    from models.sync_metadata_entries import Sync_metadata_entries

    entity_type = result.get("entity_type", "")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Calculate total elapsed time for the completed sync
    elapsed_s = time.time() - start_time
    elapsed_hours = int(elapsed_s) // 3600
    elapsed_minutes = (int(elapsed_s) % 3600) // 60
    elapsed_secs = int(elapsed_s) % 60
    if elapsed_hours > 0:
        elapsed_str = f"{elapsed_hours}h {elapsed_minutes}m {elapsed_secs}s"
    elif elapsed_minutes > 0:
        elapsed_str = f"{elapsed_minutes}m {elapsed_secs}s"
    else:
        elapsed_str = f"{elapsed_secs}s"

    update_values = {
        "sync_status": result["status"],
        "records_synced": result["records_fetched"],
        "last_sync_timestamp": now_str,
        "current_fetched": result["records_fetched"],
        "current_upserted": result["records_created"] + result["records_updated"],
        "error_message": result["error_message"][:2000] if result.get("error_message") else None,
        # Clear ETA fields on completion, store final timing
        "estimated_seconds_remaining": 0,
        "current_phase": f"done ({elapsed_str})",
    }
    if full_sync:
        update_values["last_full_sync"] = now_str

    # Clean up start time tracking
    _sync_start_times.pop(entity_type, None)

    # Try 1: Use main session with lightweight UPDATE (no extra connection)
    try:
        stmt = (
            update(Sync_metadata_entries)
            .where(Sync_metadata_entries.entity_type == entity_type)
            .values(**update_values)
        )
        await db.execute(stmt)
        await db.commit()
        return
    except Exception as e:
        logger.debug("Main session finalize failed for %s: %s, trying separate session", entity_type, e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Try 2: Separate session as fallback
    try:
        if db_manager.async_session_maker:
            async with db_manager.async_session_maker() as final_db:
                stmt = (
                    update(Sync_metadata_entries)
                    .where(Sync_metadata_entries.entity_type == entity_type)
                    .values(**update_values)
                )
                await final_db.execute(stmt)
                await final_db.commit()
    except Exception as e:
        logger.warning("Could not update sync_metadata after sync: %s", e)


async def _insert_sync_log(
    db: AsyncSession, entity_type: str, full_sync: bool,
    started_at: str, result: dict, start_time: float,
):
    """Insert a sync_log entry.

    Tries the main session first to avoid creating extra connections.
    Falls back to a separate session only if the main session fails.
    """
    from core.database import db_manager
    from models.sync_log_entries import Sync_log_entries

    elapsed_ms = int((time.time() - start_time) * 1000)

    log_data = dict(
        entity_type=entity_type,
        sync_type="full" if full_sync else "incremental",
        started_at=started_at,
        completed_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        records_fetched=result["records_fetched"],
        records_created=result["records_created"],
        records_updated=result["records_updated"],
        records_deleted=0,
        records_skipped_unchanged=result.get("records_skipped_unchanged", 0),
        sync_status=result["status"],
        error_message=(result.get("error_message") or "")[:2000] if result.get("error_message") else None,
        filter_used=result.get("_qualifier_used") or (f"client-side: modificationDate >= {result.get('_last_sync_ts', 'N/A')}" if not full_sync and result.get("_last_sync_ts") else None),
        carerix_query_time_ms=elapsed_ms,
    )

    # Try 1: Use main session (no extra connection)
    try:
        log_entry = Sync_log_entries(**log_data)
        db.add(log_entry)
        await db.commit()
        logger.info(
            "Sync log inserted for %s: status=%s, fetched=%d, created=%d, updated=%d",
            entity_type, result["status"], result["records_fetched"],
            result["records_created"], result["records_updated"],
        )
        return
    except Exception as e:
        logger.debug("Main session log insert failed for %s: %s, trying separate session", entity_type, e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Try 2: Separate session as fallback
    try:
        if db_manager.async_session_maker:
            async with db_manager.async_session_maker() as log_db:
                log_entry = Sync_log_entries(**log_data)
                log_db.add(log_entry)
                await log_db.commit()
                logger.info("Sync log inserted (fallback) for %s", entity_type)
    except Exception as e:
        logger.error("Could not insert sync_log: %s", e)


async def sync_all_entities(
    db: AsyncSession,
    full_sync: bool = False,
) -> Dict[str, Any]:
    """
    Sync all entity types from Carerix.

    Each entity gets its own fresh database session to prevent cascading
    transaction failures (if one entity fails, others still proceed).

    For full syncs, large entities (crx_jobs, crx_matches, crx_todos) are
    dispatched to their chunked sync functions to avoid timeouts.

    Returns dict with results per entity type.
    """
    from core.database import db_manager

    # Entities that use chunked sync for FULL syncs only (too large for single fetch).
    # For incremental syncs, all entities use sync_entity() with modificationDate filter.
    CHUNKED_ENTITIES = {"crx_jobs", "crx_matches", "crx_todos"}

    entity_types = [
        "companies",
        "employees",
        "crx_vacancies",
        "crx_publications",
        "crx_jobs",
        "crx_matches",
        "crx_todos",
    ]

    results = {}
    for entity_type in entity_types:
        logger.info("Starting sync for %s (full=%s)...", entity_type, full_sync)
        try:
            # Each entity gets its own session to isolate transaction failures
            if db_manager.async_session_maker:
                async with db_manager.async_session_maker() as entity_db:
                    try:
                        # Use chunked sync ONLY for full syncs on large entities.
                        # Incremental syncs always use sync_entity() with modificationDate filter.
                        if full_sync and entity_type in CHUNKED_ENTITIES:
                            logger.info(
                                "Using chunked sync for %s (full sync mode)",
                                entity_type,
                            )
                            if entity_type == "crx_jobs":
                                result = await sync_jobs_chunked(entity_db)
                            elif entity_type == "crx_matches":
                                result = await sync_matches_chunked(entity_db)
                            elif entity_type == "crx_todos":
                                result = await sync_todos_chunked(entity_db)
                            else:
                                result = await sync_entity(entity_db, entity_type, full_sync=full_sync)
                        else:
                            result = await sync_entity(entity_db, entity_type, full_sync=full_sync)
                        results[entity_type] = result
                    except Exception as e:
                        logger.error("Sync failed for %s: %s", entity_type, e)
                        results[entity_type] = {
                            "entity_type": entity_type,
                            "sync_type": "full" if full_sync else "incremental",
                            "records_fetched": 0,
                            "records_created": 0,
                            "records_updated": 0,
                            "status": "error",
                            "error_message": str(e),
                        }
            else:
                # Fallback: use the provided session (less safe)
                if full_sync and entity_type in CHUNKED_ENTITIES:
                    if entity_type == "crx_jobs":
                        result = await sync_jobs_chunked(db)
                    elif entity_type == "crx_matches":
                        result = await sync_matches_chunked(db)
                    elif entity_type == "crx_todos":
                        result = await sync_todos_chunked(db)
                    else:
                        result = await sync_entity(db, entity_type, full_sync=full_sync)
                else:
                    result = await sync_entity(db, entity_type, full_sync=full_sync)
                results[entity_type] = result
        except Exception as e:
            logger.error("Session creation failed for %s: %s", entity_type, e)
            results[entity_type] = {
                "entity_type": entity_type,
                "sync_type": "full" if full_sync else "incremental",
                "records_fetched": 0,
                "records_created": 0,
                "records_updated": 0,
                "status": "error",
                "error_message": f"Session error: {str(e)}",
            }

    return results


async def get_sync_status(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get current sync status for all entity types."""
    from models.sync_metadata_entries import Sync_metadata_entries

    stmt = select(Sync_metadata_entries).order_by(Sync_metadata_entries.entity_type)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    status_list = []
    for row in rows:
        total_expected = getattr(row, "total_expected", 0) or 0
        current_fetched = getattr(row, "current_fetched", 0) or 0
        current_upserted = getattr(row, "current_upserted", 0) or 0
        avg_ms = getattr(row, "avg_ms_per_record", None)
        est_remaining = getattr(row, "estimated_seconds_remaining", None)
        phase = getattr(row, "current_phase", None)
        sync_started = getattr(row, "sync_started_at", None)

        # Calculate progress percentage
        progress_pct = 0.0
        if total_expected > 0:
            if phase == "upserting" and current_fetched > 0:
                # Fetching is ~90% of the work, upserting is ~10%
                fetch_pct = 90.0
                upsert_pct = (current_upserted / current_fetched) * 10.0 if current_fetched > 0 else 0
                progress_pct = min(100.0, fetch_pct + upsert_pct)
            else:
                progress_pct = min(100.0, (current_fetched / total_expected) * 100.0)

        # Format ETA as human-readable string
        eta_display = None
        if est_remaining is not None and est_remaining > 0 and row.sync_status == "running":
            hours = est_remaining // 3600
            minutes = (est_remaining % 3600) // 60
            secs = est_remaining % 60
            if hours > 0:
                eta_display = f"{hours}h {minutes}m"
            elif minutes > 0:
                eta_display = f"{minutes}m {secs}s"
            else:
                eta_display = f"{secs}s"

        # Calculate elapsed time
        elapsed_display = None
        if sync_started and row.sync_status == "running":
            try:
                started_dt = datetime.fromisoformat(sync_started.replace("Z", "+00:00"))
                elapsed_s = (datetime.now(timezone.utc) - started_dt).total_seconds()
                e_hours = int(elapsed_s) // 3600
                e_minutes = (int(elapsed_s) % 3600) // 60
                e_secs = int(elapsed_s) % 60
                if e_hours > 0:
                    elapsed_display = f"{e_hours}h {e_minutes}m {e_secs}s"
                elif e_minutes > 0:
                    elapsed_display = f"{e_minutes}m {e_secs}s"
                else:
                    elapsed_display = f"{e_secs}s"
            except Exception:
                pass

        # Speed: records per minute
        speed_per_min = None
        if avg_ms is not None and avg_ms > 0:
            speed_per_min = round(60000 / avg_ms, 1)

        entry = {
            "entity_type": row.entity_type,
            "last_sync_timestamp": row.last_sync_timestamp,
            "last_full_sync": row.last_full_sync,
            "records_synced": row.records_synced,
            "sync_status": row.sync_status,
            "error_message": row.error_message,
            "total_expected": total_expected,
            "current_fetched": current_fetched,
            "current_upserted": current_upserted,
            # ETA fields
            "sync_started_at": sync_started,
            "current_phase": phase,
            "progress_pct": round(progress_pct, 1),
            "avg_ms_per_record": round(avg_ms, 1) if avg_ms else None,
            "speed_records_per_min": speed_per_min,
            "estimated_seconds_remaining": est_remaining,
            "eta_display": eta_display,
            "elapsed_display": elapsed_display,
        }
        status_list.append(entry)

    return status_list


async def get_sync_log(
    db: AsyncSession,
    entity_type: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Get sync audit trail."""
    from models.sync_log_entries import Sync_log_entries

    stmt = select(Sync_log_entries).order_by(Sync_log_entries.id.desc()).limit(limit)
    if entity_type:
        stmt = stmt.where(Sync_log_entries.entity_type == entity_type)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": row.entity_type,
            "sync_type": row.sync_type,
            "started_at": row.started_at,
            "completed_at": row.completed_at,
            "records_fetched": row.records_fetched,
            "records_created": row.records_created,
            "records_updated": row.records_updated,
            "records_deleted": row.records_deleted,
            "records_skipped_unchanged": getattr(row, "records_skipped_unchanged", 0) or 0,
            "sync_status": row.sync_status,
            "error_message": row.error_message,
            "filter_used": getattr(row, "filter_used", None),
            "carerix_query_time_ms": row.carerix_query_time_ms,
        }
        for row in rows
    ]


async def get_carerix_live_counts(
    token: str,
    since: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get live record counts from Carerix for all entity types.
    Optionally filter by modificationDate using server-side qualifier.

    Args:
        token: OAuth2 access token.
        since: Optional ISO date string to filter by modificationDate >=.

    Returns:
        Dict mapping entity_type to {total, filtered, query_name}.
    """
    qualifier = None
    if since:
        sync_dt = _parse_carerix_datetime(since)
        if sync_dt:
            date_str = sync_dt.strftime("%Y-%m-%d %H:%M:%S")
            qualifier = f"modificationDate >= (NSCalendarDate)'{date_str} Etc/GMT'"

    results = {}
    timeout = httpx.Timeout(connect=15.0, read=30.0, write=15.0, pool=15.0)

    async with httpx.AsyncClient(timeout=timeout) as http_client:
        for entity_type, config in ENTITY_QUERIES.items():
            query_name = config["query_name"]
            entry: Dict[str, Any] = {
                "query_name": query_name,
                "total": 0,
                "filtered": None,
                "error": None,
            }

            # Get total count (no qualifier)
            try:
                total_query = "{ %s(pageable: {page: 0, size: 1}) { totalElements } }" % query_name
                resp = await http_client.post(
                    CARERIX_GRAPHQL_URL,
                    json={"query": total_query},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )
                data = resp.json()
                if "errors" not in data:
                    entry["total"] = data.get("data", {}).get(query_name, {}).get("totalElements", 0)
                else:
                    entry["error"] = str(data["errors"][0].get("message", ""))[:200]
            except Exception as e:
                entry["error"] = str(e)[:200]

            # Get filtered count (with qualifier) if requested
            if qualifier:
                try:
                    filtered_query = (
                        "query($q: String) { %s(pageable: {page: 0, size: 1}, qualifier: $q) { totalElements } }"
                        % query_name
                    )
                    resp = await http_client.post(
                        CARERIX_GRAPHQL_URL,
                        json={"query": filtered_query, "variables": {"q": qualifier}},
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json",
                        },
                    )
                    data = resp.json()
                    if "errors" not in data:
                        entry["filtered"] = data.get("data", {}).get(query_name, {}).get("totalElements", 0)
                except Exception:
                    pass  # filtered count is optional

            results[entity_type] = entry

    return results


async def test_entity_query(
    token: str, entity_type: str
) -> Dict[str, Any]:
    """
    Test a single entity's GraphQL query with a small page to diagnose errors.
    Returns detailed diagnostic info.
    """
    config = ENTITY_QUERIES.get(entity_type)
    if not config:
        return {"entity_type": entity_type, "error": f"Unknown entity type: {entity_type}"}

    result = {
        "entity_type": entity_type,
        "query_name": config["query_name"],
        "full_fields_ok": False,
        "minimal_fields_ok": False,
        "total_elements": 0,
        "sample_items": [],
        "full_fields_error": None,
        "minimal_fields_error": None,
        "query_time_ms": 0,
    }

    # Test with full fields
    start = time.time()
    page_data, error = await _fetch_carerix_page(
        token, entity_type, page=0, page_size=2, use_minimal=False
    )
    result["query_time_ms"] = int((time.time() - start) * 1000)

    if page_data:
        result["full_fields_ok"] = True
        result["total_elements"] = page_data.get("totalElements", 0)
        result["sample_items"] = page_data.get("items", [])[:2]
        if error:
            result["full_fields_error"] = error  # partial error
    else:
        result["full_fields_error"] = error

        # Test with minimal fields
        start2 = time.time()
        min_data, min_error = await _fetch_carerix_page(
            token, entity_type, page=0, page_size=2, use_minimal=True
        )
        result["query_time_ms"] += int((time.time() - start2) * 1000)

        if min_data:
            result["minimal_fields_ok"] = True
            result["total_elements"] = min_data.get("totalElements", 0)
            result["sample_items"] = min_data.get("items", [])[:2]
        else:
            result["minimal_fields_error"] = min_error

    return result


# ---------------------------------------------------------------------------
# Chunked Sync — Breaks large entity sets into monthly date-range chunks
# to avoid timeouts and memory issues. Each chunk fetches all pages for
# that month and upserts immediately.
#
# crx_todos uses crTaskPage (CRTask entity) which returns only tasks
# (~186K records) — no client-side filtering needed.
# ---------------------------------------------------------------------------

async def sync_matches_chunked(
    db: AsyncSession,
    start_year: int = 2010,
    start_month: int = 1,
) -> Dict[str, Any]:
    """
    Sync crx_matches using monthly date-range chunks.

    The Carerix CRMatch entity has ~50K records with composite IDs (e.g. '14.25').
    Fetching all at once is too slow. We break the fetch into monthly chunks
    using creationDate qualifiers, and upsert each chunk immediately.

    Args:
        db: Database session
        start_year: Year to start syncing from (default: 2010)
        start_month: Month to start syncing from (default: 1)

    Returns:
        Dict with overall sync results
    """
    from models.sync_metadata_entries import Sync_metadata_entries
    from models.sync_log_entries import Sync_log_entries
    from models.crx_matches import Crx_matches
    from core.database import db_manager
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    entity_type = "crx_matches"
    start_time = time.time()
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Register start time for ETA calculation
    _sync_start_times[entity_type] = start_time

    result = {
        "entity_type": entity_type,
        "sync_type": "full_chunked",
        "records_fetched": 0,
        "records_created": 0,
        "records_updated": 0,
        "records_skipped_unchanged": 0,
        "status": "running",
        "error_message": None,
        "chunks_completed": 0,
        "chunks_total": 0,
    }

    mapper = FIELD_MAPPERS["crx_matches"]
    model_class = Crx_matches
    model_columns = {c.name for c in model_class.__table__.columns}
    update_columns = [
        c.name for c in model_class.__table__.columns
        if c.name not in ("id", "carerix_id")
    ]

    # Update or create sync_metadata to "running"
    meta_row = None
    try:
        stmt = select(Sync_metadata_entries).where(
            Sync_metadata_entries.entity_type == entity_type
        )
        meta_result = await db.execute(stmt)
        meta_row = meta_result.scalar_one_or_none()
        if meta_row:
            meta_row.sync_status = "running"
            meta_row.error_message = None
            meta_row.total_expected = 0
            meta_row.current_fetched = 0
            meta_row.current_upserted = 0
            meta_row.sync_started_at = started_at
            meta_row.avg_ms_per_record = None
            meta_row.estimated_seconds_remaining = None
            meta_row.current_phase = "chunked_fetch"
            await db.commit()
        else:
            meta_row = Sync_metadata_entries(
                entity_type=entity_type,
                sync_status="running",
                records_synced=0,
                total_expected=0,
                current_fetched=0,
                current_upserted=0,
                sync_started_at=started_at,
                current_phase="chunked_fetch",
            )
            db.add(meta_row)
            await db.commit()
            await db.refresh(meta_row)
    except Exception as e:
        logger.warning("Could not update sync_metadata for chunked matches: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Get access token
    token = await _get_access_token()
    if not token:
        result["status"] = "error"
        result["error_message"] = "Failed to obtain Carerix access token"
        await _finalize_sync_metadata(db, meta_row, result, start_time, True)
        await _insert_sync_log(db, entity_type, True, started_at, result, start_time)
        return result

    # Clear cancellation flag
    clear_sync_cancelled(entity_type)

    # Build monthly chunks from start_year/start_month to current month
    now = datetime.now(timezone.utc)
    chunks: list[tuple[str, str]] = []  # (label, qualifier)

    year, month = start_year, start_month
    while year < now.year or (year == now.year and month <= now.month):
        next_month = month + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year = year + 1

        date_start = f"{year}-{month:02d}-01 00:00:00"
        date_end = f"{next_year}-{next_month:02d}-01 00:00:00"
        label = f"{year}-{month:02d}"

        qualifier = (
            f"creationDate >= (NSCalendarDate)'{date_start} Etc/GMT' "
            f"AND creationDate < (NSCalendarDate)'{date_end} Etc/GMT'"
        )
        chunks.append((label, qualifier))

        month = next_month
        year = next_year

    result["chunks_total"] = len(chunks)
    logger.info(
        "crx_matches chunked sync: %d monthly chunks from %d-%02d to %d-%02d",
        len(chunks), start_year, start_month, now.year, now.month,
    )

    all_errors: list[str] = []
    total_fetched = 0
    total_upserted = 0
    _token_refresh_count = 0

    for chunk_idx, (label, qualifier) in enumerate(chunks):
        if is_sync_cancelled(entity_type):
            logger.info("Chunked matches sync cancelled at chunk %s", label)
            result["status"] = "cancelled"
            result["error_message"] = f"Cancelled at chunk {label}"
            break

        logger.info(
            "Chunk %d/%d [%s]: starting fetch...",
            chunk_idx + 1, len(chunks), label,
        )

        # Fetch all pages for this month
        chunk_items: list[dict] = []
        page = 0
        chunk_total = 0
        consecutive_failures = 0
        page_size = 200

        while page < 500:  # Safety: 500 pages * 200 = 100K per month
            if is_sync_cancelled(entity_type):
                break

            page_data, page_error = await _fetch_carerix_page(
                token, entity_type, page, page_size=page_size,
                qualifier=qualifier,
            )

            if page_error:
                # Handle 401 token expiry
                if page_error.startswith(_AUTH_ERROR_PREFIX):
                    if _token_refresh_count < 100:
                        _token_refresh_count += 1
                        logger.warning(
                            "Token expired during matches chunk %s page %d, refreshing...",
                            label, page,
                        )
                        await asyncio.sleep(1)
                        token = await _get_access_token()
                        if token:
                            consecutive_failures = 0
                            continue
                        else:
                            all_errors.append(f"Token refresh failed at chunk {label}")
                            break

                consecutive_failures += 1
                if consecutive_failures >= 5:
                    err = f"Chunk {label}: {consecutive_failures} consecutive failures at page {page}"
                    logger.warning(err)
                    all_errors.append(err)
                    break

                await asyncio.sleep(2 * consecutive_failures)
                continue

            if not page_data:
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    break
                await asyncio.sleep(2)
                continue

            # Success
            consecutive_failures = 0
            items = page_data.get("items", [])
            chunk_total = page_data.get("totalElements", 0)
            total_pages = page_data.get("totalPages", 1)

            if not items:
                break

            chunk_items.extend(items)
            page += 1

            # Intra-chunk progress update (every page)
            await _update_sync_progress(
                db, entity_type,
                total_expected=len(chunks),
                current_fetched=total_fetched + len(chunk_items),
                current_upserted=total_upserted,
                phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}] pg {page}/{total_pages}",
            )

            if page >= total_pages:
                break

            # Throttle
            await asyncio.sleep(0.3)

        total_fetched += len(chunk_items)

        logger.info(
            "Chunk %d/%d [%s]: fetched %d records (chunk total: %d)",
            chunk_idx + 1, len(chunks), label,
            len(chunk_items), chunk_total,
        )

        # Upsert items in batches
        if chunk_items:
            mapped_records: list[dict] = []
            for item in chunk_items:
                try:
                    mapped = mapper(item)
                    if mapped.get("carerix_id") is None:
                        continue
                    safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}
                    mapped_records.append(safe_mapped)
                except Exception as e:
                    all_errors.append(f"Mapping error in matches chunk {label}: {str(e)[:100]}")

            # Batch upsert (500 per batch)
            batch_size = 500
            for i in range(0, len(mapped_records), batch_size):
                batch = mapped_records[i:i + batch_size]
                try:
                    async with db_manager.async_session_maker() as batch_db:
                        upsert_stmt = pg_insert(model_class).values(batch)
                        update_dict = {
                            col: upsert_stmt.excluded[col] for col in update_columns
                            if col in {k for row in batch for k in row.keys()}
                        }
                        if update_dict:
                            upsert_stmt = upsert_stmt.on_conflict_do_update(
                                index_elements=["carerix_id"],
                                set_=update_dict,
                            )
                        else:
                            upsert_stmt = upsert_stmt.on_conflict_do_nothing(
                                index_elements=["carerix_id"],
                            )
                        await asyncio.wait_for(batch_db.execute(upsert_stmt), timeout=120)
                        await batch_db.commit()
                    total_upserted += len(batch)
                except Exception as e:
                    err = f"Upsert error in matches chunk {label}: {type(e).__name__}: {str(e)[:200]}"
                    logger.warning(err)
                    all_errors.append(err)
                    # Fall back to individual inserts
                    for record in batch:
                        try:
                            async with db_manager.async_session_maker() as rec_db:
                                s = pg_insert(model_class).values(**record)
                                ud = {c: s.excluded[c] for c in update_columns if c in record}
                                if ud:
                                    s = s.on_conflict_do_update(index_elements=["carerix_id"], set_=ud)
                                else:
                                    s = s.on_conflict_do_nothing(index_elements=["carerix_id"])
                                await rec_db.execute(s)
                                await rec_db.commit()
                            total_upserted += 1
                        except Exception as inner_e:
                            all_errors.append(f"Individual upsert error: {str(inner_e)[:100]}")

        result["chunks_completed"] = chunk_idx + 1

        # Update progress
        await _update_sync_progress(
            db, entity_type,
            total_expected=len(chunks),
            current_fetched=total_fetched,
            current_upserted=total_upserted,
            force=True,
            phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}]",
        )

    # Finalize results
    result["records_fetched"] = total_fetched
    result["records_created"] = total_upserted

    if result["status"] == "running":
        result["status"] = "success"

    if all_errors:
        result["error_message"] = f"{len(all_errors)} errors. First 5: {'; '.join(all_errors[:5])}"

    logger.info(
        "crx_matches chunked sync complete: %d chunks, %d fetched, %d upserted, %d errors",
        result["chunks_completed"], total_fetched,
        total_upserted, len(all_errors),
    )

    await _finalize_sync_metadata(db, meta_row, result, start_time, True)
    await _insert_sync_log(db, entity_type, True, started_at, result, start_time)

    return result


async def sync_todos_chunked(
    db: AsyncSession,
    start_year: int = 2010,
    start_month: int = 1,
) -> Dict[str, Any]:
    """
    Sync crx_todos (tasks) using monthly date-range chunks.

    Uses the crTaskPage GraphQL endpoint which returns only CRTask records
    (~186K total, ~54K in 2025). No client-side filtering needed since
    crTaskPage already returns only tasks (isTask=1, toDoTypeKey=0).

    To avoid timeouts on large months, we break the fetch into monthly
    chunks using creationDate qualifiers.

    Args:
        db: Database session
        start_year: Year to start syncing from (default: 2010)
        start_month: Month to start syncing from (default: 1)

    Returns:
        Dict with overall sync results
    """
    from models.sync_metadata_entries import Sync_metadata_entries
    from models.sync_log_entries import Sync_log_entries
    from models.crx_todos import Crx_todos
    from core.database import db_manager
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    entity_type = "crx_todos"
    start_time = time.time()
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Register start time for ETA calculation
    _sync_start_times[entity_type] = start_time

    result = {
        "entity_type": entity_type,
        "sync_type": "full_chunked",
        "records_fetched": 0,
        "records_created": 0,
        "records_updated": 0,
        "records_skipped_unchanged": 0,
        "status": "running",
        "error_message": None,
        "chunks_completed": 0,
        "chunks_total": 0,
        "tasks_found": 0,
    }

    mapper = FIELD_MAPPERS["crx_todos"]
    model_class = Crx_todos
    model_columns = {c.name for c in model_class.__table__.columns}
    update_columns = [
        c.name for c in model_class.__table__.columns
        if c.name not in ("id", "carerix_id")
    ]

    # Update or create sync_metadata to "running"
    meta_row = None
    try:
        stmt = select(Sync_metadata_entries).where(
            Sync_metadata_entries.entity_type == entity_type
        )
        meta_result = await db.execute(stmt)
        meta_row = meta_result.scalar_one_or_none()
        if meta_row:
            meta_row.sync_status = "running"
            meta_row.error_message = None
            meta_row.total_expected = 0
            meta_row.current_fetched = 0
            meta_row.current_upserted = 0
            meta_row.sync_started_at = started_at
            meta_row.avg_ms_per_record = None
            meta_row.estimated_seconds_remaining = None
            meta_row.current_phase = "chunked_fetch"
            await db.commit()
        else:
            meta_row = Sync_metadata_entries(
                entity_type=entity_type,
                sync_status="running",
                records_synced=0,
                total_expected=0,
                current_fetched=0,
                current_upserted=0,
                sync_started_at=started_at,
                current_phase="chunked_fetch",
            )
            db.add(meta_row)
            await db.commit()
            await db.refresh(meta_row)
    except Exception as e:
        logger.warning("Could not update sync_metadata for chunked todos: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Get access token
    token = await _get_access_token()
    if not token:
        result["status"] = "error"
        result["error_message"] = "Failed to obtain Carerix access token"
        await _finalize_sync_metadata(db, meta_row, result, start_time, True)
        await _insert_sync_log(db, entity_type, True, started_at, result, start_time)
        return result

    # Clear cancellation flag
    clear_sync_cancelled(entity_type)

    # Build monthly chunks from start_year/start_month to current month
    now = datetime.now(timezone.utc)
    chunks: list[tuple[str, str]] = []  # (label, qualifier)

    year, month = start_year, start_month
    while year < now.year or (year == now.year and month <= now.month):
        next_month = month + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year = year + 1

        date_start = f"{year}-{month:02d}-01 00:00:00"
        date_end = f"{next_year}-{next_month:02d}-01 00:00:00"
        label = f"{year}-{month:02d}"

        qualifier = (
            f"creationDate >= (NSCalendarDate)'{date_start} Etc/GMT' "
            f"AND creationDate < (NSCalendarDate)'{date_end} Etc/GMT'"
        )
        chunks.append((label, qualifier))

        month = next_month
        year = next_year

    result["chunks_total"] = len(chunks)
    logger.info(
        "crx_todos chunked sync: %d monthly chunks from %d-%02d to %d-%02d",
        len(chunks), start_year, start_month, now.year, now.month,
    )

    all_errors: list[str] = []
    total_raw_fetched = 0
    total_tasks_found = 0
    total_upserted = 0
    _token_refresh_count = 0

    for chunk_idx, (label, qualifier) in enumerate(chunks):
        if is_sync_cancelled(entity_type):
            logger.info("Chunked todos sync cancelled at chunk %s", label)
            result["status"] = "cancelled"
            result["error_message"] = f"Cancelled at chunk {label}"
            break

        logger.info(
            "Chunk %d/%d [%s]: starting fetch...",
            chunk_idx + 1, len(chunks), label,
        )

        # Fetch all pages for this month
        chunk_items: list[dict] = []
        page = 0
        chunk_total = 0
        consecutive_failures = 0
        page_size = 200  # Use 200 instead of 1000 to avoid 504 timeouts on large months

        while page < 500:  # Safety: 500 pages * 200 = 100K per month
            if is_sync_cancelled(entity_type):
                break

            page_data, page_error = await _fetch_carerix_page(
                token, entity_type, page, page_size=page_size,
                qualifier=qualifier, sort_property="toDoID",
            )

            if page_error:
                # Handle 401 token expiry
                if page_error.startswith(_AUTH_ERROR_PREFIX):
                    if _token_refresh_count < 100:
                        _token_refresh_count += 1
                        logger.warning(
                            "Token expired during chunk %s page %d, refreshing...",
                            label, page,
                        )
                        await asyncio.sleep(1)
                        token = await _get_access_token()
                        if token:
                            consecutive_failures = 0
                            continue
                        else:
                            all_errors.append(f"Token refresh failed at chunk {label}")
                            break

                consecutive_failures += 1
                if consecutive_failures >= 5:
                    err = f"Chunk {label}: {consecutive_failures} consecutive failures at page {page}"
                    logger.warning(err)
                    all_errors.append(err)
                    break

                await asyncio.sleep(2 * consecutive_failures)
                continue

            if not page_data:
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    break
                await asyncio.sleep(2)
                continue

            # Success
            consecutive_failures = 0
            items = page_data.get("items", [])
            chunk_total = page_data.get("totalElements", 0)
            total_pages = page_data.get("totalPages", 1)

            if not items:
                break

            chunk_items.extend(items)
            page += 1

            # Intra-chunk progress update (every page)
            await _update_sync_progress(
                db, entity_type,
                total_expected=len(chunks),
                current_fetched=total_raw_fetched + len(chunk_items),
                current_upserted=total_upserted,
                phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}] pg {page}/{total_pages}",
            )

            if page >= total_pages:
                break

            # Throttle
            await asyncio.sleep(0.3)

        total_raw_fetched += len(chunk_items)
        # crTaskPage already returns only tasks — no client-side filtering needed
        total_tasks_found += len(chunk_items)

        logger.info(
            "Chunk %d/%d [%s]: fetched %d tasks (chunk total: %d)",
            chunk_idx + 1, len(chunks), label,
            len(chunk_items), chunk_total,
        )

        # Upsert task items in batches
        if chunk_items:
            mapped_records: list[dict] = []
            for item in chunk_items:
                try:
                    mapped = mapper(item)
                    if mapped.get("carerix_id") is None:
                        continue
                    safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}
                    mapped_records.append(safe_mapped)
                except Exception as e:
                    all_errors.append(f"Mapping error in chunk {label}: {str(e)[:100]}")

            # Batch upsert (500 per batch)
            batch_size = 500
            for i in range(0, len(mapped_records), batch_size):
                batch = mapped_records[i:i + batch_size]
                try:
                    async with db_manager.async_session_maker() as batch_db:
                        upsert_stmt = pg_insert(model_class).values(batch)
                        update_dict = {
                            col: upsert_stmt.excluded[col] for col in update_columns
                            if col in {k for row in batch for k in row.keys()}
                        }
                        if update_dict:
                            upsert_stmt = upsert_stmt.on_conflict_do_update(
                                index_elements=["carerix_id"],
                                set_=update_dict,
                            )
                        else:
                            upsert_stmt = upsert_stmt.on_conflict_do_nothing(
                                index_elements=["carerix_id"],
                            )
                        await asyncio.wait_for(batch_db.execute(upsert_stmt), timeout=120)
                        await batch_db.commit()
                    total_upserted += len(batch)
                except Exception as e:
                    err = f"Upsert error in chunk {label}: {type(e).__name__}: {str(e)[:200]}"
                    logger.warning(err)
                    all_errors.append(err)
                    # Fall back to individual inserts
                    for record in batch:
                        try:
                            async with db_manager.async_session_maker() as rec_db:
                                s = pg_insert(model_class).values(**record)
                                ud = {c: s.excluded[c] for c in update_columns if c in record}
                                if ud:
                                    s = s.on_conflict_do_update(index_elements=["carerix_id"], set_=ud)
                                else:
                                    s = s.on_conflict_do_nothing(index_elements=["carerix_id"])
                                await rec_db.execute(s)
                                await rec_db.commit()
                            total_upserted += 1
                        except Exception as inner_e:
                            all_errors.append(f"Individual upsert error: {str(inner_e)[:100]}")

        result["chunks_completed"] = chunk_idx + 1

        # Update progress
        await _update_sync_progress(
            db, entity_type,
            total_expected=len(chunks),
            current_fetched=total_raw_fetched,
            current_upserted=total_upserted,
            force=True,
            phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}]",
        )

    # Finalize results
    result["records_fetched"] = total_tasks_found
    result["records_created"] = total_upserted
    result["tasks_found"] = total_tasks_found

    if result["status"] == "running":
        result["status"] = "success"

    if all_errors:
        result["error_message"] = f"{len(all_errors)} errors. First 5: {'; '.join(all_errors[:5])}"

    logger.info(
        "crx_todos chunked sync complete: %d chunks, %d raw fetched, %d tasks found, %d upserted, %d errors",
        result["chunks_completed"], total_raw_fetched, total_tasks_found,
        total_upserted, len(all_errors),
    )

    await _finalize_sync_metadata(db, meta_row, result, start_time, True)
    await _insert_sync_log(db, entity_type, True, started_at, result, start_time)

    return result


async def sync_jobs_chunked(
    db: AsyncSession,
    start_year: int = 2010,
    start_month: int = 1,
) -> Dict[str, Any]:
    """
    Sync crx_jobs using monthly date-range chunks.

    The Carerix CRJob entity has ~20K+ records. Fetching all at once can
    time out or get stuck. We break the fetch into monthly chunks using
    creationDate qualifiers, and upsert each chunk immediately.

    Args:
        db: Database session
        start_year: Year to start syncing from (default: 2010)
        start_month: Month to start syncing from (default: 1)

    Returns:
        Dict with overall sync results
    """
    from models.sync_metadata_entries import Sync_metadata_entries
    from models.sync_log_entries import Sync_log_entries
    from models.crx_jobs import Crx_jobs
    from core.database import db_manager
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    entity_type = "crx_jobs"
    start_time = time.time()
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Register start time for ETA calculation
    _sync_start_times[entity_type] = start_time

    result = {
        "entity_type": entity_type,
        "sync_type": "full_chunked",
        "records_fetched": 0,
        "records_created": 0,
        "records_updated": 0,
        "records_skipped_unchanged": 0,
        "status": "running",
        "error_message": None,
        "chunks_completed": 0,
        "chunks_total": 0,
    }

    mapper = FIELD_MAPPERS["crx_jobs"]
    model_class = Crx_jobs
    model_columns = {c.name for c in model_class.__table__.columns}
    update_columns = [
        c.name for c in model_class.__table__.columns
        if c.name not in ("id", "carerix_id")
    ]

    # Update or create sync_metadata to "running"
    meta_row = None
    try:
        stmt = select(Sync_metadata_entries).where(
            Sync_metadata_entries.entity_type == entity_type
        )
        meta_result = await db.execute(stmt)
        meta_row = meta_result.scalar_one_or_none()
        if meta_row:
            meta_row.sync_status = "running"
            meta_row.error_message = None
            meta_row.total_expected = 0
            meta_row.current_fetched = 0
            meta_row.current_upserted = 0
            meta_row.sync_started_at = started_at
            meta_row.avg_ms_per_record = None
            meta_row.estimated_seconds_remaining = None
            meta_row.current_phase = "chunked_fetch"
            await db.commit()
        else:
            meta_row = Sync_metadata_entries(
                entity_type=entity_type,
                sync_status="running",
                records_synced=0,
                total_expected=0,
                current_fetched=0,
                current_upserted=0,
                sync_started_at=started_at,
                current_phase="chunked_fetch",
            )
            db.add(meta_row)
            await db.commit()
            await db.refresh(meta_row)
    except Exception as e:
        logger.warning("Could not update sync_metadata for chunked jobs: %s", e)
        try:
            await db.rollback()
        except Exception:
            pass

    # Get access token
    token = await _get_access_token()
    if not token:
        result["status"] = "error"
        result["error_message"] = "Failed to obtain Carerix access token"
        await _finalize_sync_metadata(db, meta_row, result, start_time, True)
        await _insert_sync_log(db, entity_type, True, started_at, result, start_time)
        return result

    # Clear cancellation flag
    clear_sync_cancelled(entity_type)

    # Build monthly chunks from start_year/start_month to current month
    now = datetime.now(timezone.utc)
    chunks: list[tuple[str, str]] = []  # (label, qualifier)

    year, month = start_year, start_month
    while year < now.year or (year == now.year and month <= now.month):
        next_month = month + 1
        next_year = year
        if next_month > 12:
            next_month = 1
            next_year = year + 1

        date_start = f"{year}-{month:02d}-01 00:00:00"
        date_end = f"{next_year}-{next_month:02d}-01 00:00:00"
        label = f"{year}-{month:02d}"

        qualifier = (
            f"creationDate >= (NSCalendarDate)'{date_start} Etc/GMT' "
            f"AND creationDate < (NSCalendarDate)'{date_end} Etc/GMT'"
        )
        chunks.append((label, qualifier))

        month = next_month
        year = next_year

    result["chunks_total"] = len(chunks)
    logger.info(
        "crx_jobs chunked sync: %d monthly chunks from %d-%02d to %d-%02d",
        len(chunks), start_year, start_month, now.year, now.month,
    )

    all_errors: list[str] = []
    total_fetched = 0
    total_upserted = 0
    _token_refresh_count = 0

    for chunk_idx, (label, qualifier) in enumerate(chunks):
        if is_sync_cancelled(entity_type):
            logger.info("Chunked jobs sync cancelled at chunk %s", label)
            result["status"] = "cancelled"
            result["error_message"] = f"Cancelled at chunk {label}"
            break

        logger.info(
            "Jobs chunk %d/%d [%s]: starting fetch...",
            chunk_idx + 1, len(chunks), label,
        )

        # Fetch all pages for this month
        chunk_items: list[dict] = []
        page = 0
        chunk_total = 0
        consecutive_failures = 0
        page_size = 200

        while page < 500:  # Safety: 500 pages * 200 = 100K per month
            if is_sync_cancelled(entity_type):
                break

            page_data, page_error = await _fetch_carerix_page(
                token, entity_type, page, page_size=page_size,
                qualifier=qualifier, sort_property="jobID",
            )

            if page_error:
                # Handle 401 token expiry
                if page_error.startswith(_AUTH_ERROR_PREFIX):
                    if _token_refresh_count < 100:
                        _token_refresh_count += 1
                        logger.warning(
                            "Token expired during jobs chunk %s page %d, refreshing...",
                            label, page,
                        )
                        await asyncio.sleep(1)
                        token = await _get_access_token()
                        if token:
                            consecutive_failures = 0
                            continue
                        else:
                            all_errors.append(f"Token refresh failed at chunk {label}")
                            break

                consecutive_failures += 1
                if consecutive_failures >= 5:
                    err = f"Jobs chunk {label}: {consecutive_failures} consecutive failures at page {page}"
                    logger.warning(err)
                    all_errors.append(err)
                    break

                await asyncio.sleep(2 * consecutive_failures)
                continue

            if not page_data:
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    break
                await asyncio.sleep(2)
                continue

            # Success
            consecutive_failures = 0
            items = page_data.get("items", [])
            chunk_total = page_data.get("totalElements", 0)
            total_pages = page_data.get("totalPages", 1)

            if not items:
                break

            chunk_items.extend(items)
            page += 1

            # Intra-chunk progress update
            await _update_sync_progress(
                db, entity_type,
                total_expected=len(chunks),
                current_fetched=total_fetched + len(chunk_items),
                current_upserted=total_upserted,
                phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}] pg {page}/{total_pages}",
            )

            if page >= total_pages:
                break

            # Throttle
            await asyncio.sleep(0.3)

        total_fetched += len(chunk_items)

        logger.info(
            "Jobs chunk %d/%d [%s]: fetched %d records (chunk total: %d)",
            chunk_idx + 1, len(chunks), label,
            len(chunk_items), chunk_total,
        )

        # Upsert items in batches
        if chunk_items:
            mapped_records: list[dict] = []
            for item in chunk_items:
                try:
                    mapped = mapper(item)
                    if mapped.get("carerix_id") is None:
                        continue
                    safe_mapped = {k: v for k, v in mapped.items() if k in model_columns}
                    mapped_records.append(safe_mapped)
                except Exception as e:
                    all_errors.append(f"Mapping error in jobs chunk {label}: {str(e)[:100]}")

            # Batch upsert (500 per batch)
            batch_size = 500
            for i in range(0, len(mapped_records), batch_size):
                batch = mapped_records[i:i + batch_size]
                try:
                    async with db_manager.async_session_maker() as batch_db:
                        upsert_stmt = pg_insert(model_class).values(batch)
                        update_dict = {
                            col: upsert_stmt.excluded[col] for col in update_columns
                            if col in {k for row in batch for k in row.keys()}
                        }
                        if update_dict:
                            upsert_stmt = upsert_stmt.on_conflict_do_update(
                                index_elements=["carerix_id"],
                                set_=update_dict,
                            )
                        else:
                            upsert_stmt = upsert_stmt.on_conflict_do_nothing(
                                index_elements=["carerix_id"],
                            )
                        await asyncio.wait_for(batch_db.execute(upsert_stmt), timeout=120)
                        await batch_db.commit()
                    total_upserted += len(batch)
                except Exception as e:
                    err = f"Upsert error in jobs chunk {label}: {type(e).__name__}: {str(e)[:200]}"
                    logger.warning(err)
                    all_errors.append(err)
                    # Fall back to individual inserts
                    for record in batch:
                        try:
                            async with db_manager.async_session_maker() as rec_db:
                                s = pg_insert(model_class).values(**record)
                                ud = {c: s.excluded[c] for c in update_columns if c in record}
                                if ud:
                                    s = s.on_conflict_do_update(index_elements=["carerix_id"], set_=ud)
                                else:
                                    s = s.on_conflict_do_nothing(index_elements=["carerix_id"])
                                await rec_db.execute(s)
                                await rec_db.commit()
                            total_upserted += 1
                        except Exception as inner_e:
                            all_errors.append(f"Individual upsert error: {str(inner_e)[:100]}")

        result["chunks_completed"] = chunk_idx + 1

        # Update progress
        await _update_sync_progress(
            db, entity_type,
            total_expected=len(chunks),
            current_fetched=total_fetched,
            current_upserted=total_upserted,
            force=True,
            phase=f"chunk {chunk_idx + 1}/{len(chunks)} [{label}]",
        )

    # Finalize results
    result["records_fetched"] = total_fetched
    result["records_created"] = total_upserted

    if result["status"] == "running":
        result["status"] = "success"

    if all_errors:
        result["error_message"] = f"{len(all_errors)} errors. First 5: {'; '.join(all_errors[:5])}"

    logger.info(
        "crx_jobs chunked sync complete: %d chunks, %d fetched, %d upserted, %d errors",
        result["chunks_completed"], total_fetched,
        total_upserted, len(all_errors),
    )

    await _finalize_sync_metadata(db, meta_row, result, start_time, True)
    await _insert_sync_log(db, entity_type, True, started_at, result, start_time)

    return result