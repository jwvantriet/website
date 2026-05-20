"""
Vacancy AI Enhancer — Uses AI to polish and standardize vacancy descriptions.

Takes raw vacancy data from Carerix and produces consistent, professional
job descriptions that maintain Confair Group's brand voice across all postings.

Standardized template enforces consistent sections:
- Must-have / Nice-to-have requirements
- Base of Operation / Contract Type / Date of Commencement metadata
- Consistent layout across all client postings

Caching: Enhanced descriptions are cached in memory with a configurable TTL
to avoid repeated AI calls for the same vacancy content.
"""

import hashlib
import logging
import time
from typing import Optional

from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage

logger = logging.getLogger(__name__)

# Cache for AI-enhanced vacancy descriptions
# Key: hash of vacancy raw content, Value: (enhanced_data, timestamp)
_enhancement_cache: dict[str, tuple[dict, float]] = {}
ENHANCEMENT_CACHE_TTL = 3600  # 1 hour — enhanced content doesn't change often

SYSTEM_PROMPT = """You are a professional recruitment copywriter for Confair Group, a leading international crew management and staffing company specializing in Aviation, Maritime, and Offshore Energy sectors.

Your task is to take raw vacancy/job posting data and produce a polished, professional, and consistent job description. You MUST follow the EXACT standardized template below for EVERY vacancy, regardless of the client. This ensures brand consistency across all Confair postings.

## Brand Voice
- Professional yet approachable
- Confident and authoritative in the industry
- Emphasize Confair's expertise and global reach
- Use active, engaging language

## STANDARDIZED TEMPLATE — FOLLOW EXACTLY

### Introduction Section (intro_html)
- Write a compelling 2-3 sentence opening that hooks the reader
- Mention the role, industry context, and why it's an exciting opportunity
- If the original intro is empty or very short, create one based on the job title and other available information
- MUST end with a structured metadata block in this EXACT format:

<div class="vacancy-meta">
<p><strong>Base of Operation:</strong> [location or "Several international bases (nearest international airport)" if multiple/unclear]</p>
<p><strong>Contract Type:</strong> [Fixed-term / Permanent / Freelance — infer from data, default to "Fixed-term"]</p>
<p><strong>Date of Commencement:</strong> [specific date if available, otherwise "To be determined"]</p>
</div>

### Job Description Section (vacancy_html)
- Organize responsibilities into clear bullet points
- Start each bullet with an action verb
- Group related responsibilities together
- If the original is a wall of text, restructure it into organized bullets
- If empty, generate reasonable responsibilities based on the job title and industry

### Requirements Section (requirements_html)
- MUST be split into two clearly labeled subsections:

<h3>Must-have:</h3>
<ul>
<li>Essential qualification 1</li>
<li>Essential qualification 2</li>
...
</ul>

<h3>Nice-to-have:</h3>
<ul>
<li>Preferred qualification 1</li>
<li>Preferred qualification 2</li>
...
</ul>

- Include relevant certifications for the industry (EASA for aviation, STCW for maritime, BOSIET/IWCF for offshore)
- If the original does not clearly separate must-have from nice-to-have, use your industry knowledge to categorize them appropriately
- Must-have should include legally required certifications, minimum experience, and essential skills
- Nice-to-have should include preferred experience, additional certifications, language skills, etc.

### What We Offer Section (offer_html)
- Highlight benefits and compensation aspects
- Include standard Confair offerings: competitive salary, international opportunities, career development
- If empty, create a standard offer section appropriate for the industry
- Use bullet points for clarity

### Company Information Section (company_html)
- If provided, polish the existing company description
- If empty, write a brief paragraph about Confair Group's expertise in the relevant industry
- Always maintain a professional, trustworthy tone

## Formatting Rules
- Use <p> for paragraphs
- Use <ul> and <li> for lists
- Use <strong> for emphasis on key terms
- Use <h3> ONLY for "Must-have:" and "Nice-to-have:" subsection headers within requirements
- Do NOT use markdown — output pure HTML only
- Do NOT include <h1> or <h2> section titles — those are handled by the frontend
- Keep each section concise but informative (aim for 100-250 words per section)
- Ensure consistent formatting across all sections

## CRITICAL CONSISTENCY RULES
- EVERY vacancy MUST have the "Base of Operation / Contract Type / Date of Commencement" block in the intro
- EVERY vacancy MUST have "Must-have:" and "Nice-to-have:" subsections in requirements
- When recruiting for the SAME client, the layout, tone, and structure must be IDENTICAL
- Preserve all factual information from the original (locations, dates, specific requirements, certifications)
- Do NOT invent specific salary figures, company names, or technical details not present in the original
- If a section has good content already, improve its formatting and readability rather than rewriting entirely
- Always maintain accuracy — never add false claims or certifications"""

USER_PROMPT_TEMPLATE = """Please enhance the following vacancy posting for Confair Group. Produce polished, consistent HTML for each section following the EXACT standardized template.

IMPORTANT: You MUST include:
1. The "Base of Operation / Contract Type / Date of Commencement" metadata block in the intro section
2. "Must-have:" and "Nice-to-have:" subsections in the requirements section

**Job Title:** {title}
**Industry:** {industry}
**Location:** {location}
**Employment Type:** {employment_type}

**Raw Introduction:**
{intro}

**Raw Job Description:**
{vacancy}

**Raw Requirements:**
{requirements}

**Raw Offer/Benefits:**
{offer}

**Raw Company Information:**
{company}

**Raw Contact Information:**
{contact}

---

Respond with a JSON object containing exactly these keys (all values should be HTML strings):
{{
  "intro_html": "...",
  "vacancy_html": "...",
  "requirements_html": "...",
  "offer_html": "...",
  "company_html": "..."
}}

Do NOT include any text outside the JSON object. Do NOT wrap in markdown code blocks."""


