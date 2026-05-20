"""
Carerix Webhook Registration Service.

Carerix does NOT have a UI for webhook configuration.
Webhooks must be registered programmatically via the Carerix Webhooks REST API:
  - POST https://api.carerix.io/webhooks/v1/applications  (create application)
  - POST https://api.carerix.io/webhooks/v1/applications/{app_id}/webhooks  (register webhook)
  - GET  https://api.carerix.io/webhooks/v1/applications  (list applications)
  - GET  https://api.carerix.io/webhooks/v1/applications/{app_id}/webhooks  (list webhooks)
  - DELETE https://api.carerix.io/webhooks/v1/applications/{app_id}/webhooks/{wh_id}  (remove webhook)

Authentication uses OAuth2 client credentials via Keycloak.
The Webhooks API requires a SEPARATE client (webhooks_integration_client) with webhook-specific scopes.

Per the official Postman collection (spl-webhooks):
  - Auth URL: https://id.carerix.io/auth/realms/{tenant}/protocol/openid-connect/token
  - API Base: https://api.carerix.io/webhooks
  - Grant type: client_credentials
  - Client auth: body (client_id + client_secret in POST body)

Environment variables:
  - CARERIX_WEBHOOK_CLIENT_ID     — Client ID for the webhook-enabled Carerix client
  - CARERIX_WEBHOOK_CLIENT_SECRET — Client secret for the webhook-enabled Carerix client
  - Falls back to CARERIX_CLIENT_ID / CARERIX_CLIENT_SECRET if webhook-specific vars are not set
  - CARERIX_TENANT                — Keycloak realm name (default: confair)
"""

import base64
import json
import logging
import os
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

CARERIX_WEBHOOKS_BASE = "https://api.carerix.io/webhooks/v1"

# Exact Carerix webhook scopes (from the Carerix Identity Access configuration)
WEBHOOK_SCOPES = [
    "urn:cx/webhooks:data:manage",
    "urn:cx/webhooks:data:read",
    "urn:cx/webhooks:data/applications:manage",
    "urn:cx/webhooks:data/applications:read",
    "urn:cx/webhooks:data/webhooks:manage",
]

# Token cache specifically for webhook operations (separate from GraphQL token)
_webhook_token_cache: dict = {
    "access_token": None,
    "expires_at": 0,
    "scope_used": None,
}

# Default event filters — Carerix allows max 10 filters per webhook.
# Per the Carerix docs, entity names use CamelCase: CREmployee, CRVacancy, etc.
# Event type format: "CREntity:action" (e.g., "CREmployee:updated")
DEFAULT_EVENT_FILTERS = [
    {"eventType": "CREmployee:updated"},
    {"eventType": "CREmployee:created"},
    {"eventType": "CRVacancy:updated"},
    {"eventType": "CRVacancy:created"},
    {"eventType": "CRJob:updated"},
    {"eventType": "CRJob:created"},
    {"eventType": "CRMatch:updated"},
    {"eventType": "CRMatch:created"},
    {"eventType": "CRCompany:updated"},
    {"eventType": "CRCompany:created"},
]

# Additional filters that can be registered as a second webhook if needed
SECONDARY_EVENT_FILTERS = [
    {"eventType": "CRPublication:updated"},
    {"eventType": "CRPublication:created"},
    {"eventType": "CRTodo:updated"},
    {"eventType": "CRTodo:created"},
]


# Known Carerix Keycloak identity hosts — try in order.
# id-s4.carerix.io is the working host for the 'confair' tenant.
# id.carerix.io is listed in the official Postman collection but may not work for all tenants.
_KEYCLOAK_HOSTS = [
    "https://id-s4.carerix.io",    # Primary — confirmed working for confair tenant
    "https://id.carerix.io",       # Alternative (per official Postman collection)
]


