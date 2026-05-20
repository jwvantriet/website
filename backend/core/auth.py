import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx
from core.config import settings
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError, JWSSignatureError, JWTClaimsError

logger = logging.getLogger(__name__)

# Cached OIDC Discovery configuration
_oidc_discovery_cache: Optional[Dict[str, Any]] = None


async def get_oidc_discovery() -> Dict[str, Any]:
    """Fetch and cache OIDC Discovery configuration from the issuer.

    Uses the standard .well-known/openid-configuration endpoint to discover
    all OIDC endpoints (authorization, token, JWKS, logout, etc.).
    """
    global _oidc_discovery_cache
    if _oidc_discovery_cache is not None:
        return _oidc_discovery_cache

    issuer_url = settings.oidc_issuer_url.rstrip("/")
    discovery_url = f"{issuer_url}/.well-known/openid-configuration"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info("Fetching OIDC Discovery from: %s", discovery_url)
            response = await client.get(discovery_url)
            response.raise_for_status()
            config = response.json()
            logger.info(
                "OIDC Discovery loaded: issuer=%s, authorization_endpoint=%s",
                config.get("issuer"),
                config.get("authorization_endpoint"),
            )
            _oidc_discovery_cache = config
            return config
    except Exception as e:
        logger.error("Failed to fetch OIDC Discovery from %s: %s", discovery_url, e)
        # Fallback: construct URLs assuming standard path structure
        logger.warning("Using fallback OIDC endpoint construction")
        fallback = {
            "issuer": issuer_url,
            "authorization_endpoint": f"{issuer_url}/protocol/openid-connect/auth",
            "token_endpoint": f"{issuer_url}/protocol/openid-connect/token",
            "jwks_uri": f"{issuer_url}/protocol/openid-connect/certs",
            "end_session_endpoint": f"{issuer_url}/protocol/openid-connect/logout",
            "userinfo_endpoint": f"{issuer_url}/protocol/openid-connect/userinfo",
        }
        _oidc_discovery_cache = fallback
        return fallback


def clear_oidc_discovery_cache() -> None:
    """Clear the cached OIDC discovery configuration (useful for testing)."""
    global _oidc_discovery_cache
    _oidc_discovery_cache = None


def generate_state() -> str:
    """Generate a secure state parameter for OIDC."""
    return secrets.token_urlsafe(32)


def generate_nonce() -> str:
    """Generate a secure nonce parameter for OIDC."""
    return secrets.token_urlsafe(32)


def generate_code_verifier() -> str:
    """Generate PKCE code verifier."""
    return secrets.token_urlsafe(96)  # 128 bytes base64url encoded


def generate_code_challenge(code_verifier: str) -> str:
    """Generate PKCE code challenge from verifier using SHA256."""
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


async def get_jwks() -> Dict[str, Any]:
    """Get JWKS (JSON Web Key Set) from OIDC provider using discovery."""
    discovery = await get_oidc_discovery()
    jwks_url = discovery.get("jwks_uri", f"{settings.oidc_issuer_url}/protocol/openid-connect/certs")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info("Fetching JWKS from: %s", jwks_url)
            response = await client.get(jwks_url)
            response.raise_for_status()
            jwks_data = response.json()
            logger.info("Successfully fetched JWKS with %d keys", len(jwks_data.get("keys", [])))
            return jwks_data
    except httpx.TimeoutException as e:
        logger.error("Timeout while fetching JWKS from %s: %s", jwks_url, e)
        raise Exception("Unable to retrieve authentication keys")
    except httpx.HTTPStatusError as e:
        logger.error("HTTP error %s while fetching JWKS from %s: %s", e.response.status_code, jwks_url, e.response.text)
        raise Exception("Unable to retrieve authentication keys")
    except Exception as e:
        logger.error("Failed to fetch JWKS from %s: %s", jwks_url, e)
        raise Exception("Unable to retrieve authentication keys")


