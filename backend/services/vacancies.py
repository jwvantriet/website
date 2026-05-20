"""
Vacancies service — Local database query.

Serves vacancy data from the local crx_publications table (synced from Carerix).
This is much faster than querying the Carerix GraphQL API live on every request.

The crx_publications table is kept up-to-date by:
- Scheduled sync (carerix_sync service)
- Webhook events (webhook_processor service)
"""

import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from models.crx_publications import Crx_publications

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# HTML / text helpers
# ---------------------------------------------------------------------------

def _strip_html(html: str) -> str:
    """Remove HTML tags and decode common entities."""
    if not html:
        return ""
    clean = re.sub(r"<[^>]+>", " ", html)
    clean = re.sub(r"\s+", " ", clean).strip()
    for entity, char in [
        ("&amp;", "&"),
        ("&lt;", "<"),
        ("&gt;", ">"),
        ("&nbsp;", " "),
        ("&quot;", '"'),
        ("&ndash;", "-"),
        ("&mdash;", "-"),
        ("&rsquo;", "'"),
        ("&lsquo;", "'"),
        ("&rdquo;", '"'),
        ("&ldquo;", '"'),
    ]:
        clean = clean.replace(entity, char)
    return clean


def _sanitize_html(html: str) -> str:
    """Sanitize HTML content — keep safe tags, remove scripts."""
    if not html:
        return ""
    clean = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'\s+on\w+="[^"]*"', "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s+on\w+='[^']*'", "", clean, flags=re.IGNORECASE)
    return clean.strip()


