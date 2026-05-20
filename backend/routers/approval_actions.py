import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.approval_actions import Approval_actionsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/approval_actions", tags=["approval_actions"])


# ---------- Pydantic Schemas ----------
class Approval_actionsData(BaseModel):
    """Entity data schema (for create/update)"""
    entity_type: str = None
    entity_id: int = None
    approval_stage: str = None
    approver_role: str = None
    approver_id: str = None
    approver_name: str = None
    action: str = None
    note: str = None
    created_at: str = None


class Approval_actionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    approval_stage: Optional[str] = None
    approver_role: Optional[str] = None
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    action: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[str] = None


class Approval_actionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    approval_stage: Optional[str] = None
    approver_role: Optional[str] = None
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    action: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Approval_actionsListResponse(BaseModel):
    """List response schema"""
    items: List[Approval_actionsResponse]
    total: int
    skip: int
    limit: int


class Approval_actionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Approval_actionsData]


class Approval_actionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Approval_actionsUpdateData


class Approval_actionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Approval_actionsBatchUpdateItem]


class Approval_actionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Approval_actionsListResponse)
async def query_approval_actionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query approval_actionss with filtering, sorting, and pagination"""
    logger.debug(f"Querying approval_actionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Approval_actionsService(db)
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
        logger.debug(f"Found {result['total']} approval_actionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying approval_actionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Approval_actionsListResponse)
async def query_approval_actionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query approval_actionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying approval_actionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Approval_actionsService(db)
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
        logger.debug(f"Found {result['total']} approval_actionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying approval_actionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Approval_actionsResponse)
async def get_approval_actions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single approval_actions by ID"""
    logger.debug(f"Fetching approval_actions with id: {id}, fields={fields}")
    
    service = Approval_actionsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Approval_actions with id {id} not found")
            raise HTTPException(status_code=404, detail="Approval_actions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching approval_actions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Approval_actionsResponse, status_code=201)
async def create_approval_actions(
    data: Approval_actionsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new approval_actions"""
    logger.debug(f"Creating new approval_actions with data: {data}")
    
    service = Approval_actionsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create approval_actions")
        
        logger.info(f"Approval_actions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating approval_actions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating approval_actions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Approval_actionsResponse], status_code=201)
async def create_approval_actionss_batch(
    request: Approval_actionsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple approval_actionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} approval_actionss")
    
    service = Approval_actionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} approval_actionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Approval_actionsResponse])
async def update_approval_actionss_batch(
    request: Approval_actionsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple approval_actionss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} approval_actionss")
    
    service = Approval_actionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} approval_actionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Approval_actionsResponse)
async def update_approval_actions(
    id: int,
    data: Approval_actionsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing approval_actions"""
    logger.debug(f"Updating approval_actions {id} with data: {data}")

    service = Approval_actionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Approval_actions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Approval_actions not found")
        
        logger.info(f"Approval_actions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating approval_actions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating approval_actions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_approval_actionss_batch(
    request: Approval_actionsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple approval_actionss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} approval_actionss")
    
    service = Approval_actionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} approval_actionss successfully")
        return {"message": f"Successfully deleted {deleted_count} approval_actionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_approval_actions(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single approval_actions by ID"""
    logger.debug(f"Deleting approval_actions with id: {id}")
    
    service = Approval_actionsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Approval_actions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Approval_actions not found")
        
        logger.info(f"Approval_actions {id} deleted successfully")
        return {"message": "Approval_actions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting approval_actions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")