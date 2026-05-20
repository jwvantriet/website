import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.platform_users import Platform_usersService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/platform_users", tags=["platform_users"])


# ---------- Pydantic Schemas ----------
class Platform_usersData(BaseModel):
    """Entity data schema (for create/update)"""
    auth_source: str = None
    role: str = None
    carerix_id: int = None
    company_id: int = None
    placement_id: int = None
    email: str = None
    name: str = None
    password_hash: str = None
    is_active: bool = None
    last_login: str = None
    created_at: str = None
    updated_at: str = None


class Platform_usersUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    auth_source: Optional[str] = None
    role: Optional[str] = None
    carerix_id: Optional[int] = None
    company_id: Optional[int] = None
    placement_id: Optional[int] = None
    email: Optional[str] = None
    name: Optional[str] = None
    password_hash: Optional[str] = None
    is_active: Optional[bool] = None
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Platform_usersResponse(BaseModel):
    """Entity response schema"""
    id: int
    auth_source: Optional[str] = None
    role: Optional[str] = None
    carerix_id: Optional[int] = None
    company_id: Optional[int] = None
    placement_id: Optional[int] = None
    email: Optional[str] = None
    name: Optional[str] = None
    password_hash: Optional[str] = None
    is_active: Optional[bool] = None
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class Platform_usersListResponse(BaseModel):
    """List response schema"""
    items: List[Platform_usersResponse]
    total: int
    skip: int
    limit: int


class Platform_usersBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Platform_usersData]


class Platform_usersBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Platform_usersUpdateData


class Platform_usersBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Platform_usersBatchUpdateItem]


class Platform_usersBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Platform_usersListResponse)
async def query_platform_userss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query platform_userss with filtering, sorting, and pagination"""
    logger.debug(f"Querying platform_userss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Platform_usersService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} platform_userss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying platform_userss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Platform_usersListResponse)
async def query_platform_userss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query platform_userss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying platform_userss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Platform_usersService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} platform_userss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying platform_userss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Platform_usersResponse)
async def get_platform_users(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single platform_users by ID"""
    logger.debug(f"Fetching platform_users with id: {id}, fields={fields}")
    
    service = Platform_usersService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Platform_users with id {id} not found")
            raise HTTPException(status_code=404, detail="Platform_users not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching platform_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Platform_usersResponse, status_code=201)
async def create_platform_users(
    data: Platform_usersData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new platform_users"""
    logger.debug(f"Creating new platform_users with data: {data}")
    
    service = Platform_usersService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create platform_users")
        
        logger.info(f"Platform_users created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating platform_users: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating platform_users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Platform_usersResponse], status_code=201)
async def create_platform_userss_batch(
    request: Platform_usersBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple platform_userss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} platform_userss")
    
    service = Platform_usersService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} platform_userss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Platform_usersResponse])
async def update_platform_userss_batch(
    request: Platform_usersBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple platform_userss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} platform_userss")
    
    service = Platform_usersService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} platform_userss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Platform_usersResponse)
async def update_platform_users(
    id: int,
    data: Platform_usersUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing platform_users"""
    logger.debug(f"Updating platform_users {id} with data: {data}")

    service = Platform_usersService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Platform_users with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Platform_users not found")
        
        logger.info(f"Platform_users {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating platform_users {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating platform_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_platform_userss_batch(
    request: Platform_usersBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple platform_userss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} platform_userss")
    
    service = Platform_usersService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} platform_userss successfully")
        return {"message": f"Successfully deleted {deleted_count} platform_userss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_platform_users(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single platform_users by ID"""
    logger.debug(f"Deleting platform_users with id: {id}")
    
    service = Platform_usersService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Platform_users with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Platform_users not found")
        
        logger.info(f"Platform_users {id} deleted successfully")
        return {"message": "Platform_users deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting platform_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")