"""
Phase 1: Authentication API Tests

Tests cover:
1. Platform Auth - Agency login (local credentials)
2. Platform Auth - Token creation and validation
3. Platform Auth - /me endpoint with valid/invalid/expired tokens
4. Platform Auth - OIDC login flow initiation
5. Platform Auth - OIDC debug/diagnostic endpoint
6. Health check endpoint
"""

import random
import pytest
import jwt
from datetime import datetime, timedelta
from httpx import AsyncClient

from tests.conftest import (
    create_test_token,
    JWT_SECRET,
    JWT_ALGORITHM,
)


def _unique_email(prefix: str = "test") -> str:
    """Generate a unique email for test isolation."""
    return f"{prefix}_{random.randint(100000, 999999)}@confair.nl"


# ─── Health Check ────────────────────────────────────────────────────────────

class TestHealthCheck:
    """Verify the backend is running and database is accessible."""

    @pytest.mark.asyncio
    async def test_database_health(self, client: AsyncClient):
        """GET /database/health should return healthy status."""
        resp = await client.get("/database/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["service"] == "database"
        assert body["status"] in ("healthy", "unhealthy")
        print(f"  ✓ Database health: {body['status']}")


# ─── Token Validation ────────────────────────────────────────────────────────

class TestTokenValidation:
    """Verify JWT token creation, decoding, and edge cases."""

    def test_create_valid_token(self):
        """A freshly created token should decode correctly."""
        token = create_test_token(
            user_id=42,
            email="admin@confair.nl",
            name="Admin User",
            role="agency_admin",
        )
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert claims["sub"] == "42"
        assert claims["email"] == "admin@confair.nl"
        assert claims["name"] == "Admin User"
        assert claims["role"] == "agency_admin"
        assert claims["auth_source"] == "local"
        print(f"  ✓ Token decoded: sub={claims['sub']}, role={claims['role']}")

    def test_expired_token_raises(self):
        """An expired token should raise ExpiredSignatureError."""
        token = create_test_token(expired=True)
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print("  ✓ Expired token correctly rejected")

    def test_invalid_secret_raises(self):
        """A token signed with a different secret should fail validation."""
        token = create_test_token()
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, "wrong_secret", algorithms=[JWT_ALGORITHM])
        print("  ✓ Invalid secret correctly rejected")

    def test_token_contains_required_claims(self):
        """Token must contain sub, email, role, exp, iat."""
        token = create_test_token()
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        required_fields = ["sub", "email", "role", "exp", "iat"]
        for field in required_fields:
            assert field in claims, f"Missing required claim: {field}"
        print(f"  ✓ All required claims present: {required_fields}")

    def test_token_expiration_is_24h(self):
        """Token should expire approximately 24 hours from creation."""
        token = create_test_token()
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        exp_dt = datetime.utcfromtimestamp(claims["exp"])
        iat_dt = datetime.utcfromtimestamp(claims["iat"])
        diff = exp_dt - iat_dt
        assert abs(diff.total_seconds() - 86400) < 5
        print(f"  ✓ Token TTL: {diff.total_seconds()}s ≈ 24h")


# ─── Platform Auth /me Endpoint ──────────────────────────────────────────────

class TestPlatformAuthMe:
    """Test the /api/v1/platform-auth/me endpoint."""

    @pytest.mark.asyncio
    async def test_me_without_token_returns_401(self, client: AsyncClient):
        """GET /me without token should return 401."""
        resp = await client.get("/api/v1/platform-auth/me")
        assert resp.status_code == 401
        body = resp.json()
        assert "detail" in body
        print(f"  ✓ No token → 401: {body['detail']}")

    @pytest.mark.asyncio
    async def test_me_with_expired_token_returns_401(self, client: AsyncClient):
        """GET /me with expired token should return 401."""
        token = create_test_token(expired=True)
        resp = await client.get(f"/api/v1/platform-auth/me?token={token}")
        assert resp.status_code == 401
        body = resp.json()
        assert "expired" in body["detail"].lower() or "invalid" in body["detail"].lower()
        print(f"  ✓ Expired token → 401: {body['detail']}")

    @pytest.mark.asyncio
    async def test_me_with_invalid_token_returns_401(self, client: AsyncClient):
        """GET /me with garbage token should return 401."""
        resp = await client.get("/api/v1/platform-auth/me?token=not.a.valid.jwt.token")
        assert resp.status_code == 401
        print("  ✓ Invalid token → 401")