def _parse_date(date_str: str) -> str:
    """Parse a date string to YYYY-MM-DD format."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")
    try:
        for fmt in [
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ]:
            try:
                dt = datetime.strptime(date_str[:19], fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        return date_str[:10]
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def _infer_industry(title: str, body: str) -> str:
    """Infer industry from vacancy title and body text."""
    text_combined = (title + " " + body).lower()

    aviation_keywords = [
        "aircraft", "aviation", "avionics", "pilot", "cabin crew", "flight",
        "airline", "easa", "b1", "b2", "ndt", "mro", "airbus", "boeing",
        "helicopter", "aerospace", "first officer", "captain", "a320",
        "b737", "b747", "b777", "type rated", "type rating", "loadmaster",
        "mechanic", "engineer b1", "engineer b2", "line maintenance",
    ]
    maritime_keywords = [
        "maritime", "marine", "vessel", "ship", "seaman", "deck",
        "engine room", "stcw", "tanker", "bulk carrier", "lng", "container",
        "master mariner", "bosun", "able seaman",
    ]
    offshore_keywords = [
        "offshore", "drilling", "rig", "platform", "subsea", "rov",
        "fpso", "crane operator", "oim", "installation manager",
        "well control", "iwcf", "deepwater", "oil", "gas", "energy",
    ]

    aviation_score = sum(1 for kw in aviation_keywords if kw in text_combined)
    maritime_score = sum(1 for kw in maritime_keywords if kw in text_combined)
    offshore_score = sum(1 for kw in offshore_keywords if kw in text_combined)

    max_score = max(aviation_score, maritime_score, offshore_score)
    if max_score == 0:
        return "Aviation"

    if aviation_score == max_score:
        return "Aviation"
    if maritime_score == max_score:
        return "Maritime"
    return "Offshore"


# ---------------------------------------------------------------------------
# Row → dict mappers
# ---------------------------------------------------------------------------

def _row_to_vacancy(pub: Crx_publications) -> dict:
    """Map a crx_publications DB row to a vacancy summary dict."""
    title = (pub.title_information or "").strip() or "Untitled Position"
    location = (pub.work_location or "").strip() or "Location TBD"

    # Build summary from available text fields
    summary_parts = []
    for field_name in ["intro_information", "vacancy_information", "function_contact_information"]:
        val = getattr(pub, field_name, None)
        if val and val.strip():
            summary_parts.append(_strip_html(val))
    summary = " ".join(summary_parts).strip()

    if not summary:
        for field_name in ["intro_information_html", "vacancy_information_html"]:
            val = getattr(pub, field_name, None)
            if val and val.strip():
                summary = _strip_html(val)
                break

    if not summary:
        summary = title
    if len(summary) > 400:
        summary = summary[:397] + "..."

    # Industry inference
    all_text = " ".join(
        _strip_html(getattr(pub, f, None) or "")
        for f in [
            "title_information",
            "vacancy_information",
            "requirements_information",
            "offer_information",
            "company_information",
        ]
    )
    industry = _infer_industry(title, all_text)

    posted_date = _parse_date(pub.publication_start) if pub.publication_start else datetime.now().strftime("%Y-%m-%d")
    modification_date = _parse_date(pub.carerix_modified_date) if pub.carerix_modified_date else posted_date

    return {
        "id": str(pub.carerix_id) if pub.carerix_id else str(pub.id),
        "title": title,
        "industry": industry,
        "location": location,
        "employment_type": "Contract",
        "summary": summary,
        "posted_date": posted_date,
        "modification_date": modification_date,
        "apply_url": pub.apply_url or None,
    }


def _row_to_detail(pub: Crx_publications) -> dict:
    """Map a crx_publications DB row to a full vacancy detail dict."""
    base = _row_to_vacancy(pub)

    # Add full HTML content sections
    base["intro_html"] = _sanitize_html(pub.intro_information_html or "")
    base["vacancy_html"] = _sanitize_html(pub.vacancy_information_html or "")
    base["requirements_html"] = _sanitize_html(pub.requirements_information_html or "")
    base["offer_html"] = _sanitize_html(pub.offer_information_html or "")
    base["company_html"] = _sanitize_html(pub.company_information_html or "")
    base["contact_html"] = _sanitize_html(pub.function_contact_information_html or "")

    # Plain text fallbacks
    if not base["intro_html"]:
        intro_text = (pub.intro_information or "").strip()
        if intro_text:
            base["intro_html"] = f"<p>{intro_text}</p>"

    if not base["vacancy_html"]:
        vac_text = (pub.vacancy_information or "").strip()
        if vac_text:
            base["vacancy_html"] = f"<p>{vac_text}</p>"

    if not base["requirements_html"]:
        req_text = (pub.requirements_information or "").strip()
        if req_text:
            base["requirements_html"] = f"<p>{req_text}</p>"

    if not base["offer_html"]:
        offer_text = (pub.offer_information or "").strip()
        if offer_text:
            base["offer_html"] = f"<p>{offer_text}</p>"

    if not base["company_html"]:
        comp_text = (pub.company_information or "").strip()
        if comp_text:
            base["company_html"] = f"<p>{comp_text}</p>"

    if not base["contact_html"]:
        contact_text = (pub.function_contact_information or "").strip()
        if contact_text:
            base["contact_html"] = f"<p>{contact_text}</p>"

    base["publication_start"] = pub.publication_start or ""
    base["publication_end"] = pub.publication_end or ""

    return base


# ---------------------------------------------------------------------------
# Active publications filter (reusable)
# ---------------------------------------------------------------------------

def _active_filter():
    """SQLAlchemy filter for active (published, not deleted, not closed) publications."""
    return and_(
        Crx_publications.status_display == "Published",
        or_(Crx_publications.deleted.is_(None), Crx_publications.deleted == False),
        or_(Crx_publications.closed.is_(None), Crx_publications.closed == False),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_all_vacancies(
    industry: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    skip: int = 0,
) -> dict:
    """
    Get vacancies from the local database with optional filtering.
    Reads from crx_publications table (synced from Carerix).
    """
    try:
        async with db_manager.async_session_maker() as session:
            # Base query: active publications only
            stmt = select(Crx_publications).where(_active_filter())

            # Filter by industry (applied in Python after fetch since industry is inferred)
            # We fetch all active and filter in memory — with ~20 active pubs this is fine
            result = await session.execute(stmt)
            rows = result.scalars().all()

        # Map to vacancy dicts
        vacancies = []
        seen_keys = set()
        for pub in rows:
            vacancy = _row_to_vacancy(pub)

            # Deduplicate by title + location
            dedup_key = f"{vacancy['title'].lower()}|{vacancy['location'].lower()}"
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            vacancies.append(vacancy)

        # Filter by industry
        if industry and industry.lower() != "all":
            vacancies = [v for v in vacancies if v["industry"].lower() == industry.lower()]

        # Filter by search keyword
        if search:
            search_lower = search.lower()
            vacancies = [
                v
                for v in vacancies
                if search_lower in v["title"].lower()
                or search_lower in v["summary"].lower()
                or search_lower in v["location"].lower()
            ]

        # Sort by posted_date descending (most recent first)
        vacancies.sort(key=lambda v: v["posted_date"], reverse=True)

        total = len(vacancies)

        # Apply pagination
        if skip:
            vacancies = vacancies[skip:]
        if limit:
            vacancies = vacancies[:limit]

        logger.debug("Serving %d vacancies from local database (total: %d)", len(vacancies), total)

        return {"items": vacancies, "total": total, "source": "database"}

    except Exception as e:
        logger.error("Error querying vacancies from database: %s", e)
        return {"items": [], "total": 0, "source": "error"}


async def get_latest_vacancies(count: int = 6) -> dict:
    """Get the most recent vacancies for homepage display."""
    return await get_all_vacancies(limit=count)


async def get_vacancy_detail(vacancy_id: str) -> Optional[dict]:
    """
    Get full vacancy detail by carerix_id (publication ID).
    Returns the complete vacancy with all HTML content sections.
    """
    try:
        async with db_manager.async_session_maker() as session:
            # Try to find by carerix_id first
            try:
                cid = int(vacancy_id)
                stmt = select(Crx_publications).where(
                    Crx_publications.carerix_id == cid,
                    _active_filter(),
                )
            except (ValueError, TypeError):
                # If vacancy_id is not numeric, try by primary key id
                try:
                    pk_id = int(vacancy_id)
                    stmt = select(Crx_publications).where(
                        Crx_publications.id == pk_id,
                        _active_filter(),
                    )
                except (ValueError, TypeError):
                    return None

            result = await session.execute(stmt)
            pub = result.scalars().first()

            if not pub:
                # Also try without active filter (for admin access to non-published)
                try:
                    cid = int(vacancy_id)
                    stmt2 = select(Crx_publications).where(
                        Crx_publications.carerix_id == cid
                    )
                except (ValueError, TypeError):
                    return None

                result2 = await session.execute(stmt2)
                pub = result2.scalars().first()

                if not pub:
                    return None

            detail = _row_to_detail(pub)
            return {"vacancy": detail, "source": "database"}

    except Exception as e:
        logger.error("Error fetching vacancy detail %s from database: %s", vacancy_id, e)
        return None


async def get_vacancy_count() -> dict:
    """Get count of active vacancies (for dashboard/stats)."""
    try:
        async with db_manager.async_session_maker() as session:
            stmt = select(func.count()).select_from(Crx_publications).where(_active_filter())
            result = await session.execute(stmt)
            count = result.scalar() or 0
            return {"count": count, "source": "database"}
    except Exception as e:
        logger.error("Error counting vacancies: %s", e)
        return {"count": 0, "source": "error"}