import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.crx_matches import Crx_matches

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Crx_matchesService:
    """Service layer for Crx_matches operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Crx_matches]:
        """Create a new crx_matches"""
        try:
            obj = Crx_matches(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created crx_matches with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating crx_matches: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Crx_matches]:
        """Get crx_matches by ID"""
        try:
            query = select(Crx_matches).where(Crx_matches.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_matches {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of crx_matchess"""
        try:
            query = select(Crx_matches)
            count_query = select(func.count(Crx_matches.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Crx_matches, field):
                        query = query.where(getattr(Crx_matches, field) == value)
                        count_query = count_query.where(getattr(Crx_matches, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Crx_matches, field_name):
                        query = query.order_by(getattr(Crx_matches, field_name).desc())
                else:
                    if hasattr(Crx_matches, sort):
                        query = query.order_by(getattr(Crx_matches, sort))
            else:
                query = query.order_by(Crx_matches.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching crx_matches list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Crx_matches]:
        """Update crx_matches"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_matches {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated crx_matches {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating crx_matches {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete crx_matches"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_matches {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted crx_matches {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting crx_matches {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Crx_matches]:
        """Get crx_matches by any field"""
        try:
            if not hasattr(Crx_matches, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_matches")
            result = await self.db.execute(
                select(Crx_matches).where(getattr(Crx_matches, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_matches by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Crx_matches]:
        """Get list of crx_matchess filtered by field"""
        try:
            if not hasattr(Crx_matches, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_matches")
            result = await self.db.execute(
                select(Crx_matches)
                .where(getattr(Crx_matches, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Crx_matches.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching crx_matchess by {field_name}: {str(e)}")
            raise