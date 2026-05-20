import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.crx_vacancies import Crx_vacancies

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Crx_vacanciesService:
    """Service layer for Crx_vacancies operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Crx_vacancies]:
        """Create a new crx_vacancies"""
        try:
            obj = Crx_vacancies(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created crx_vacancies with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating crx_vacancies: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Crx_vacancies]:
        """Get crx_vacancies by ID"""
        try:
            query = select(Crx_vacancies).where(Crx_vacancies.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_vacancies {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of crx_vacanciess"""
        try:
            query = select(Crx_vacancies)
            count_query = select(func.count(Crx_vacancies.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Crx_vacancies, field):
                        query = query.where(getattr(Crx_vacancies, field) == value)
                        count_query = count_query.where(getattr(Crx_vacancies, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Crx_vacancies, field_name):
                        query = query.order_by(getattr(Crx_vacancies, field_name).desc())
                else:
                    if hasattr(Crx_vacancies, sort):
                        query = query.order_by(getattr(Crx_vacancies, sort))
            else:
                query = query.order_by(Crx_vacancies.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching crx_vacancies list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Crx_vacancies]:
        """Update crx_vacancies"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_vacancies {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated crx_vacancies {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating crx_vacancies {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete crx_vacancies"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_vacancies {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted crx_vacancies {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting crx_vacancies {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Crx_vacancies]:
        """Get crx_vacancies by any field"""
        try:
            if not hasattr(Crx_vacancies, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_vacancies")
            result = await self.db.execute(
                select(Crx_vacancies).where(getattr(Crx_vacancies, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_vacancies by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Crx_vacancies]:
        """Get list of crx_vacanciess filtered by field"""
        try:
            if not hasattr(Crx_vacancies, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_vacancies")
            result = await self.db.execute(
                select(Crx_vacancies)
                .where(getattr(Crx_vacancies, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Crx_vacancies.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching crx_vacanciess by {field_name}: {str(e)}")
            raise