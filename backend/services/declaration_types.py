import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.declaration_types import Declaration_types

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Declaration_typesService:
    """Service layer for Declaration_types operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Declaration_types]:
        """Create a new declaration_types"""
        try:
            obj = Declaration_types(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created declaration_types with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating declaration_types: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Declaration_types]:
        """Get declaration_types by ID"""
        try:
            query = select(Declaration_types).where(Declaration_types.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching declaration_types {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of declaration_typess"""
        try:
            query = select(Declaration_types)
            count_query = select(func.count(Declaration_types.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Declaration_types, field):
                        query = query.where(getattr(Declaration_types, field) == value)
                        count_query = count_query.where(getattr(Declaration_types, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Declaration_types, field_name):
                        query = query.order_by(getattr(Declaration_types, field_name).desc())
                else:
                    if hasattr(Declaration_types, sort):
                        query = query.order_by(getattr(Declaration_types, sort))
            else:
                query = query.order_by(Declaration_types.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching declaration_types list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Declaration_types]:
        """Update declaration_types"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Declaration_types {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated declaration_types {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating declaration_types {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete declaration_types"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Declaration_types {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted declaration_types {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting declaration_types {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Declaration_types]:
        """Get declaration_types by any field"""
        try:
            if not hasattr(Declaration_types, field_name):
                raise ValueError(f"Field {field_name} does not exist on Declaration_types")
            result = await self.db.execute(
                select(Declaration_types).where(getattr(Declaration_types, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching declaration_types by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Declaration_types]:
        """Get list of declaration_typess filtered by field"""
        try:
            if not hasattr(Declaration_types, field_name):
                raise ValueError(f"Field {field_name} does not exist on Declaration_types")
            result = await self.db.execute(
                select(Declaration_types)
                .where(getattr(Declaration_types, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Declaration_types.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching declaration_typess by {field_name}: {str(e)}")
            raise