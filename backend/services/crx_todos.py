import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.crx_todos import Crx_todos

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Crx_todosService:
    """Service layer for Crx_todos operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Crx_todos]:
        """Create a new crx_todos"""
        try:
            obj = Crx_todos(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created crx_todos with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating crx_todos: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Crx_todos]:
        """Get crx_todos by ID"""
        try:
            query = select(Crx_todos).where(Crx_todos.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_todos {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of crx_todoss"""
        try:
            query = select(Crx_todos)
            count_query = select(func.count(Crx_todos.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Crx_todos, field):
                        query = query.where(getattr(Crx_todos, field) == value)
                        count_query = count_query.where(getattr(Crx_todos, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Crx_todos, field_name):
                        query = query.order_by(getattr(Crx_todos, field_name).desc())
                else:
                    if hasattr(Crx_todos, sort):
                        query = query.order_by(getattr(Crx_todos, sort))
            else:
                query = query.order_by(Crx_todos.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching crx_todos list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Crx_todos]:
        """Update crx_todos"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_todos {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated crx_todos {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating crx_todos {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete crx_todos"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Crx_todos {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted crx_todos {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting crx_todos {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Crx_todos]:
        """Get crx_todos by any field"""
        try:
            if not hasattr(Crx_todos, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_todos")
            result = await self.db.execute(
                select(Crx_todos).where(getattr(Crx_todos, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching crx_todos by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Crx_todos]:
        """Get list of crx_todoss filtered by field"""
        try:
            if not hasattr(Crx_todos, field_name):
                raise ValueError(f"Field {field_name} does not exist on Crx_todos")
            result = await self.db.execute(
                select(Crx_todos)
                .where(getattr(Crx_todos, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Crx_todos.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching crx_todoss by {field_name}: {str(e)}")
            raise