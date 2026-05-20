import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.correction_requests import Correction_requestsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/correction_requests", tags=["correction_requests"])


# ---------- Pydantic Schemas ----------
class Correction_requestsData(BaseModel):
    """Entity data schema (for create/update)"""
    declaration_entry_id: int = None
    payroll_period_id: int = None
    placement_id: int = None
    company_id: int = None
    declaration_type_id: int = None
    requested_amount: float = None
    reason: str = None
    status: str = None
    decline_reason: str = None
    included_in_run: bool = None
    created_by: str = None
    approved_by: str = None
    created_at: str = None
    approved_at: str = None


class Correction_requestsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    declaration_entry_id: Optional[int] = None
    payroll_period_id: Optional[int] = None
    placement_id: Optional[int] = None
    company_id: Optional[int] = None
    declaration_type_id: Optional[int] = None
    requested_amount: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    decline_reason: Optional[str] = None
    included_in_run: Optional[bool] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[str] = None
    approved_at: Optional[str] = None


class Correction_requestsResponse(BaseModel):
    """Entity response schema"""
    id: int
    declaration_entry_id: Optional[int] = None
    payroll_period_id: Optional[int] = None
    placement_id: Optional[int] = None
    company_id: Optional[int] = None
    declaration_type_id: Optional[int] = None
    requested_amount: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    decline_reason: Optional[str] = None
    included_in_run: Optional[bool] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[str] = None
    approved_at: Optional[str] = None

    class Config:
        from_attributes = True


class Correction_requestsListResponse(BaseModel):
    """List response schema"""
    items: List[Correction_requestsResponse]
    total: int
    skip: int
    limit: int


class Correction_requestsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Correction_requestsData]


class Correction_requestsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Correction_requestsUpdateData


class Correction_requestsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Correction_requestsBatchUpdateItem]


class Correction_requestsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Correction_requestsListResponse)
async def query_correction_requestss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query correction_requestss with filtering, sorting, and pagination"""
    logger.debug(f"Querying correction_requestss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Correction_requestsService(db)
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
        logger.debug(f"Found {result['total']} correction_requestss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying correction_requestss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Correction_requestsListResponse)
async def query_correction_requestss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query correction_requestss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying correction_requestss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Correction_requestsService(db)
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
        logger.debug(f"Found {result['total']} correction_requestss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying correction_requestss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Correction_requestsResponse)
async def get_correction_requests(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single correction_requests by ID"""
    logger.debug(f"Fetching correction_requests with id: {id}, fields={fields}")
    
    service = Correction_requestsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Correction_requests with id {id} not found")
            raise HTTPException(status_code=404, detail="Correction_requests not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching correction_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Correction_requestsResponse, status_code=201)
async def create_correction_requests(
    data: Correction_requestsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new correction_requests"""
    logger.debug(f"Creating new correction_requests with data: {data}")
    
    service = Correction_requestsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create correction_requests")
        
        logger.info(f"Correction_requests created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating correction_requests: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating correction_requests: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Correction_requestsResponse], status_code=201)
async def create_correction_requestss_batch(
    request: Correction_requestsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple correction_requestss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} correction_requestss")
    
    service = Correction_requestsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} correction_requestss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Correction_requestsResponse])
async def update_correction_requestss_batch(
    request: Correction_requestsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple correction_requestss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} correction_requestss")
    
    service = Correction_requestsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} correction_requestss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Correction_requestsResponse)
async def update_correction_requests(
    id: int,
    data: Correction_requestsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing correction_requests"""
    logger.debug(f"Updating correction_requests {id} with data: {data}")

    service = Correction_requestsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Correction_requests with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Correction_requests not found")
        
        logger.info(f"Correction_requests {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating correction_requests {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating correction_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_correction_requestss_batch(
    request: Correction_requestsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple correction_requestss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} correction_requestss")
    
    service = Correction_requestsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} correction_requestss successfully")
        return {"message": f"Successfully deleted {deleted_count} correction_requestss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_correction_requests(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single correction_requests by ID"""
    logger.debug(f"Deleting correction_requests with id: {id}")
    
    service = Correction_requestsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Correction_requests with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Correction_requests not found")
        
        logger.info(f"Correction_requests {id} deleted successfully")
        return {"message": "Correction_requests deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting correction_requests {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")