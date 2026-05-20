import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payroll_periods import Payroll_periodsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/payroll_periods", tags=["payroll_periods"])


# ---------- Pydantic Schemas ----------
class Payroll_periodsData(BaseModel):
    """Entity data schema (for create/update)"""
    month: int = None
    year: int = None
    start_date: str = None
    end_date: str = None
    status: str = None
    created_by: str = None
    finalized_at: str = None
    created_at: str = None
    updated_at: str = None


class Payroll_periodsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    month: Optional[int] = None
    year: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[str] = None
    finalized_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Payroll_periodsResponse(BaseModel):
    """Entity response schema"""
    id: int
    month: Optional[int] = None
    year: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[str] = None
    finalized_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class Payroll_periodsListResponse(BaseModel):
    """List response schema"""
    items: List[Payroll_periodsResponse]
    total: int
    skip: int
    limit: int


class Payroll_periodsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Payroll_periodsData]


class Payroll_periodsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Payroll_periodsUpdateData


class Payroll_periodsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Payroll_periodsBatchUpdateItem]


class Payroll_periodsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Payroll_periodsListResponse)
async def query_payroll_periodss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query payroll_periodss with filtering, sorting, and pagination"""
    logger.debug(f"Querying payroll_periodss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Payroll_periodsService(db)
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
        logger.debug(f"Found {result['total']} payroll_periodss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payroll_periodss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Payroll_periodsListResponse)
async def query_payroll_periodss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query payroll_periodss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying payroll_periodss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Payroll_periodsService(db)
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
        logger.debug(f"Found {result['total']} payroll_periodss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payroll_periodss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Payroll_periodsResponse)
async def get_payroll_periods(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payroll_periods by ID"""
    logger.debug(f"Fetching payroll_periods with id: {id}, fields={fields}")
    
    service = Payroll_periodsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Payroll_periods with id {id} not found")
            raise HTTPException(status_code=404, detail="Payroll_periods not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payroll_periods {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Payroll_periodsResponse, status_code=201)
async def create_payroll_periods(
    data: Payroll_periodsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new payroll_periods"""
    logger.debug(f"Creating new payroll_periods with data: {data}")
    
    service = Payroll_periodsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create payroll_periods")
        
        logger.info(f"Payroll_periods created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating payroll_periods: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating payroll_periods: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Payroll_periodsResponse], status_code=201)
async def create_payroll_periodss_batch(
    request: Payroll_periodsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple payroll_periodss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} payroll_periodss")
    
    service = Payroll_periodsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} payroll_periodss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Payroll_periodsResponse])
async def update_payroll_periodss_batch(
    request: Payroll_periodsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple payroll_periodss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} payroll_periodss")
    
    service = Payroll_periodsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} payroll_periodss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Payroll_periodsResponse)
async def update_payroll_periods(
    id: int,
    data: Payroll_periodsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing payroll_periods"""
    logger.debug(f"Updating payroll_periods {id} with data: {data}")

    service = Payroll_periodsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Payroll_periods with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Payroll_periods not found")
        
        logger.info(f"Payroll_periods {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating payroll_periods {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating payroll_periods {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_payroll_periodss_batch(
    request: Payroll_periodsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple payroll_periodss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} payroll_periodss")
    
    service = Payroll_periodsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} payroll_periodss successfully")
        return {"message": f"Successfully deleted {deleted_count} payroll_periodss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_payroll_periods(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single payroll_periods by ID"""
    logger.debug(f"Deleting payroll_periods with id: {id}")
    
    service = Payroll_periodsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Payroll_periods with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Payroll_periods not found")
        
        logger.info(f"Payroll_periods {id} deleted successfully")
        return {"message": "Payroll_periods deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payroll_periods {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")