class IDTokenValidationError(Exception):
    """Custom exception for ID token validation errors."""

    def __init__(self, message: str, error_type: str = "validation_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)


class AccessTokenError(Exception):
    """Custom exception for application JWT access token errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


def create_access_token(claims: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """Create signed JWT access token from provided claims."""
    if not settings.jwt_secret_key:
        logger.error("JWT secret key is not configured")
        raise ValueError("JWT secret key is not configured")

    now = datetime.now(timezone.utc)
    token_claims = claims.copy()

    expiry_minutes = expires_minutes if expires_minutes is not None else int(settings.jwt_expire_minutes)
    expire_at = now + timedelta(minutes=expiry_minutes)

    token_claims.update(
        {
            "exp": expire_at,
            "iat": now,
            "nbf": now,
        }
    )

    token = jwt.encode(token_claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    # Log user hash instead of actual user ID to avoid exposing sensitive information
    user_id = token_claims.get("sub", "unknown")
    user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id != "unknown" else "unknown"
    logger.debug("Authentication token created for user hash: %s", user_hash)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    if not settings.jwt_secret_key:
        logger.error("JWT secret key is not configured")
        raise AccessTokenError("Authentication service is misconfigured")

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        # Log user hash instead of actual user ID to avoid exposing sensitive information
        user_id = payload.get("sub", "unknown")
        user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id != "unknown" else "unknown"
        logger.debug("Authentication token validated for user hash: %s", user_hash)
        return payload
    except ExpiredSignatureError as exc:
        logger.info("Authentication token has expired")
        raise AccessTokenError("Token has expired") from exc
    except JWTError as exc:
        # Log error type only, not the full exception which may contain sensitive token data
        logger.warning("Token validation failed: %s", type(exc).__name__)
        raise AccessTokenError("Invalid authentication token") from exc


async def validate_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """Validate ID token with proper JWT signature verification using JWKS."""
    # Get the issuer from discovery for validation
    discovery = await get_oidc_discovery()
    expected_issuer = discovery.get("issuer", settings.oidc_issuer_url)

    try:
        # Get the header to find the key ID
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")

        if not kid:
            logger.error("ID token validation failed: No key ID found in JWT header")
            raise IDTokenValidationError("Token format is invalid", "missing_kid")

        # Get JWKS from the provider
        try:
            jwks = await get_jwks()
        except Exception as e:
            logger.error(
                "ID token validation failed: Failed to fetch JWKS from issuer %s: %s",
                settings.oidc_issuer_url,
                e,
            )
            raise IDTokenValidationError("Unable to retrieve authentication keys", "jwks_fetch_error")

        # Find the matching key
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwk
                break

        if not key:
            logger.error(
                "ID token validation failed: No key found for kid: %s in JWKS from %s",
                kid,
                settings.oidc_issuer_url,
            )
            raise IDTokenValidationError("Authentication key validation failed", "key_not_found")

        # Convert JWK to PEM format for jose library
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        def base64url_decode(inp):
            """Decode base64url-encoded string."""
            padding = 4 - (len(inp) % 4)
            if padding != 4:
                inp += "=" * padding
            return base64.urlsafe_b64decode(inp)

        try:
            # Extract RSA components
            n = int.from_bytes(base64url_decode(key["n"]), "big")
            e = int.from_bytes(base64url_decode(key["e"]), "big")

            # Construct RSA public key
            public_numbers = rsa.RSAPublicNumbers(e, n)
            public_key = public_numbers.public_key()

            # Convert to PEM format
            pem_key = public_key.public_bytes(
                encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        except Exception as e:
            logger.error("ID token validation failed: Failed to convert JWK to PEM format: %s", e)
            raise IDTokenValidationError("Authentication key processing failed", "key_conversion_error")

        # Verify and decode the JWT
        try:
            payload = jwt.decode(
                id_token,
                pem_key,
                algorithms=["RS256"],
                issuer=expected_issuer,
                audience=settings.oidc_client_id,
            )
            # Log user hash instead of actual user ID to avoid exposing sensitive information
            user_id = payload.get("sub", "unknown")
            user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()[:8] if user_id != "unknown" else "unknown"
            logger.info("ID token successfully validated for user hash: %s", user_hash)
            return payload
        except ExpiredSignatureError:
            logger.error("JWT validation failed: ID token has expired")
            raise IDTokenValidationError("Token has expired", "token_expired")
        except JWSSignatureError:
            logger.error("JWT validation failed: Invalid JWT signature")
            raise IDTokenValidationError("Token signature verification failed", "invalid_signature")
        except JWTClaimsError as e:
            # JWTClaimsError covers issuer, audience, and other claims validation
            logger.error("JWT validation failed: Claims validation error: %s", e)
            if "iss" in str(e).lower() or "issuer" in str(e).lower():
                raise IDTokenValidationError("Token issuer validation failed", "invalid_issuer")
            elif "aud" in str(e).lower() or "audience" in str(e).lower():
                raise IDTokenValidationError("Token audience validation failed", "invalid_audience")
            else:
                raise IDTokenValidationError("Token claims validation failed", "invalid_claims")

    except IDTokenValidationError:
        # Re-raise our custom exceptions
        raise
    except JWTError as e:
        logger.error("JWT validation failed: %s", e)
        raise IDTokenValidationError("Token validation failed", "jwt_error")
    except Exception as e:
        logger.error("Unexpected error during ID token validation: %s", e)
        raise IDTokenValidationError("Authentication processing failed", "unexpected_error")


async def build_authorization_url(
    state: str,
    nonce: str,
    code_challenge: Optional[str] = None,
    redirect_uri: Optional[str] = None,
) -> str:
    """Build OIDC authorization URL with optional PKCE support using discovery."""
    import urllib.parse

    discovery = await get_oidc_discovery()
    auth_endpoint = discovery.get(
        "authorization_endpoint",
        f"{settings.oidc_issuer_url}/protocol/openid-connect/auth",
    )

    params = {
        "client_id": settings.oidc_client_id,
        "response_type": "code",
        "scope": settings.oidc_scope,
        "redirect_uri": redirect_uri or f"{settings.backend_url}/api/v1/auth/callback",
        "state": state,
        "nonce": nonce,
    }

    # Add PKCE parameters if provided
    if code_challenge:
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"

    auth_url = f"{auth_endpoint}?" + urllib.parse.urlencode(params)
    return auth_url


async def get_token_endpoint() -> str:
    """Get the token endpoint URL from OIDC discovery."""
    discovery = await get_oidc_discovery()
    return discovery.get(
        "token_endpoint",
        f"{settings.oidc_issuer_url}/protocol/openid-connect/token",
    )


async def build_logout_url(id_token: Optional[str] = None) -> str:
    """Build OIDC logout URL using discovery."""
    import urllib.parse

    discovery = await get_oidc_discovery()
    logout_endpoint = discovery.get(
        "end_session_endpoint",
        f"{settings.oidc_issuer_url}/protocol/openid-connect/logout",
    )

    params = {"post_logout_redirect_uri": f"{settings.frontend_url}/logout-callback"}

    if id_token:
        params["id_token_hint"] = id_token

    logout_url = f"{logout_endpoint}?" + urllib.parse.urlencode(params)
    return logout_url