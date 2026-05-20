import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.payroll_periods import Payroll_periods

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Payroll_periodsService:
    """Service layer for Payroll_periods operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Payroll_periods]:
        """Create a new payroll_periods"""
        try:
            obj = Payroll_periods(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created payroll_periods with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating payroll_periods: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Payroll_periods]:
        """Get payroll_periods by ID"""
        try:
            query = select(Payroll_periods).where(Payroll_periods.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching payroll_periods {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of payroll_periodss"""
        try:
            query = select(Payroll_periods)
            count_query = select(func.count(Payroll_periods.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Payroll_periods, field):
                        query = query.where(getattr(Payroll_periods, field) == value)
                        count_query = count_query.where(getattr(Payroll_periods, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Payroll_periods, field_name):
                        query = query.order_by(getattr(Payroll_periods, field_name).desc())
                else:
                    if hasattr(Payroll_periods, sort):
                        query = query.order_by(getattr(Payroll_periods, sort))
            else:
                query = query.order_by(Payroll_periods.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching payroll_periods list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Payroll_periods]:
        """Update payroll_periods"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Payroll_periods {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated payroll_periods {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating payroll_periods {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete payroll_periods"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Payroll_periods {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted payroll_periods {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting payroll_periods {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Payroll_periods]:
        """Get payroll_periods by any field"""
        try:
            if not hasattr(Payroll_periods, field_name):
                raise ValueError(f"Field {field_name} does not exist on Payroll_periods")
            result = await self.db.execute(
                select(Payroll_periods).where(getattr(Payroll_periods, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching payroll_periods by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Payroll_periods]:
        """Get list of payroll_periodss filtered by field"""
        try:
            if not hasattr(Payroll_periods, field_name):
                raise ValueError(f"Field {field_name} does not exist on Payroll_periods")
            result = await self.db.execute(
                select(Payroll_periods)
                .where(getattr(Payroll_periods, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Payroll_periods.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching payroll_periodss by {field_name}: {str(e)}")
            raise