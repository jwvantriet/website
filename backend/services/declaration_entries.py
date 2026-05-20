import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.declaration_entries import Declaration_entries

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Declaration_entriesService:
    """Service layer for Declaration_entries operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Declaration_entries]:
        """Create a new declaration_entries"""
        try:
            obj = Declaration_entries(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created declaration_entries with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating declaration_entries: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Declaration_entries]:
        """Get declaration_entries by ID"""
        try:
            query = select(Declaration_entries).where(Declaration_entries.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching declaration_entries {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of declaration_entriess"""
        try:
            query = select(Declaration_entries)
            count_query = select(func.count(Declaration_entries.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Declaration_entries, field):
                        query = query.where(getattr(Declaration_entries, field) == value)
                        count_query = count_query.where(getattr(Declaration_entries, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Declaration_entries, field_name):
                        query = query.order_by(getattr(Declaration_entries, field_name).desc())
                else:
                    if hasattr(Declaration_entries, sort):
                        query = query.order_by(getattr(Declaration_entries, sort))
            else:
                query = query.order_by(Declaration_entries.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching declaration_entries list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Declaration_entries]:
        """Update declaration_entries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Declaration_entries {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated declaration_entries {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating declaration_entries {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete declaration_entries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Declaration_entries {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted declaration_entries {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting declaration_entries {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Declaration_entries]:
        """Get declaration_entries by any field"""
        try:
            if not hasattr(Declaration_entries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Declaration_entries")
            result = await self.db.execute(
                select(Declaration_entries).where(getattr(Declaration_entries, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching declaration_entries by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Declaration_entries]:
        """Get list of declaration_entriess filtered by field"""
        try:
            if not hasattr(Declaration_entries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Declaration_entries")
            result = await self.db.execute(
                select(Declaration_entries)
                .where(getattr(Declaration_entries, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Declaration_entries.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching declaration_entriess by {field_name}: {str(e)}")
            raise