def _get_auth_url() -> str:
    """Build the Carerix Keycloak token URL using CARERIX_TENANT or fallback to 'confair'.

    Uses the primary Keycloak host from the official Postman collection.
    The CARERIX_KEYCLOAK_HOST env var can override this if needed.
    """
    tenant = os.environ.get("CARERIX_TENANT", "confair")
    keycloak_host = os.environ.get("CARERIX_KEYCLOAK_HOST", _KEYCLOAK_HOSTS[0])
    return f"{keycloak_host}/auth/realms/{tenant}/protocol/openid-connect/token"


def _get_webhook_credentials() -> tuple[str, str]:
    """
    Get credentials for webhook API operations.

    Checks for dedicated webhook client credentials first:
      CARERIX_WEBHOOK_CLIENT_ID / CARERIX_WEBHOOK_CLIENT_SECRET

    Falls back to the general Carerix credentials:
      CARERIX_CLIENT_ID / CARERIX_CLIENT_SECRET
    """
    # Prefer dedicated webhook client
    wh_client_id = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID", "")
    wh_client_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")
    if wh_client_id and wh_client_secret:
        return wh_client_id, wh_client_secret

    # Fall back to general credentials
    client_id = os.environ.get("CARERIX_CLIENT_ID", "")
    client_secret = os.environ.get("CARERIX_CLIENT_SECRET", "")
    return client_id, client_secret


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload (without verification) to inspect scopes and claims."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        # Add padding
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception as e:
        logger.debug("Failed to decode JWT: %s", e)
        return {}


async def _get_webhook_token(force_refresh: bool = False) -> tuple[str, dict]:
    """
    Obtain an OAuth2 access token suitable for the Carerix Webhooks API.

    Strategy:
    1. Use dedicated webhook credentials (CARERIX_WEBHOOK_CLIENT_ID/SECRET) if available
    2. Try the primary Keycloak host first, then fallback hosts
    3. Try requesting all webhook scopes at once
    4. Fall back to default scopes if specific scope request fails
    5. Return both the token and decoded JWT claims for diagnostics

    Returns:
        Tuple of (access_token, jwt_claims_dict)
    """
    global _webhook_token_cache

    # Return cached token if still valid
    if (
        not force_refresh
        and _webhook_token_cache["access_token"]
        and time.time() < _webhook_token_cache["expires_at"] - 60
    ):
        claims = _decode_jwt_payload(_webhook_token_cache["access_token"])
        return _webhook_token_cache["access_token"], claims

    client_id, client_secret = _get_webhook_credentials()

    if not client_id or not client_secret:
        raise ValueError(
            "Carerix API credentials not configured. "
            "Set CARERIX_WEBHOOK_CLIENT_ID + CARERIX_WEBHOOK_CLIENT_SECRET "
            "(or CARERIX_CLIENT_ID + CARERIX_CLIENT_SECRET) environment variables."
        )

    using_dedicated = bool(os.environ.get("CARERIX_WEBHOOK_CLIENT_ID"))
    tenant = os.environ.get("CARERIX_TENANT", "confair")

    # Build list of auth URLs to try — primary first, then fallbacks
    custom_host = os.environ.get("CARERIX_KEYCLOAK_HOST", "")
    auth_urls: list[str] = []
    if custom_host:
        auth_urls.append(f"{custom_host}/auth/realms/{tenant}/protocol/openid-connect/token")
    for host in _KEYCLOAK_HOSTS:
        url = f"{host}/auth/realms/{tenant}/protocol/openid-connect/token"
        if url not in auth_urls:
            auth_urls.append(url)

    last_error = ""
    for auth_url in auth_urls:
        logger.info(
            "Requesting webhook token from %s (client: %s, dedicated: %s)",
            auth_url,
            client_id[:20] + "...",
            using_dedicated,
        )

        # Strategy 1: Try with all webhook scopes combined
        all_scopes = " ".join(WEBHOOK_SCOPES)
        try:
            token, expires_in = await _request_token(auth_url, client_id, client_secret, scope=all_scopes)
            if token:
                logger.info("Got token with all webhook scopes from %s (expires in %ds)", auth_url, expires_in)
                _webhook_token_cache["access_token"] = token
                _webhook_token_cache["expires_at"] = time.time() + expires_in
                _webhook_token_cache["scope_used"] = all_scopes
                claims = _decode_jwt_payload(token)
                return token, claims
        except Exception as e:
            logger.debug("All-scopes request failed at %s: %s", auth_url, e)
            last_error = str(e)

        # Strategy 2: Try without any scope (use default scopes from client config)
        try:
            token, expires_in = await _request_token(auth_url, client_id, client_secret, scope=None)
            if token:
                logger.info("Got default-scope token from %s (expires in %ds)", auth_url, expires_in)
                _webhook_token_cache["access_token"] = token
                _webhook_token_cache["expires_at"] = time.time() + expires_in
                _webhook_token_cache["scope_used"] = "default (no explicit scope)"
                claims = _decode_jwt_payload(token)
                return token, claims
        except Exception as e:
            logger.debug("Default-scope request failed at %s: %s", auth_url, e)
            last_error = str(e)

    raise ValueError(
        f"Failed to obtain Carerix access token for webhook operations. "
        f"Tried auth URLs: {auth_urls}. Last error: {last_error}. "
        f"Either set CARERIX_WEBHOOK_CLIENT_ID and CARERIX_WEBHOOK_CLIENT_SECRET "
        f"to point to a client with webhook permissions, or add webhook scopes "
        f"to your existing client in Carerix → Identity Access → Clients → Default Scopes."
    )


