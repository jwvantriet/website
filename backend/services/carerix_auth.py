"""
Carerix API authentication — OAuth2 client credentials flow.

Shared module for obtaining access tokens from the Carerix Keycloak server.
Used by sync, writer, webhook, and candidate services.

Token endpoint: https://id-s4.carerix.io/auth/realms/confair/protocol/openid-connect/token
GraphQL endpoint: https://api.carerix.io/graphql/v1/graphql
"""

import logging
import os
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# --- Carerix API Configuration ---
CARERIX_AUTH_URL = (
    "https://id-s4.carerix.io/auth/realms/confair/protocol/openid-connect/token"
)
CARERIX_GRAPHQL_URL = "https://api.carerix.io/graphql/v1/graphql"

# Token cache
_token_cache: dict = {
    "access_token": None,
    "expires_at": 0,
}


def _get_carerix_credentials():
    """Get Carerix API credentials from environment variables.

    Tries the primary CARERIX_CLIENT_ID/SECRET first, then falls back to
    CARERIX_WEBHOOK_CLIENT_ID/SECRET if the primary ones are missing or empty.
    """
    client_id = os.environ.get("CARERIX_CLIENT_ID")
    client_secret = os.environ.get("CARERIX_CLIENT_SECRET")
    if client_id and client_secret:
        return client_id, client_secret, "primary"

    # Fallback to webhook credentials (may have limited GraphQL access)
    wh_client_id = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID")
    wh_client_secret = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET")
    if wh_client_id and wh_client_secret:
        logger.info("Using webhook credentials as fallback for Carerix API access")
        return wh_client_id, wh_client_secret, "webhook_fallback"

    return None, None, None


async def _get_access_token() -> Optional[str]:
    """
    Obtain an OAuth2 access token from Carerix Keycloak using client credentials flow.
    Caches the token and refreshes when expired.

    Tries primary credentials first, falls back to webhook credentials.
    """
    global _token_cache

    # Return cached token if still valid (with 60s buffer)
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    client_id, client_secret, cred_source = _get_carerix_credentials()
    if not client_id or not client_secret:
        logger.warning("Carerix API credentials not configured")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.post(
                CARERIX_AUTH_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_data = response.json()

            _token_cache["access_token"] = token_data["access_token"]
            expires_in = token_data.get("expires_in", 300)
            _token_cache["expires_at"] = time.time() + expires_in

            logger.info(
                "Successfully obtained Carerix access token via %s credentials (expires in %ds)",
                cred_source,
                expires_in,
            )
            return _token_cache["access_token"]

    except httpx.HTTPStatusError as e:
        logger.error(
            "Carerix auth failed via %s credentials (HTTP %d): %s",
            cred_source,
            e.response.status_code,
            e.response.text[:300],
        )
    except httpx.RequestError as e:
        logger.error("Carerix auth request error: %s", e)
    except Exception as e:
        logger.error("Unexpected error during Carerix auth: %s", e)

    # If primary credentials failed, try webhook credentials
    if cred_source == "primary":
        wh_cid = os.environ.get("CARERIX_WEBHOOK_CLIENT_ID")
        wh_csec = os.environ.get("CARERIX_WEBHOOK_CLIENT_SECRET")
        if wh_cid and wh_csec:
            logger.info("Primary credentials failed, trying webhook credentials...")
            try:
                async with httpx.AsyncClient(timeout=15.0) as fallback_client:
                    response = await fallback_client.post(
                        CARERIX_AUTH_URL,
                        data={
                            "grant_type": "client_credentials",
                            "client_id": wh_cid,
                            "client_secret": wh_csec,
                        },
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )
                    response.raise_for_status()
                    token_data = response.json()
                    _token_cache["access_token"] = token_data["access_token"]
                    expires_in = token_data.get("expires_in", 300)
                    _token_cache["expires_at"] = time.time() + expires_in
                    logger.info(
                        "Obtained Carerix access token via webhook fallback (expires in %ds)",
                        expires_in,
                    )
                    return _token_cache["access_token"]
            except Exception as fallback_err:
                logger.error("Webhook credential fallback also failed: %s", fallback_err)

    return None