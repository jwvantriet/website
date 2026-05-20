import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.contact_submissions import Contact_submissions

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Contact_submissionsService:
    """Service layer for Contact_submissions operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Contact_submissions]:
        """Create a new contact_submissions"""
        try:
            obj = Contact_submissions(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created contact_submissions with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating contact_submissions: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Contact_submissions]:
        """Get contact_submissions by ID"""
        try:
            query = select(Contact_submissions).where(Contact_submissions.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching contact_submissions {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of contact_submissionss"""
        try:
            query = select(Contact_submissions)
            count_query = select(func.count(Contact_submissions.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Contact_submissions, field):
                        query = query.where(getattr(Contact_submissions, field) == value)
                        count_query = count_query.where(getattr(Contact_submissions, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Contact_submissions, field_name):
                        query = query.order_by(getattr(Contact_submissions, field_name).desc())
                else:
                    if hasattr(Contact_submissions, sort):
                        query = query.order_by(getattr(Contact_submissions, sort))
            else:
                query = query.order_by(Contact_submissions.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching contact_submissions list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Contact_submissions]:
        """Update contact_submissions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Contact_submissions {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated contact_submissions {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating contact_submissions {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete contact_submissions"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Contact_submissions {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted contact_submissions {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting contact_submissions {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Contact_submissions]:
        """Get contact_submissions by any field"""
        try:
            if not hasattr(Contact_submissions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Contact_submissions")
            result = await self.db.execute(
                select(Contact_submissions).where(getattr(Contact_submissions, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching contact_submissions by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Contact_submissions]:
        """Get list of contact_submissionss filtered by field"""
        try:
            if not hasattr(Contact_submissions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Contact_submissions")
            result = await self.db.execute(
                select(Contact_submissions)
                .where(getattr(Contact_submissions, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Contact_submissions.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching contact_submissionss by {field_name}: {str(e)}")
            raise