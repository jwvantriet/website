"""
Platform authentication router.
Handles Agency login (local credentials) and Placement/Company login via Carerix OIDC.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import (
    IDTokenValidationError,
    build_authorization_url,
    generate_code_challenge,
    generate_code_verifier,
    generate_nonce,
    generate_state,
    get_token_endpoint,
    validate_id_token,
)
from core.config import settings
from core.database import get_db
from services.auth import AuthService
from services.platform_auth import PlatformAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/platform-auth", tags=["platform-auth"])

JWT_SECRET = "confair_platform_jwt_secret_2026"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class AgencyLoginRequest(BaseModel):
    email: str
    password: str


class AgencyLoginResponse(BaseModel):
    token: str
    user: dict


class CreateAgencyUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "agency_admin"


def create_platform_token(user_data: dict) -> str:
    """Create a JWT token for platform users."""
    payload = {
        "sub": str(user_data["id"]),
        "email": user_data["email"],
        "name": user_data["name"],
        "role": user_data["role"],
        "auth_source": user_data.get("auth_source", "local"),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_platform_token(token: str) -> dict:
    """Decode and verify a platform JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _get_dynamic_url(request: Request) -> str:
    """Get dynamic base URL from request headers."""
    mgx_external_domain = request.headers.get("mgx-external-domain")
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto", "https")
    effective_host = mgx_external_domain or x_forwarded_host or host
    if not effective_host:
        return settings.backend_url
    import os
    url = f"{scheme}://{effective_host}"
    if os.getenv("LOCAL_PATCH", "").lower() in ("true", "1"):
        url = url.replace("https://", "http://").replace(":8000", ":3000")
    return url


# ─── Carerix OIDC Login for Placement / Company ────────────────────────────

@router.get("/oidc-login")
async def platform_oidc_login(
    request: Request,
    role: str = "placement",
    db: AsyncSession = Depends(get_db),
):
    """Start Carerix OIDC login flow for placement or company users.
    
    The role parameter is stored in the OIDC state so the callback knows
    what type of platform_user to create/link.
    """
    if role not in ("placement", "company"):
        raise HTTPException(status_code=400, detail="Role must be 'placement' or 'company'")

    state = generate_state()
    nonce = generate_nonce()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    # Build redirect_uri pointing to our platform-specific callback
    backend_url = _get_dynamic_url(request)
    redirect_uri = f"{backend_url}/api/v1/platform-auth/oidc-callback"

    # Store state with platform_role AND redirect_uri so the callback uses the exact same URI
    auth_service = AuthService(db)
    await auth_service.store_oidc_state(
        state, nonce, code_verifier,
        platform_role=role, redirect_uri=redirect_uri,
    )

    logger.info(
        "[platform-oidc-login] Starting OIDC flow: role=%s, redirect_uri=%s, host=%s, x-forwarded-host=%s, mgx-external-domain=%s",
        role, redirect_uri,
        request.headers.get("host"),
        request.headers.get("x-forwarded-host"),
        request.headers.get("mgx-external-domain"),
    )

    auth_url = await build_authorization_url(state, nonce, code_challenge, redirect_uri=redirect_uri)
    logger.info("[platform-oidc-login] Redirecting to Carerix: %s", auth_url[:200] + "...")
    return RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)


