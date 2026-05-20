import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.companies import Companies

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class CompaniesService:
    """Service layer for Companies operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Companies]:
        """Create a new companies"""
        try:
            obj = Companies(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created companies with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating companies: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Companies]:
        """Get companies by ID"""
        try:
            query = select(Companies).where(Companies.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching companies {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of companiess"""
        try:
            query = select(Companies)
            count_query = select(func.count(Companies.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Companies, field):
                        query = query.where(getattr(Companies, field) == value)
                        count_query = count_query.where(getattr(Companies, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Companies, field_name):
                        query = query.order_by(getattr(Companies, field_name).desc())
                else:
                    if hasattr(Companies, sort):
                        query = query.order_by(getattr(Companies, sort))
            else:
                query = query.order_by(Companies.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching companies list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Companies]:
        """Update companies"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Companies {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated companies {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating companies {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete companies"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Companies {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted companies {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting companies {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Companies]:
        """Get companies by any field"""
        try:
            if not hasattr(Companies, field_name):
                raise ValueError(f"Field {field_name} does not exist on Companies")
            result = await self.db.execute(
                select(Companies).where(getattr(Companies, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching companies by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Companies]:
        """Get list of companiess filtered by field"""
        try:
            if not hasattr(Companies, field_name):
                raise ValueError(f"Field {field_name} does not exist on Companies")
            result = await self.db.execute(
                select(Companies)
                .where(getattr(Companies, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Companies.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching companiess by {field_name}: {str(e)}")
            raise