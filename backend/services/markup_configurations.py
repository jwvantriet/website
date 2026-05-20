import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.markup_configurations import Markup_configurations

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Markup_configurationsService:
    """Service layer for Markup_configurations operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Markup_configurations]:
        """Create a new markup_configurations"""
        try:
            obj = Markup_configurations(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created markup_configurations with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating markup_configurations: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Markup_configurations]:
        """Get markup_configurations by ID"""
        try:
            query = select(Markup_configurations).where(Markup_configurations.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching markup_configurations {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of markup_configurationss"""
        try:
            query = select(Markup_configurations)
            count_query = select(func.count(Markup_configurations.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Markup_configurations, field):
                        query = query.where(getattr(Markup_configurations, field) == value)
                        count_query = count_query.where(getattr(Markup_configurations, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Markup_configurations, field_name):
                        query = query.order_by(getattr(Markup_configurations, field_name).desc())
                else:
                    if hasattr(Markup_configurations, sort):
                        query = query.order_by(getattr(Markup_configurations, sort))
            else:
                query = query.order_by(Markup_configurations.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching markup_configurations list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Markup_configurations]:
        """Update markup_configurations"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Markup_configurations {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated markup_configurations {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating markup_configurations {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete markup_configurations"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Markup_configurations {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted markup_configurations {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting markup_configurations {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Markup_configurations]:
        """Get markup_configurations by any field"""
        try:
            if not hasattr(Markup_configurations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Markup_configurations")
            result = await self.db.execute(
                select(Markup_configurations).where(getattr(Markup_configurations, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching markup_configurations by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Markup_configurations]:
        """Get list of markup_configurationss filtered by field"""
        try:
            if not hasattr(Markup_configurations, field_name):
                raise ValueError(f"Field {field_name} does not exist on Markup_configurations")
            result = await self.db.execute(
                select(Markup_configurations)
                .where(getattr(Markup_configurations, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Markup_configurations.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching markup_configurationss by {field_name}: {str(e)}")
            raise