@router.get("/oidc-callback")
async def platform_oidc_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Carerix OIDC callback for platform users (placement/company).
    
    After successful OIDC authentication:
    1. Validates the ID token from Carerix
    2. Creates or updates a platform_user with the correct role
    3. Issues a platform JWT token
    4. Redirects to the frontend platform callback page
    """
    backend_url = _get_dynamic_url(request)
    
    # Log all request details for debugging
    logger.info(
        "[platform-oidc-callback] Received callback: code=%s, state=%s, error=%s, error_description=%s, backend_url=%s",
        "present" if code else "missing",
        state[:10] + "..." if state else "missing",
        error,
        error_description,
        backend_url,
    )
    logger.info(
        "[platform-oidc-callback] Request headers: host=%s, x-forwarded-host=%s, mgx-external-domain=%s, x-forwarded-proto=%s",
        request.headers.get("host"),
        request.headers.get("x-forwarded-host"),
        request.headers.get("mgx-external-domain"),
        request.headers.get("x-forwarded-proto"),
    )

    def redirect_with_error(message: str) -> RedirectResponse:
        fragment = urlencode({"error": message})
        redirect_url = f"{backend_url}/platform/oidc-callback?{fragment}"
        logger.info("[platform-oidc-callback] Redirecting with error to: %s, message: %s", redirect_url, message)
        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_302_FOUND,
        )

    if error:
        error_msg = f"Carerix login error: {error}"
        if error_description:
            error_msg += f" - {error_description}"
        logger.error("[platform-oidc-callback] OIDC provider returned error: %s (description: %s)", error, error_description)
        return redirect_with_error(error_msg)

    if not code or not state:
        logger.error("[platform-oidc-callback] Missing code or state: code=%s, state=%s", bool(code), bool(state))
        return redirect_with_error("Missing code or state parameter")

    # Validate state and retrieve platform_role
    auth_service = AuthService(db)
    temp_data = await auth_service.get_and_delete_oidc_state(state)
    if not temp_data:
        logger.error("[platform-oidc-callback] State not found or expired: state=%s", state[:10] + "...")
        return redirect_with_error("Invalid or expired login session. Please try again.")

    nonce = temp_data["nonce"]
    code_verifier = temp_data.get("code_verifier")
    platform_role = temp_data.get("platform_role", "placement")
    # Use the EXACT redirect_uri stored during login to prevent mismatch
    stored_redirect_uri = temp_data.get("redirect_uri")
    logger.info(
        "[platform-oidc-callback] State validated: platform_role=%s, has_code_verifier=%s, stored_redirect_uri=%s",
        platform_role, bool(code_verifier), stored_redirect_uri,
    )

    try:
        # Use stored redirect_uri (from login step) to ensure exact match
        # Fall back to dynamic computation only if not stored
        redirect_uri = stored_redirect_uri or f"{backend_url}/api/v1/platform-auth/oidc-callback"
        if stored_redirect_uri:
            logger.info("[platform-oidc-callback] Using STORED redirect_uri: %s", redirect_uri)
        else:
            logger.warning("[platform-oidc-callback] No stored redirect_uri, using dynamic: %s", redirect_uri)
        logger.info("[platform-oidc-callback] Exchanging code for tokens, role=%s, redirect_uri=%s", platform_role, redirect_uri)

        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.oidc_client_id,
        }

        # Add client_secret for confidential clients
        has_client_secret = False
        try:
            client_secret = settings.oidc_client_secret
            if client_secret:
                token_data["client_secret"] = client_secret
                has_client_secret = True
                logger.info("[platform-oidc-callback] Using confidential client flow (client_secret present)")
            else:
                logger.info("[platform-oidc-callback] Using public client flow (client_secret empty)")
        except AttributeError:
            logger.info("[platform-oidc-callback] No client_secret configured, using public client flow")

        if code_verifier:
            token_data["code_verifier"] = code_verifier
            logger.info("[platform-oidc-callback] PKCE code_verifier added to token request")

        token_url = await get_token_endpoint()
        logger.info("[platform-oidc-callback] Token endpoint: %s", token_url)
        
        # Log token request details (without sensitive values)
        logger.info(
            "[platform-oidc-callback] Token request params: grant_type=%s, client_id=%s, redirect_uri=%s, has_secret=%s, has_pkce=%s",
            token_data.get("grant_type"),
            token_data.get("client_id"),
            token_data.get("redirect_uri"),
            has_client_secret,
            bool(code_verifier),
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                token_response = await http_client.post(
                    token_url,
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.HTTPError as e:
            logger.error("[platform-oidc-callback] Token exchange HTTP error: %s", str(e), exc_info=True)
            return redirect_with_error(f"Token exchange failed: {e}")

        logger.info("[platform-oidc-callback] Token exchange response: status=%s", token_response.status_code)
        
        if token_response.status_code != 200:
            logger.error(
                "[platform-oidc-callback] Token exchange FAILED: status=%s, response=%s, redirect_uri_used=%s",
                token_response.status_code,
                token_response.text,
                redirect_uri,
            )
            # Provide a more user-friendly error message
            error_detail = token_response.text
            try:
                error_json = token_response.json()
                error_detail = error_json.get("error_description", error_json.get("error", token_response.text))
            except Exception:
                pass
            return redirect_with_error(f"Token exchange failed (HTTP {token_response.status_code}): {error_detail}")

        tokens = token_response.json()

        # Validate ID token
        id_token = tokens.get("id_token")
        if not id_token:
            return redirect_with_error("No ID token received from Carerix")

        id_claims = await validate_id_token(id_token)

        # Validate nonce
        if id_claims.get("nonce") != nonce:
            return redirect_with_error("Invalid nonce — possible replay attack")

        # Extract user info from Carerix claims
        carerix_sub = id_claims.get("sub", "")
        email = id_claims.get("email", "")
        name = id_claims.get("name") or id_claims.get("preferred_username") or email.split("@")[0]

        logger.info(
            "[platform-oidc-callback] OIDC authenticated: sub=%s, email=%s, name=%s, role=%s",
            carerix_sub, email, name, platform_role,
        )

        # Try to parse carerix_id as int; fall back to hash if it's a UUID/string
        try:
            carerix_id = int(carerix_sub)
        except (ValueError, TypeError):
            # Carerix sub is a UUID string — use a deterministic integer hash
            import hashlib
            carerix_id = int(hashlib.sha256(carerix_sub.encode()).hexdigest()[:15], 16)

        # Create or update platform_user via Carerix
        platform_service = PlatformAuthService(db)
        platform_user = await platform_service.get_or_create_carerix_user(
            carerix_id=carerix_id,
            email=email,
            name=name,
            role=platform_role,
        )

        # Issue platform JWT token
        platform_token = create_platform_token(platform_user)
        logger.info(
            "[platform-oidc-callback] Platform user authenticated: id=%s, email=%s, role=%s",
            platform_user["id"], platform_user["email"], platform_user["role"],
        )

        # Redirect to frontend platform callback with token
        params = urlencode({
            "token": platform_token,
            "user": __import__("json").dumps(platform_user),
        })
        return RedirectResponse(
            url=f"{backend_url}/platform/oidc-callback?{params}",
            status_code=status.HTTP_302_FOUND,
        )

    except IDTokenValidationError as e:
        logger.error("[platform-oidc-callback] ID token validation failed: %s", e.message)
        return redirect_with_error(f"Authentication failed: {e.message}")
    except Exception as e:
        logger.exception("[platform-oidc-callback] Unexpected error: %s", e)
        return redirect_with_error("Authentication processing failed. Please try again.")


# ─── Diagnostic Endpoints ───────────────────────────────────────────────────

@router.get("/oidc-debug")
async def oidc_debug(request: Request):
    """Diagnostic endpoint to verify OIDC configuration (no sensitive data exposed)."""
    from core.auth import get_oidc_discovery
    
    backend_url = _get_dynamic_url(request)
    
    # Test OIDC discovery
    discovery_status = "unknown"
    discovery_endpoints = {}
    try:
        discovery = await get_oidc_discovery()
        discovery_status = "ok"
        discovery_endpoints = {
            "issuer": discovery.get("issuer"),
            "authorization_endpoint": discovery.get("authorization_endpoint"),
            "token_endpoint": discovery.get("token_endpoint"),
            "jwks_uri": discovery.get("jwks_uri"),
        }
    except Exception as e:
        discovery_status = f"error: {str(e)}"

    # Check client configuration
    has_client_id = bool(getattr(settings, "oidc_client_id", ""))
    has_client_secret = False
    try:
        has_client_secret = bool(settings.oidc_client_secret)
    except AttributeError:
        pass

    return {
        "oidc_config": {
            "issuer_url": getattr(settings, "oidc_issuer_url", "NOT SET"),
            "client_id_configured": has_client_id,
            "client_secret_configured": has_client_secret,
            "scope": getattr(settings, "oidc_scope", "NOT SET"),
            "client_type": "confidential" if has_client_secret else "public (PKCE)",
        },
        "discovery": {
            "status": discovery_status,
            "endpoints": discovery_endpoints,
        },
        "dynamic_urls": {
            "backend_url": backend_url,
            "login_redirect_uri": f"{backend_url}/api/v1/platform-auth/oidc-callback",
            "request_host": request.headers.get("host"),
            "x_forwarded_host": request.headers.get("x-forwarded-host"),
            "mgx_external_domain": request.headers.get("mgx-external-domain"),
            "x_forwarded_proto": request.headers.get("x-forwarded-proto"),
        },
    }


# ─── Local Login Endpoints ──────────────────────────────────────────────────

@router.post("/agency-login", response_model=AgencyLoginResponse)
async def agency_login(data: AgencyLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login for Agency users using local credentials."""
    service = PlatformAuthService(db)
    user = await service.authenticate_agency_user(data.email, data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_platform_token(user)
    logger.info("Agency user logged in: %s", user["email"])

    return AgencyLoginResponse(token=token, user=user)


@router.post("/local-login", response_model=AgencyLoginResponse)
async def local_login(data: AgencyLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login for any platform user (placement, company, agency) using local credentials."""
    service = PlatformAuthService(db)
    user = await service.authenticate_local_user(data.email, data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_platform_token(user)
    logger.info("Platform user logged in: %s (role=%s)", user["email"], user["role"])

    return AgencyLoginResponse(token=token, user=user)


@router.post("/create-agency-user")
async def create_agency_user(data: CreateAgencyUserRequest, db: AsyncSession = Depends(get_db)):
    """Create a new agency user. For initial setup."""
    service = PlatformAuthService(db)
    user = await service.create_agency_user(
        email=data.email,
        password=data.password,
        name=data.name,
        role=data.role,
    )
    logger.info("Agency user created: %s", user["email"])
    return {"success": True, "user": user}


@router.get("/me")
async def get_platform_me(token: str = None, db: AsyncSession = Depends(get_db)):
    """Get current platform user info from token query param."""
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    claims = decode_platform_token(token)
    service = PlatformAuthService(db)
    user = await service.get_user_by_id(int(claims["sub"]))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user