async def _request_token(
    auth_url: str, client_id: str, client_secret: str, scope: Optional[str] = None
) -> tuple[Optional[str], int]:
    """
    Request an OAuth2 token with optional scope.

    Returns:
        Tuple of (access_token, expires_in_seconds) or (None, 0) on failure.
    """
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    if scope:
        data["scope"] = scope

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.post(
            auth_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if response.status_code == 200:
        token_data = response.json()
        return token_data.get("access_token"), token_data.get("expires_in", 300)

    logger.debug(
        "Token request failed (scope=%s): HTTP %d — %s",
        scope or "none",
        response.status_code,
        response.text[:300],
    )
    return None, 0


async def diagnose_token() -> dict:
    """
    Diagnostic function: obtain a token and inspect its claims.
    Returns detailed info about what scopes/permissions the token has.
    Tests both the general client and the webhook-specific client.
    Tries multiple Keycloak hosts to find the working one.
    """
    tenant = os.environ.get("CARERIX_TENANT", "confair")

    # Build list of auth URLs to try
    auth_urls: list[str] = []
    custom_host = os.environ.get("CARERIX_KEYCLOAK_HOST", "")
    if custom_host:
        auth_urls.append(f"{custom_host}/auth/realms/{tenant}/protocol/openid-connect/token")
    for host in _KEYCLOAK_HOSTS:
        url = f"{host}/auth/realms/{tenant}/protocol/openid-connect/token"
        if url not in auth_urls:
            auth_urls.append(url)

    # General client
    general_client_id = os.environ.get("CARERIX_CLIENT_ID", "")
    general_client_secret = os.environ.get("CARERIX_CLIENT_SECRET", "")

    # Webhook-specific client
    wh_client_id = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID", "")
    wh_client_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET", "")

    result: dict = {
        "auth_urls_tried": auth_urls,
        "tenant": tenant,
        "general_client_id": general_client_id[:30] + "..." if len(general_client_id) > 30 else general_client_id or "(not set)",
        "webhook_client_id": wh_client_id[:30] + "..." if len(wh_client_id) > 30 else wh_client_id or "(not set)",
        "using_dedicated_webhook_client": bool(wh_client_id and wh_client_secret),
        "token_results": [],
    }

    # Determine which client to test
    clients_to_test = []
    if wh_client_id and wh_client_secret:
        clients_to_test.append(("Webhook Client", wh_client_id, wh_client_secret))
    if general_client_id and general_client_secret:
        clients_to_test.append(("General Client", general_client_id, general_client_secret))

    if not clients_to_test:
        result["error"] = "No Carerix credentials configured"
        return result

    for auth_url in auth_urls:
        for client_label, cid, csecret in clients_to_test:
            # Test default (no scope) and all webhook scopes
            scopes_to_try: list[Optional[str]] = [None] + WEBHOOK_SCOPES
            for scope in scopes_to_try:
                scope_label = scope or "(default/no scope)"
                try:
                    token, expires_in = await _request_token(auth_url, cid, csecret, scope=scope)
                    if token:
                        claims = _decode_jwt_payload(token)
                        result["token_results"].append({
                            "auth_url": auth_url,
                            "client": client_label,
                            "scope_requested": scope_label,
                            "success": True,
                            "expires_in": expires_in,
                            "token_scopes": claims.get("scope", ""),
                            "realm_access_roles": claims.get("realm_access", {}).get("roles", []),
                            "resource_access": list(claims.get("resource_access", {}).keys()),
                            "azp": claims.get("azp", ""),
                        })
                    else:
                        result["token_results"].append({
                            "auth_url": auth_url,
                            "client": client_label,
                            "scope_requested": scope_label,
                            "success": False,
                            "error": "Token request returned no token",
                        })
                except Exception as e:
                    result["token_results"].append({
                        "auth_url": auth_url,
                        "client": client_label,
                        "scope_requested": scope_label,
                        "success": False,
                        "error": str(e),
                    })

    return result


async def list_webhook_applications() -> list[dict]:
    """List all webhook applications registered in Carerix.

    Per the Postman collection, use ?fields=name to get the application name
    in the list response.
    """
    token, claims = await _get_webhook_token()

    token_scopes = claims.get("scope", "not available")
    logger.info("Using token with scopes: %s", token_scopes)

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.get(
            f"{CARERIX_WEBHOOKS_BASE}/applications",
            params={"fields": "name"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "List applications: HTTP %d, body: %s",
        response.status_code,
        response.text[:500],
    )

    if response.status_code == 403:
        using_dedicated = bool(os.environ.get("CARERIX_WEBHOOK_CLIENT_ID"))
        raise ValueError(
            f"Access denied (HTTP 403) to Carerix Webhooks API. "
            f"Token scopes: [{token_scopes}]. "
            f"{'Using dedicated webhook client.' if using_dedicated else 'Using general client (no dedicated webhook client configured).'} "
            f"Set CARERIX_WEBHOOK_CLIENT_ID and CARERIX_WEBHOOK_CLIENT_SECRET to the "
            f"webhook-enabled client (e.g., 'Confair Webhook' client with webhook scopes). "
            f"Required scopes: urn:cx/webhooks:data:manage, urn:cx/webhooks:data/applications:read. "
            f"API response: {response.text[:200]}"
        )

    if response.status_code == 401:
        _webhook_token_cache["access_token"] = None
        _webhook_token_cache["expires_at"] = 0
        raise ValueError(
            "Authentication failed (HTTP 401). Token may be expired or invalid. "
            "Please try again."
        )

    if response.status_code != 200:
        raise ValueError(
            f"Failed to list webhook applications (HTTP {response.status_code}): "
            f"{response.text[:300]}"
        )

    data = response.json()
    logger.info(
        "List applications response type=%s, keys=%s",
        type(data).__name__,
        list(data.keys()) if isinstance(data, dict) else f"list[{len(data)}]" if isinstance(data, list) else "other",
    )

    if isinstance(data, list):
        if data:
            logger.info("First application item keys: %s", list(data[0].keys()) if isinstance(data[0], dict) else type(data[0]))
        return data
    if isinstance(data, dict):
        # Check for paginated/wrapped responses
        for key in ("data", "items", "content", "_embedded", "results", "applications", "webhookApplications"):
            if key in data and isinstance(data[key], list):
                items = data[key]
                if items:
                    logger.info("Found applications in '%s' field, count=%d, first keys=%s", key, len(items), list(items[0].keys()) if isinstance(items[0], dict) else type(items[0]))
                return items
        # Check if the dict itself is a single application (has any ID-like field)
        has_id = any("id" in k.lower() for k in data.keys())
        if has_id:
            logger.info("Response appears to be a single application object with keys: %s", list(data.keys()))
            return [data]
        # If it's a wrapper with a single nested object
        for key, val in data.items():
            if isinstance(val, dict) and any("id" in k.lower() for k in val.keys()):
                logger.info("Found single application in nested field '%s' with keys: %s", key, list(val.keys()))
                return [val]
    return []


async def create_webhook_application(app_name: str = "Confair Sync") -> dict:
    """Create a new webhook application in Carerix.

    Per the official Postman collection, the payload uses:
      {"_kind": "Application", "name": "..."}
    """
    token, _ = await _get_webhook_token()

    payload = {
        "_kind": "Application",
        "name": app_name,
    }

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.post(
            f"{CARERIX_WEBHOOKS_BASE}/applications",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Create application: HTTP %d, body: %s",
        response.status_code,
        response.text[:500],
    )

    if response.status_code == 403:
        raise ValueError(
            "Access denied (HTTP 403). Set CARERIX_WEBHOOK_CLIENT_ID and "
            "CARERIX_WEBHOOK_CLIENT_SECRET to a client with webhook permissions."
        )

    if response.status_code not in (200, 201):
        raise ValueError(
            f"Failed to create webhook application (HTTP {response.status_code}): "
            f"{response.text[:300]}"
        )

    result = response.json()
    logger.info(
        "Created application response type=%s, keys=%s",
        type(result).__name__,
        list(result.keys()) if isinstance(result, dict) else type(result),
    )
    return result


async def list_webhooks(application_id: str) -> list[dict]:
    """List all webhooks for a given application.

    Per the Postman collection, use ?fields=filters,url to get useful data
    in the list response (otherwise only _kind and _id are returned).
    """
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.get(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks",
            params={"fields": "filters,url,status"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "List webhooks for app %s: HTTP %d, body: %s",
        application_id,
        response.status_code,
        response.text[:500],
    )

    if response.status_code != 200:
        raise ValueError(
            f"Failed to list webhooks (HTTP {response.status_code}): "
            f"{response.text[:300]}"
        )

    data = response.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "items", "content", "_embedded"):
            if key in data and isinstance(data[key], list):
                return data[key]
        if "id" in data or "webhookId" in data:
            return [data]
    return []


async def register_webhook(
    application_id: str,
    webhook_url: str,
    webhook_secret: str = "",
    event_filters: Optional[list[dict]] = None,
) -> dict:
    """
    Register a new webhook endpoint in Carerix.

    Carerix enforces a maximum of 10 filters per webhook. If more than 10 filters
    are requested, they are automatically split into multiple webhook registrations.

    Args:
        application_id: The Carerix webhook application ID.
        webhook_url: The URL Carerix should POST events to.
        webhook_secret: Secret for the Custom-Signature header.
        event_filters: List of event type filters. Defaults to DEFAULT_EVENT_FILTERS (10 items).

    Returns:
        The created webhook object(s) from Carerix.
    """
    MAX_FILTERS_PER_WEBHOOK = 10

    token, _ = await _get_webhook_token()
    filters = event_filters or DEFAULT_EVENT_FILTERS

    # Safety: enforce the Carerix limit of 10 filters per webhook
    if len(filters) > MAX_FILTERS_PER_WEBHOOK:
        logger.warning(
            "Too many filters (%d) for a single webhook (max %d). "
            "Splitting into multiple webhook registrations.",
            len(filters),
            MAX_FILTERS_PER_WEBHOOK,
        )
        # Split into chunks of MAX_FILTERS_PER_WEBHOOK
        results = []
        for i in range(0, len(filters), MAX_FILTERS_PER_WEBHOOK):
            chunk = filters[i : i + MAX_FILTERS_PER_WEBHOOK]
            result = await _register_single_webhook(
                token, application_id, webhook_url, webhook_secret, chunk
            )
            results.append(result)
        # Return the first result but include info about additional webhooks
        first = results[0]
        if len(results) > 1:
            first["_additional_webhooks"] = results[1:]
            first["_total_webhooks_created"] = len(results)
        return first

    return await _register_single_webhook(
        token, application_id, webhook_url, webhook_secret, filters
    )


async def _register_single_webhook(
    token: str,
    application_id: str,
    webhook_url: str,
    webhook_secret: str,
    filters: list[dict],
) -> dict:
    """Register a single webhook with up to 10 filters."""
    payload: dict = {
        "url": webhook_url,
        "_kind": "Webhook",
        "filters": filters,
    }

    if webhook_secret:
        payload["customHeaders"] = [
            {"name": "Custom-Signature", "value": webhook_secret}
        ]

    logger.info(
        "Registering webhook: app=%s, url=%s, filters=%d, secret=%s",
        application_id,
        webhook_url,
        len(filters),
        "yes" if webhook_secret else "no",
    )

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.post(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Register webhook: HTTP %d, body: %s",
        response.status_code,
        response.text[:500],
    )

    if response.status_code not in (200, 201):
        raise ValueError(
            f"Failed to register webhook (HTTP {response.status_code}): "
            f"{response.text[:500]}"
        )

    return response.json()


async def get_webhook_detail(application_id: str, webhook_id: str) -> dict:
    """
    Fetch detailed info for a single webhook (includes URL, filters, status).

    Per the Postman collection, use ?fields=status,url to get the relevant fields.
    """
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.get(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks/{webhook_id}",
            params={"fields": "status,url,filters"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Get webhook detail %s/%s: HTTP %d, body: %s",
        application_id,
        webhook_id,
        response.status_code,
        response.text[:500],
    )

    if response.status_code != 200:
        logger.warning(
            "Failed to get webhook detail (HTTP %d): %s",
            response.status_code,
            response.text[:300],
        )
        return {"_id": webhook_id, "_error": f"HTTP {response.status_code}"}

    return response.json()


async def delete_webhook(application_id: str, webhook_id: str) -> bool:
    """Delete a webhook from Carerix."""
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.delete(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks/{webhook_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Delete webhook %s from app %s: HTTP %d",
        webhook_id,
        application_id,
        response.status_code,
    )

    return response.status_code in (200, 204)


async def delete_application(application_id: str) -> bool:
    """Delete a webhook application from Carerix."""
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.delete(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Delete application %s: HTTP %d, body: %s",
        application_id,
        response.status_code,
        response.text[:300],
    )

    return response.status_code in (200, 204)


async def enable_webhook(application_id: str, webhook_id: str) -> bool:
    """Enable a webhook in Carerix (POST .../webhooks/{id}/enable)."""
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.post(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks/{webhook_id}/enable",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Enable webhook %s/%s: HTTP %d",
        application_id, webhook_id, response.status_code,
    )
    return response.status_code in (200, 204)


async def disable_webhook(application_id: str, webhook_id: str) -> bool:
    """Disable a webhook in Carerix (POST .../webhooks/{id}/disable)."""
    token, _ = await _get_webhook_token()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        response = await http_client.post(
            f"{CARERIX_WEBHOOKS_BASE}/applications/{application_id}/webhooks/{webhook_id}/disable",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )

    logger.info(
        "Disable webhook %s/%s: HTTP %d",
        application_id, webhook_id, response.status_code,
    )
    return response.status_code in (200, 204)