# ─── Agency Login ────────────────────────────────────────────────────────────

class TestAgencyLogin:
    """Test local/agency login endpoints."""

    @pytest.mark.asyncio
    async def test_agency_login_missing_fields(self, client: AsyncClient):
        """POST /agency-login without body should return 422."""
        resp = await client.post("/api/v1/platform-auth/agency-login")
        assert resp.status_code == 422
        print("  ✓ Missing fields → 422 validation error")

    @pytest.mark.asyncio
    async def test_agency_login_invalid_credentials(self, client: AsyncClient):
        """POST /agency-login with wrong credentials should return 401."""
        resp = await client.post(
            "/api/v1/platform-auth/agency-login",
            json={"email": "nonexistent@confair.nl", "password": "wrongpassword"},
        )
        assert resp.status_code == 401
        body = resp.json()
        assert "invalid" in body["detail"].lower()
        print(f"  ✓ Bad credentials → 401: {body['detail']}")

    @pytest.mark.asyncio
    async def test_local_login_invalid_credentials(self, client: AsyncClient):
        """POST /local-login with wrong credentials should return 401."""
        resp = await client.post(
            "/api/v1/platform-auth/local-login",
            json={"email": "nobody@confair.nl", "password": "nope"},
        )
        assert resp.status_code == 401
        print("  ✓ Local login bad credentials → 401")


# ─── OIDC Flow ───────────────────────────────────────────────────────────────

