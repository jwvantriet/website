import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.sync_log_entries import Sync_log_entries

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Sync_log_entriesService:
    """Service layer for Sync_log_entries operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Sync_log_entries]:
        """Create a new sync_log_entries"""
        try:
            obj = Sync_log_entries(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created sync_log_entries with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating sync_log_entries: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Sync_log_entries]:
        """Get sync_log_entries by ID"""
        try:
            query = select(Sync_log_entries).where(Sync_log_entries.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching sync_log_entries {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of sync_log_entriess"""
        try:
            query = select(Sync_log_entries)
            count_query = select(func.count(Sync_log_entries.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Sync_log_entries, field):
                        query = query.where(getattr(Sync_log_entries, field) == value)
                        count_query = count_query.where(getattr(Sync_log_entries, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Sync_log_entries, field_name):
                        query = query.order_by(getattr(Sync_log_entries, field_name).desc())
                else:
                    if hasattr(Sync_log_entries, sort):
                        query = query.order_by(getattr(Sync_log_entries, sort))
            else:
                query = query.order_by(Sync_log_entries.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching sync_log_entries list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Sync_log_entries]:
        """Update sync_log_entries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Sync_log_entries {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated sync_log_entries {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating sync_log_entries {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete sync_log_entries"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Sync_log_entries {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted sync_log_entries {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting sync_log_entries {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Sync_log_entries]:
        """Get sync_log_entries by any field"""
        try:
            if not hasattr(Sync_log_entries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Sync_log_entries")
            result = await self.db.execute(
                select(Sync_log_entries).where(getattr(Sync_log_entries, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching sync_log_entries by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Sync_log_entries]:
        """Get list of sync_log_entriess filtered by field"""
        try:
            if not hasattr(Sync_log_entries, field_name):
                raise ValueError(f"Field {field_name} does not exist on Sync_log_entries")
            result = await self.db.execute(
                select(Sync_log_entries)
                .where(getattr(Sync_log_entries, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Sync_log_entries.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching sync_log_entriess by {field_name}: {str(e)}")
            raise