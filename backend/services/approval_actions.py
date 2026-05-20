import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.approval_actions import Approval_actions

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Approval_actionsService:
    """Service layer for Approval_actions operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Approval_actions]:
        """Create a new approval_actions"""
        try:
            obj = Approval_actions(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created approval_actions with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating approval_actions: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Approval_actions]:
        """Get approval_actions by ID"""
        try:
            query = select(Approval_actions).where(Approval_actions.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching approval_actions {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of approval_actionss"""
        try:
            query = select(Approval_actions)
            count_query = select(func.count(Approval_actions.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Approval_actions, field):
                        query = query.where(getattr(Approval_actions, field) == value)
                        count_query = count_query.where(getattr(Approval_actions, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Approval_actions, field_name):
                        query = query.order_by(getattr(Approval_actions, field_name).desc())
                else:
                    if hasattr(Approval_actions, sort):
                        query = query.order_by(getattr(Approval_actions, sort))
            else:
                query = query.order_by(Approval_actions.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching approval_actions list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Approval_actions]:
        """Update approval_actions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Approval_actions {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated approval_actions {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating approval_actions {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete approval_actions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Approval_actions {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted approval_actions {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting approval_actions {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Approval_actions]:
        """Get approval_actions by any field"""
        try:
            if not hasattr(Approval_actions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Approval_actions")
            result = await self.db.execute(
                select(Approval_actions).where(getattr(Approval_actions, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching approval_actions by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Approval_actions]:
        """Get list of approval_actionss filtered by field"""
        try:
            if not hasattr(Approval_actions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Approval_actions")
            result = await self.db.execute(
                select(Approval_actions)
                .where(getattr(Approval_actions, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Approval_actions.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching approval_actionss by {field_name}: {str(e)}")
            raise