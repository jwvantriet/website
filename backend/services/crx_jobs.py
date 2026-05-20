import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.crx_jobs import Crx_jobs

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Crx_jobsService:
    """Service layer for Crx_jobs operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Crx_jobs]:
        """Create a new crx_jobs"""
        try:
            obj = Crx_jobs(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created crx_jobs with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating crx_jobs: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Crx_jobs]:
        """Get crx_jobs by ID"""
        try:
            query = select(Crx_jobs).where(Crx_jobs.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_jobs {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of crx_jobss"""
        try:
            query = select(Crx_jobs)
            count_query = select(func.count(Crx_jobs.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Crx_jobs, field):
                        query = query.where(getattr(Crx_jobs, field) == value)
                        count_query = count_query.where(getattr(Crx_jobs, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Crx_jobs, field_name):
                        query = query.order_by(getattr(Crx_jobs, field_name).desc())
                else:
                    if hasattr(Crx_jobs, sort):
                        query = query.order_by(getattr(Crx_jobs, sort))
            else:
                query = query.order_by(Crx_jobs.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching crx_jobs list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Crx_jobs]:
        """Update crx_jobs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_jobs {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated crx_jobs {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating crx_jobs {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete crx_jobs"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_jobs {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted crx_jobs {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting crx_jobs {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Crx_jobs]:
        """Get crx_jobs by any field"""
        try:
            if not hasattr(Crx_jobs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_jobs")
            result = await self.db.execute(
                select(Crx_jobs).where(getattr(Crx_jobs, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_jobs by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Crx_jobs]:
        """Get list of crx_jobss filtered by field"""
        try:
            if not hasattr(Crx_jobs, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_jobs")
            result = await self.db.execute(
                select(Crx_jobs)
                .where(getattr(Crx_jobs, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Crx_jobs.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching crx_jobss by {field_name}: {str(e)}")
            raise