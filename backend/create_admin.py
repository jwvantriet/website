#!/usr/bin/env python3
"""Quick script to check and create an admin user for the platform."""
import asyncio
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from core.database import db_manager
from models.platform_users import Platform_users
from services.platform_auth import hash_password


async def main():
    await db_manager.init_db()
    await db_manager.create_tables()

    async with db_manager.async_session_maker() as db:
        # Check existing users
        result = await db.execute(select(Platform_users))
        users = result.scalars().all()

        if users:
            print(f"\n=== Found {len(users)} platform user(s) ===")
            for u in users:
                print(f"  ID={u.id} | email={u.email} | name={u.name} | role={u.role} | auth_source={u.auth_source} | active={u.is_active} | has_pw={bool(u.password_hash)}")
        else:
            print("\n=== NO PLATFORM USERS FOUND ===")

        # Check if any agency_admin exists
        admin_result = await db.execute(
            select(Platform_users).where(
                Platform_users.role.in_(["agency_admin", "agency_ops"]),
                Platform_users.auth_source == "local",
                Platform_users.is_active == True,
            )
        )
        admins = admin_result.scalars().all()

        if admins:
            print(f"\n=== Agency admin(s) already exist ===")
            for a in admins:
                print(f"  email={a.email} | role={a.role}")
            print("\nYou can log in at /platform/login → Agency Login with these credentials.")
        else:
            print("\n=== Creating default agency admin user ===")
            from datetime import datetime
            admin = Platform_users(
                auth_source="local",
                role="agency_admin",
                email="admin@confair.nl",
                name="Admin",
                password_hash=hash_password("admin123"),
                is_active=True,
                created_at=datetime.now().isoformat(),
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            print(f"  Created: email=admin@confair.nl | password=admin123 | role=agency_admin")
            print("\n  ⚠️  IMPORTANT: Change this password after first login!")

    await db_manager.close_db()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())