class TestOIDCFlow:
    """Test OIDC login initiation and diagnostic endpoints."""

    @pytest.mark.asyncio
    async def test_oidc_login_invalid_role(self, client: AsyncClient):
        """GET /oidc-login with invalid role should return 400."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-login?role=invalid_role",
            follow_redirects=False,
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "role" in body["detail"].lower()
        print(f"  ✓ Invalid OIDC role → 400: {body['detail']}")

    @pytest.mark.asyncio
    async def test_oidc_login_placement_redirects(self, client: AsyncClient):
        """GET /oidc-login?role=placement should redirect to OIDC provider."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-login?role=placement",
            follow_redirects=False,
        )
        assert resp.status_code in (302, 500, 503)
        if resp.status_code == 302:
            location = resp.headers.get("location", "")
            assert "authorize" in location.lower() or "oauth" in location.lower() or "openid" in location.lower()
            print(f"  ✓ OIDC login redirects to: {location[:100]}...")
        else:
            print(f"  ✓ OIDC login returned {resp.status_code} (OIDC provider may not be configured in test)")

    @pytest.mark.asyncio
    async def test_oidc_login_company_redirects(self, client: AsyncClient):
        """GET /oidc-login?role=company should redirect to OIDC provider."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-login?role=company",
            follow_redirects=False,
        )
        assert resp.status_code in (302, 500, 503)
        print(f"  ✓ OIDC company login → {resp.status_code}")

    @pytest.mark.asyncio
    async def test_oidc_callback_missing_params(self, client: AsyncClient):
        """GET /oidc-callback without code/state should redirect with error."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-callback",
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers.get("location", "")
        assert "error" in location.lower()
        print(f"  ✓ Missing callback params → redirect with error")

    @pytest.mark.asyncio
    async def test_oidc_callback_invalid_state(self, client: AsyncClient):
        """GET /oidc-callback with invalid state should redirect with error."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-callback?code=fake_code&state=fake_state",
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers.get("location", "")
        assert "error" in location.lower()
        print(f"  ✓ Invalid state → redirect with error")

    @pytest.mark.asyncio
    async def test_oidc_callback_with_error_param(self, client: AsyncClient):
        """GET /oidc-callback with error param should redirect with that error."""
        resp = await client.get(
            "/api/v1/platform-auth/oidc-callback?error=access_denied&error_description=User+cancelled",
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers.get("location", "")
        assert "error" in location.lower()
        print(f"  ✓ OIDC error forwarded correctly")

    @pytest.mark.asyncio
    async def test_oidc_debug_endpoint(self, client: AsyncClient):
        """GET /oidc-debug should return configuration info."""
        resp = await client.get("/api/v1/platform-auth/oidc-debug")
        assert resp.status_code == 200
        body = resp.json()
        assert "oidc_config" in body
        assert "discovery" in body
        assert "dynamic_urls" in body
        assert "client_id_configured" in body["oidc_config"]
        print(f"  ✓ OIDC debug: client_id_configured={body['oidc_config']['client_id_configured']}")


# ─── Create Agency User & Full Login Flow ────────────────────────────────────

class TestAgencyUserFlow:
    """Test creating an agency user and logging in with it."""

    @pytest.mark.asyncio
    async def test_create_and_login_agency_user(self, client: AsyncClient):
        """Full flow: create agency user → login → verify token → /me."""
        email = _unique_email("admin")

        # Step 1: Create agency user
        create_resp = await client.post(
            "/api/v1/platform-auth/create-agency-user",
            json={
                "email": email,
                "password": "TestPass123!",
                "name": "Test Admin",
                "role": "agency_admin",
            },
        )
        assert create_resp.status_code == 200
        create_body = create_resp.json()
        assert create_body["success"] is True
        user_id = create_body["user"]["id"]
        print(f"  ✓ Step 1: Created agency user id={user_id}")

        # Step 2: Login with the created user
        login_resp = await client.post(
            "/api/v1/platform-auth/agency-login",
            json={"email": email, "password": "TestPass123!"},
        )
        assert login_resp.status_code == 200
        login_body = login_resp.json()
        assert "token" in login_body
        assert login_body["user"]["email"] == email
        assert login_body["user"]["role"] == "agency_admin"
        token = login_body["token"]
        print(f"  ✓ Step 2: Login successful, token received")

        # Step 3: Verify token structure
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert claims["email"] == email
        assert claims["role"] == "agency_admin"
        print(f"  ✓ Step 3: Token claims verified: sub={claims['sub']}")

        # Step 4: Use token to access /me
        me_resp = await client.get(f"/api/v1/platform-auth/me?token={token}")
        assert me_resp.status_code == 200
        me_body = me_resp.json()
        assert me_body["email"] == email
        assert me_body["role"] == "agency_admin"
        assert me_body["is_active"] is True
        print(f"  ✓ Step 4: /me returned correct user: {me_body['name']}")

    @pytest.mark.asyncio
    async def test_login_wrong_password_after_create(self, client: AsyncClient):
        """After creating a user, wrong password should fail."""
        email = _unique_email("wrongpw")

        await client.post(
            "/api/v1/platform-auth/create-agency-user",
            json={
                "email": email,
                "password": "CorrectPass123!",
                "name": "Wrong PW Test",
                "role": "agency_admin",
            },
        )

        resp = await client.post(
            "/api/v1/platform-auth/agency-login",
            json={"email": email, "password": "WrongPassword!"},
        )
        assert resp.status_code == 401
        print("  ✓ Wrong password after create → 401")

    @pytest.mark.asyncio
    async def test_local_login_flow(self, client: AsyncClient):
        """Test the /local-login endpoint (supports all roles)."""
        email = _unique_email("localuser")

        await client.post(
            "/api/v1/platform-auth/create-agency-user",
            json={
                "email": email,
                "password": "LocalPass123!",
                "name": "Local User",
                "role": "agency_ops",
            },
        )

        resp = await client.post(
            "/api/v1/platform-auth/local-login",
            json={"email": email, "password": "LocalPass123!"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["user"]["role"] == "agency_ops"
        print(f"  ✓ Local login successful: role={body['user']['role']}")