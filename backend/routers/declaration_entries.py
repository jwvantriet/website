import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.declaration_entries import Declaration_entriesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/declaration_entries", tags=["declaration_entries"])


# ---------- Pydantic Schemas ----------
class Declaration_entriesData(BaseModel):
    """Entity data schema (for create/update)"""
    payroll_period_id: int = None
    placement_id: int = None
    company_id: int = None
    declaration_date: str = None
    declaration_type_id: int = None
    imported_amount: float = None
    applicable_fee: float = None
    calculated_value: float = None
    status: str = None
    approval_stage: str = None
    source_file_ref: str = None
    notes: str = None
    created_at: str = None
    updated_at: str = None


class Declaration_entriesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    payroll_period_id: Optional[int] = None
    placement_id: Optional[int] = None
    company_id: Optional[int] = None
    declaration_date: Optional[str] = None
    declaration_type_id: Optional[int] = None
    imported_amount: Optional[float] = None
    applicable_fee: Optional[float] = None
    calculated_value: Optional[float] = None
    status: Optional[str] = None
    approval_stage: Optional[str] = None
    source_file_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Declaration_entriesResponse(BaseModel):
    """Entity response schema"""
    id: int
    payroll_period_id: Optional[int] = None
    placement_id: Optional[int] = None
    company_id: Optional[int] = None
    declaration_date: Optional[str] = None
    declaration_type_id: Optional[int] = None
    imported_amount: Optional[float] = None
    applicable_fee: Optional[float] = None
    calculated_value: Optional[float] = None
    status: Optional[str] = None
    approval_stage: Optional[str] = None
    source_file_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class Declaration_entriesListResponse(BaseModel):
    """List response schema"""
    items: List[Declaration_entriesResponse]
    total: int
    skip: int
    limit: int


class Declaration_entriesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Declaration_entriesData]


class Declaration_entriesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Declaration_entriesUpdateData


class Declaration_entriesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Declaration_entriesBatchUpdateItem]


class Declaration_entriesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Declaration_entriesListResponse)
async def query_declaration_entriess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query declaration_entriess with filtering, sorting, and pagination"""
    logger.debug(f"Querying declaration_entriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Declaration_entriesService(db)
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
        logger.debug(f"Found {result['total']} declaration_entriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying declaration_entriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Declaration_entriesListResponse)
async def query_declaration_entriess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query declaration_entriess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying declaration_entriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Declaration_entriesService(db)
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
        logger.debug(f"Found {result['total']} declaration_entriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying declaration_entriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Declaration_entriesResponse)
async def get_declaration_entries(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single declaration_entries by ID"""
    logger.debug(f"Fetching declaration_entries with id: {id}, fields={fields}")
    
    service = Declaration_entriesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Declaration_entries with id {id} not found")
            raise HTTPException(status_code=404, detail="Declaration_entries not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching declaration_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Declaration_entriesResponse, status_code=201)
async def create_declaration_entries(
    data: Declaration_entriesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new declaration_entries"""
    logger.debug(f"Creating new declaration_entries with data: {data}")
    
    service = Declaration_entriesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create declaration_entries")
        
        logger.info(f"Declaration_entries created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating declaration_entries: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating declaration_entries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Declaration_entriesResponse], status_code=201)
async def create_declaration_entriess_batch(
    request: Declaration_entriesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple declaration_entriess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} declaration_entriess")
    
    service = Declaration_entriesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} declaration_entriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Declaration_entriesResponse])
async def update_declaration_entriess_batch(
    request: Declaration_entriesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple declaration_entriess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} declaration_entriess")
    
    service = Declaration_entriesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} declaration_entriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Declaration_entriesResponse)
async def update_declaration_entries(
    id: int,
    data: Declaration_entriesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing declaration_entries"""
    logger.debug(f"Updating declaration_entries {id} with data: {data}")

    service = Declaration_entriesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Declaration_entries with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Declaration_entries not found")
        
        logger.info(f"Declaration_entries {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating declaration_entries {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating declaration_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_declaration_entriess_batch(
    request: Declaration_entriesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple declaration_entriess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} declaration_entriess")
    
    service = Declaration_entriesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} declaration_entriess successfully")
        return {"message": f"Successfully deleted {deleted_count} declaration_entriess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_declaration_entries(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single declaration_entries by ID"""
    logger.debug(f"Deleting declaration_entries with id: {id}")
    
    service = Declaration_entriesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Declaration_entries with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Declaration_entries not found")
        
        logger.info(f"Declaration_entries {id} deleted successfully")
        return {"message": "Declaration_entries deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting declaration_entries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")