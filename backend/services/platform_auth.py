"""
Platform authentication service for Agency users.
Agency users authenticate via email/password stored in platform_users table.
Placement and Company users authenticate via Carerix OIDC (handled by existing auth flow).
"""

import hashlib
import logging
import os
import secrets
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.platform_users import Platform_users

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt."""
    salt = os.environ.get("PASSWORD_SALT", "confair_platform_salt_2026")
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == password_hash


class PlatformAuthService:
    """Service for platform user authentication and management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_agency_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate an agency user by email and password."""
        stmt = select(Platform_users).where(
            Platform_users.email == email,
            Platform_users.auth_source == "local",
            Platform_users.is_active == True,
        ).order_by(Platform_users.id.desc()).limit(1)
        result = await self.db.execute(stmt)
        user = result.scalars().first()

        if not user:
            logger.warning("Agency login failed: user not found for email=%s", email)
            return None

        if not user.password_hash or not verify_password(password, user.password_hash):
            logger.warning("Agency login failed: invalid password for email=%s", email)
            return None

        # Update last login
        user.last_login = datetime.now().isoformat()
        await self.db.commit()

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "auth_source": user.auth_source,
        }

    async def authenticate_local_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate any local platform user (placement, company, agency) by email and password."""
        stmt = select(Platform_users).where(
            Platform_users.email == email,
            Platform_users.auth_source == "local",
            Platform_users.is_active == True,
        ).order_by(Platform_users.id.desc()).limit(1)
        result = await self.db.execute(stmt)
        user = result.scalars().first()

        if not user:
            logger.warning("Local login failed: user not found for email=%s", email)
            return None

        if not user.password_hash or not verify_password(password, user.password_hash):
            logger.warning("Local login failed: invalid password for email=%s", email)
            return None

        # Update last login
        user.last_login = datetime.now().isoformat()
        await self.db.commit()

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "auth_source": user.auth_source,
            "company_id": user.company_id,
            "placement_id": user.placement_id,
        }

    async def get_or_create_carerix_user(
        self, carerix_id: int, email: str, name: str, role: str, company_id: int = None, placement_id: int = None
    ) -> Dict[str, Any]:
        """Get or create a platform user from Carerix login."""
        stmt = select(Platform_users).where(
            Platform_users.carerix_id == carerix_id,
            Platform_users.auth_source == "carerix",
        ).order_by(Platform_users.id.desc()).limit(1)
        result = await self.db.execute(stmt)
        user = result.scalars().first()

        if not user:
            user = Platform_users(
                auth_source="carerix",
                role=role,
                carerix_id=carerix_id,
                company_id=company_id,
                placement_id=placement_id,
                email=email,
                name=name,
                is_active=True,
                created_at=datetime.now().isoformat(),
                last_login=datetime.now().isoformat(),
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        else:
            user.last_login = datetime.now().isoformat()
            user.name = name
            user.email = email
            if company_id:
                user.company_id = company_id
            if placement_id:
                user.placement_id = placement_id
            await self.db.commit()

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "auth_source": user.auth_source,
            "company_id": user.company_id,
            "placement_id": user.placement_id,
        }

    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get platform user by ID."""
        stmt = select(Platform_users).where(Platform_users.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "auth_source": user.auth_source,
            "company_id": user.company_id,
            "placement_id": user.placement_id,
            "is_active": user.is_active,
        }

    async def create_agency_user(self, email: str, password: str, name: str, role: str = "agency_admin") -> Dict[str, Any]:
        """Create a new agency user. If a user with this email already exists, update it instead."""
        # Check for existing user to prevent duplicates
        stmt = select(Platform_users).where(
            Platform_users.email == email,
            Platform_users.auth_source == "local",
        ).order_by(Platform_users.id.desc()).limit(1)
        result = await self.db.execute(stmt)
        existing = result.scalars().first()

        if existing:
            # Update existing user
            existing.password_hash = hash_password(password)
            existing.name = name
            existing.role = role
            existing.is_active = True
            await self.db.commit()
            await self.db.refresh(existing)
            return {
                "id": existing.id,
                "email": existing.email,
                "name": existing.name,
                "role": existing.role,
            }

        user = Platform_users(
            auth_source="local",
            role=role,
            email=email,
            name=name,
            password_hash=hash_password(password),
            is_active=True,
            created_at=datetime.now().isoformat(),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
        }