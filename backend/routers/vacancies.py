"""
Vacancies API router.
Serves vacancy data from the local crx_publications database table.
Includes AI-enhanced vacancy descriptions and admin write-back to Carerix.
"""

import logging
import os
import time
from typing import Optional

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel

from services.vacancies import (
    get_all_vacancies,
    get_latest_vacancies,
    get_vacancy_detail,
    get_vacancy_count,
)
from services.vacancy_enhancer import (
    enhance_vacancy,
    clear_enhancement_cache,
    get_cache_stats,
)
from services.carerix_writer import push_to_carerix, get_schema_info, clear_schema_cache
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

router = APIRouter(prefix="/api/v1/vacancies", tags=["vacancies"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class PushContentRequest(BaseModel):
    """Request body for pushing edited content to Carerix."""
    intro_html: Optional[str] = None
    vacancy_html: Optional[str] = None
    requirements_html: Optional[str] = None
    offer_html: Optional[str] = None
    company_html: Optional[str] = None


@router.get("")
async def list_vacancies(
    industry: Optional[str] = Query(
        None, description="Filter by industry: Aviation, Maritime, Offshore"
    ),
    search: Optional[str] = Query(None, description="Search keyword"),
    limit: Optional[int] = Query(None, description="Max results"),
    skip: int = Query(0, description="Skip N results"),
):
    """Get all vacancies from local database with optional filtering."""
    try:
        result = await get_all_vacancies(
            industry=industry, search=search, limit=limit, skip=skip
        )
        return result
    except Exception as e:
        logger.error("Error fetching vacancies: %s", e)
        return {"items": [], "total": 0, "source": "error"}


@router.get("/latest")
async def latest_vacancies(
    count: int = Query(6, description="Number of latest vacancies to return"),
):
    """Get latest vacancies for homepage display."""
    try:
        result = await get_latest_vacancies(count=count)
        return result
    except Exception as e:
        logger.error("Error fetching latest vacancies: %s", e)
        return {"items": [], "total": 0, "source": "error"}


@router.get("/count")
async def vacancy_count():
    """Get count of active vacancies."""
    try:
        return await get_vacancy_count()
    except Exception as e:
        logger.error("Error counting vacancies: %s", e)
        return {"count": 0, "source": "error"}


@router.get("/detail/{vacancy_id}")
async def vacancy_detail(vacancy_id: str):
    """Get full vacancy detail by publication ID, including all HTML content sections."""
    try:
        result = await get_vacancy_detail(vacancy_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Vacancy not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching vacancy detail %s: %s", vacancy_id, e)
        raise HTTPException(status_code=500, detail="Failed to fetch vacancy detail")


@router.get("/enhanced/{vacancy_id}")
async def enhanced_vacancy_detail(vacancy_id: str):
    """
    Get AI-enhanced vacancy detail by publication ID.
    Uses AI to polish and standardize the vacancy description for consistency.
    Falls back to raw data if AI enhancement fails.
    """
    try:
        result = await get_vacancy_detail(vacancy_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Vacancy not found")

        raw_vacancy = result["vacancy"]
        source = result["source"]

        enhanced = await enhance_vacancy(raw_vacancy)

        if enhanced:
            return {
                "vacancy": enhanced,
                "source": source,
                "ai_enhanced": True,
            }

        logger.warning(
            "AI enhancement failed for vacancy %s, returning raw data",
            vacancy_id,
        )
        raw_vacancy["ai_enhanced"] = False
        return {
            "vacancy": raw_vacancy,
            "source": source,
            "ai_enhanced": False,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in enhanced vacancy detail %s: %s", vacancy_id, e)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch enhanced vacancy detail",
        )


# ---------------------------------------------------------------------------
# Admin endpoints — require authentication
# ---------------------------------------------------------------------------


@router.get("/admin/list")
async def admin_list_vacancies(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Admin endpoint: List all vacancies with their raw content for enhancement management.
    Requires authentication.
    """
    try:
        result = await get_all_vacancies()
        return result
    except Exception as e:
        logger.error("Error fetching admin vacancy list: %s", e)
        return {"items": [], "total": 0, "source": "error"}


@router.get("/admin/detail/{vacancy_id}")
async def admin_vacancy_detail(
    vacancy_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Admin endpoint: Get full vacancy detail with both raw and enhanced versions.
    Requires authentication.
    """
    try:
        result = await get_vacancy_detail(vacancy_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Vacancy not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching admin vacancy detail %s: %s", vacancy_id, e)
        raise HTTPException(status_code=500, detail="Failed to fetch vacancy detail")


@router.post("/admin/enhance/{vacancy_id}")
async def admin_enhance_vacancy(
    vacancy_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Admin endpoint: AI-enhance a vacancy description.
    Returns both the original and enhanced versions for review.
    Requires authentication.
    """
    try:
        result = await get_vacancy_detail(vacancy_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Vacancy not found")

        raw_vacancy = result["vacancy"]
        source = result["source"]

        enhanced = await enhance_vacancy(raw_vacancy)

        if enhanced:
            return {
                "original": raw_vacancy,
                "enhanced": enhanced,
                "source": source,
                "ai_enhanced": True,
            }

        return {
            "original": raw_vacancy,
            "enhanced": None,
            "source": source,
            "ai_enhanced": False,
            "error": "AI enhancement failed. Please try again.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error enhancing vacancy %s: %s", vacancy_id, e)
        raise HTTPException(
            status_code=500,
            detail="Failed to enhance vacancy",
        )


@router.post("/admin/push/{vacancy_id}")
async def admin_push_to_carerix(
    vacancy_id: str,
    content: Optional[PushContentRequest] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Admin endpoint: Push content to Carerix.
    If content body is provided, pushes the edited content directly.
    If no content body, enhances with AI first then pushes.
    Requires authentication.
    """
    try:
        result = await get_vacancy_detail(vacancy_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Vacancy not found")

        raw_vacancy = result["vacancy"]

        if content and any([
            content.intro_html,
            content.vacancy_html,
            content.requirements_html,
            content.offer_html,
            content.company_html,
        ]):
            push_content = {
                "intro_html": content.intro_html or "",
                "vacancy_html": content.vacancy_html or "",
                "requirements_html": content.requirements_html or "",
                "offer_html": content.offer_html or "",
                "company_html": content.company_html or "",
            }
            logger.info(
                "Pushing admin-edited content for vacancy %s", vacancy_id
            )
        else:
            enhanced = await enhance_vacancy(raw_vacancy)
            if not enhanced:
                raise HTTPException(
                    status_code=500,
                    detail="AI enhancement failed. Please try again.",
                )
            push_content = enhanced

        clear_schema_cache()
        push_result = await push_to_carerix(vacancy_id, push_content)

        return {
            "vacancy_id": vacancy_id,
            "title": raw_vacancy.get("title", ""),
            "push_result": push_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in push for %s: %s", vacancy_id, e)
        raise HTTPException(
            status_code=500,
            detail="Failed to push vacancy to Carerix",
        )


# ---------------------------------------------------------------------------
# Cache & Enhancement endpoints
# ---------------------------------------------------------------------------


@router.post("/refresh")
async def refresh_vacancies():
    """
    Force-refresh vacancy data. Since we now read from the local database,
    this clears the AI enhancement cache and returns fresh data.
    To update the database itself, trigger a Carerix sync.
    """
    try:
        clear_enhancement_cache()
        result = await get_all_vacancies()
        return {
            "refreshed": True,
            "items": result.get("items", []),
            "total": result.get("total", 0),
            "source": result.get("source", "database"),
        }
    except Exception as e:
        logger.error("Error refreshing vacancies: %s", e)
        return {"refreshed": False, "items": [], "total": 0, "source": "error"}


@router.get("/cache-status")
async def cache_status():
    """Get current data status for monitoring (includes AI enhancement cache)."""
    try:
        count_result = await get_vacancy_count()
        return {
            "source": "database",
            "active_vacancy_count": count_result.get("count", 0),
            "ai_enhancement_cache": get_cache_stats(),
        }
    except Exception as e:
        logger.error("Error getting cache status: %s", e)
        return {"source": "error", "error": str(e)}


@router.get("/debug/schema")
async def debug_carerix_schema():
    """
    Diagnostic endpoint to introspect the Carerix GraphQL schema.
    Shows available mutations for pushing updates.
    """
    try:
        schema_info = await get_schema_info()
        return {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "schema": schema_info,
        }
    except Exception as e:
        logger.error("Error introspecting Carerix schema: %s", e)
        return {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "error": str(e),
        }