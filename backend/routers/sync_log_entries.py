import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.sync_log_entries import Sync_log_entriesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/sync_log_entries", tags=["sync_log_entries"])


# ---------- Pydantic Schemas ----------
class Sync_log_entriesData(BaseModel):
    """Entity data schema (for create/update)"""
    entity_type: str = None
    sync_type: str = None
    started_at: str = None
    completed_at: str = None
    records_fetched: int = None
    records_created: int = None
    records_updated: int = None
    records_deleted: int = None
    sync_status: str = None
    error_message: str = None
    filter_used: str = None
    carerix_query_time_ms: int = None


class Sync_log_entriesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    entity_type: Optional[str] = None
    sync_type: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    records_fetched: Optional[int] = None
    records_created: Optional[int] = None
    records_updated: Optional[int] = None
    records_deleted: Optional[int] = None
    sync_status: Optional[str] = None
    error_message: Optional[str] = None
    filter_used: Optional[str] = None
    carerix_query_time_ms: Optional[int] = None


class Sync_log_entriesResponse(BaseModel):
    """Entity response schema"""
    id: int
    entity_type: Optional[str] = None
    sync_type: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    records_fetched: Optional[int] = None
    records_created: Optional[int] = None
    records_updated: Optional[int] = None
    records_deleted: Optional[int] = None
    sync_status: Optional[str] = None
    error_message: Optional[str] = None
    filter_used: Optional[str] = None
    carerix_query_time_ms: Optional[int] = None

    class Config:
        from_attributes = True


class Sync_log_entriesListResponse(BaseModel):
    """List response schema"""
    items: List[Sync_log_entriesResponse]
    total: int
    skip: int
    limit: int


class Sync_log_entriesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Sync_log_entriesData]


class Sync_log_entriesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Sync_log_entriesUpdateData


class Sync_log_entriesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Sync_log_entriesBatchUpdateItem]


class Sync_log_entriesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Sync_log_entriesListResponse)
async def query_sync_log_entriess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query sync_log_entriess with filtering, sorting, and pagination"""
    logger.debug(f"Querying sync_log_entriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Sync_log_entriesService(db)
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
        logger.debug(f"Found {result['total']} sync_log_entriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sync_log_entriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Sync_log_entriesListResponse)
async def query_sync_log_entriess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query sync_log_entriess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying sync_log_entriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Sync_log_entriesService(db)
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
        logger.debug(f"Found {result['total']} sync_log_entriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sync_log_entriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Sync_log_entriesResponse)
async def get_sync_log_entries(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sync_log_entries by ID"""
    logger.debug(f"Fetching sync_log_entries with id: {id}, fields={fields}")
    
    service = Sync_log_entriesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Sync_log_entries with id {id} not found")
            raise HTTPException(status_code=404, detail="Sync_log_entries not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sync_log_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Sync_log_entriesResponse, status_code=201)
async def create_sync_log_entries(
    data: Sync_log_entriesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new sync_log_entries"""
    logger.debug(f"Creating new sync_log_entries with data: {data}")
    
    service = Sync_log_entriesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create sync_log_entries")
        
        logger.info(f"Sync_log_entries created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating sync_log_entries: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sync_log_entries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Sync_log_entriesResponse], status_code=201)
async def create_sync_log_entriess_batch(
    request: Sync_log_entriesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sync_log_entriess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} sync_log_entriess")
    
    service = Sync_log_entriesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} sync_log_entriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Sync_log_entriesResponse])
async def update_sync_log_entriess_batch(
    request: Sync_log_entriesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple sync_log_entriess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} sync_log_entriess")
    
    service = Sync_log_entriesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} sync_log_entriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Sync_log_entriesResponse)
async def update_sync_log_entries(
    id: int,
    data: Sync_log_entriesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sync_log_entries"""
    logger.debug(f"Updating sync_log_entries {id} with data: {data}")

    service = Sync_log_entriesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Sync_log_entries with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Sync_log_entries not found")
        
        logger.info(f"Sync_log_entries {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating sync_log_entries {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating sync_log_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_sync_log_entriess_batch(
    request: Sync_log_entriesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple sync_log_entriess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} sync_log_entriess")
    
    service = Sync_log_entriesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} sync_log_entriess successfully")
        return {"message": f"Successfully deleted {deleted_count} sync_log_entriess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_sync_log_entries(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single sync_log_entries by ID"""
    logger.debug(f"Deleting sync_log_entries with id: {id}")
    
    service = Sync_log_entriesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Sync_log_entries with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Sync_log_entries not found")
        
        logger.info(f"Sync_log_entries {id} deleted successfully")
        return {"message": "Sync_log_entries deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sync_log_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")