def _content_hash(vacancy: dict) -> str:
    """Generate a hash of the vacancy content for cache keying."""
    key_parts = [
        vacancy.get("id", ""),
        vacancy.get("title", ""),
        vacancy.get("intro_html", ""),
        vacancy.get("vacancy_html", ""),
        vacancy.get("requirements_html", ""),
        vacancy.get("offer_html", ""),
        vacancy.get("company_html", ""),
        vacancy.get("modification_date", ""),
    ]
    content = "|".join(str(p) for p in key_parts)
    return hashlib.md5(content.encode()).hexdigest()


def _strip_html_for_prompt(html: str) -> str:
    """Convert HTML to readable text for the AI prompt."""
    import re
    if not html:
        return "(empty)"
    # Remove tags but keep text
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    # Decode common entities
    for entity, char in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&nbsp;", " "), ("&quot;", '"'), ("&ndash;", "-"),
        ("&mdash;", "-"), ("&rsquo;", "'"), ("&lsquo;", "'"),
    ]:
        text = text.replace(entity, char)
    return text if text else "(empty)"


async def enhance_vacancy(vacancy: dict) -> Optional[dict]:
    """
    Enhance a vacancy's descriptions using AI.

    Takes a raw vacancy detail dict and returns an enhanced version
    with polished, consistent HTML content for each section.

    Returns None if AI enhancement fails (caller should fall back to raw data).
    """
    if not vacancy:
        return None

    # Check cache first
    cache_key = _content_hash(vacancy)
    if cache_key in _enhancement_cache:
        cached_data, cached_at = _enhancement_cache[cache_key]
        if time.time() - cached_at < ENHANCEMENT_CACHE_TTL:
            logger.debug(
                "Returning cached AI enhancement for vacancy %s",
                vacancy.get("id"),
            )
            return cached_data

    # Build the user prompt with raw content
    user_prompt = USER_PROMPT_TEMPLATE.format(
        title=vacancy.get("title", "Unknown Position"),
        industry=vacancy.get("industry", "General"),
        location=vacancy.get("location", "TBD"),
        employment_type=vacancy.get("employment_type", "Contract"),
        intro=_strip_html_for_prompt(vacancy.get("intro_html", "")),
        vacancy=_strip_html_for_prompt(vacancy.get("vacancy_html", "")),
        requirements=_strip_html_for_prompt(vacancy.get("requirements_html", "")),
        offer=_strip_html_for_prompt(vacancy.get("offer_html", "")),
        company=_strip_html_for_prompt(vacancy.get("company_html", "")),
        contact=_strip_html_for_prompt(vacancy.get("contact_html", "")),
    )

    try:
        service = AIHubService()
        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=SYSTEM_PROMPT),
                ChatMessage(role="user", content=user_prompt),
            ],
            model="gpt-5-chat",  # Best for stable JSON output
        )

        response = await service.gentxt(request)
        raw_content = response.content

        # Parse the JSON response
        import json
        import re

        # Strip markdown code blocks if present
        cleaned = raw_content.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        enhanced_sections = json.loads(cleaned)

        # Build the enhanced vacancy by merging with original data
        enhanced = dict(vacancy)
        enhanced["intro_html"] = enhanced_sections.get("intro_html", vacancy.get("intro_html", ""))
        enhanced["vacancy_html"] = enhanced_sections.get("vacancy_html", vacancy.get("vacancy_html", ""))
        enhanced["requirements_html"] = enhanced_sections.get("requirements_html", vacancy.get("requirements_html", ""))
        enhanced["offer_html"] = enhanced_sections.get("offer_html", vacancy.get("offer_html", ""))
        enhanced["company_html"] = enhanced_sections.get("company_html", vacancy.get("company_html", ""))
        enhanced["ai_enhanced"] = True

        # Cache the result
        _enhancement_cache[cache_key] = (enhanced, time.time())

        logger.info(
            "Successfully AI-enhanced vacancy %s (%s)",
            vacancy.get("id"),
            vacancy.get("title"),
        )
        return enhanced

    except json.JSONDecodeError as e:
        logger.error("Failed to parse AI response as JSON: %s", e)
    except Exception as e:
        logger.error("AI enhancement failed for vacancy %s: %s", vacancy.get("id"), e)

    return None


def clear_enhancement_cache():
    """Clear the enhancement cache (useful for admin/debug)."""
    global _enhancement_cache
    _enhancement_cache.clear()
    logger.info("Enhancement cache cleared")


def get_cache_stats() -> dict:
    """Get enhancement cache statistics."""
    now = time.time()
    total = len(_enhancement_cache)
    fresh = sum(
        1 for _, (_, ts) in _enhancement_cache.items()
        if now - ts < ENHANCEMENT_CACHE_TTL
    )
    return {
        "total_cached": total,
        "fresh": fresh,
        "stale": total - fresh,
        "ttl_seconds": ENHANCEMENT_CACHE_TTL,
    }