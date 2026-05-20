import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.declaration_types import Declaration_typesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/declaration_types", tags=["declaration_types"])


# ---------- Pydantic Schemas ----------
class Declaration_typesData(BaseModel):
    """Entity data schema (for create/update)"""
    code: str = None
    label: str = None
    unit: str = None
    finance_mapping: str = None
    is_active: bool = None
    sort_order: int = None
    created_at: str = None


class Declaration_typesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    code: Optional[str] = None
    label: Optional[str] = None
    unit: Optional[str] = None
    finance_mapping: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    created_at: Optional[str] = None


class Declaration_typesResponse(BaseModel):
    """Entity response schema"""
    id: int
    code: Optional[str] = None
    label: Optional[str] = None
    unit: Optional[str] = None
    finance_mapping: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Declaration_typesListResponse(BaseModel):
    """List response schema"""
    items: List[Declaration_typesResponse]
    total: int
    skip: int
    limit: int


class Declaration_typesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Declaration_typesData]


class Declaration_typesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Declaration_typesUpdateData


class Declaration_typesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Declaration_typesBatchUpdateItem]


class Declaration_typesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Declaration_typesListResponse)
async def query_declaration_typess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query declaration_typess with filtering, sorting, and pagination"""
    logger.debug(f"Querying declaration_typess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Declaration_typesService(db)
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
        logger.debug(f"Found {result['total']} declaration_typess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying declaration_typess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Declaration_typesListResponse)
async def query_declaration_typess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query declaration_typess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying declaration_typess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Declaration_typesService(db)
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
        logger.debug(f"Found {result['total']} declaration_typess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying declaration_typess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Declaration_typesResponse)
async def get_declaration_types(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single declaration_types by ID"""
    logger.debug(f"Fetching declaration_types with id: {id}, fields={fields}")
    
    service = Declaration_typesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Declaration_types with id {id} not found")
            raise HTTPException(status_code=404, detail="Declaration_types not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching declaration_types {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Declaration_typesResponse, status_code=201)
async def create_declaration_types(
    data: Declaration_typesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new declaration_types"""
    logger.debug(f"Creating new declaration_types with data: {data}")
    
    service = Declaration_typesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create declaration_types")
        
        logger.info(f"Declaration_types created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating declaration_types: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating declaration_types: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Declaration_typesResponse], status_code=201)
async def create_declaration_typess_batch(
    request: Declaration_typesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple declaration_typess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} declaration_typess")
    
    service = Declaration_typesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} declaration_typess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Declaration_typesResponse])
async def update_declaration_typess_batch(
    request: Declaration_typesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple declaration_typess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} declaration_typess")
    
    service = Declaration_typesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} declaration_typess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Declaration_typesResponse)
async def update_declaration_types(
    id: int,
    data: Declaration_typesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing declaration_types"""
    logger.debug(f"Updating declaration_types {id} with data: {data}")

    service = Declaration_typesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Declaration_types with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Declaration_types not found")
        
        logger.info(f"Declaration_types {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating declaration_types {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating declaration_types {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_declaration_typess_batch(
    request: Declaration_typesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple declaration_typess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} declaration_typess")
    
    service = Declaration_typesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} declaration_typess successfully")
        return {"message": f"Successfully deleted {deleted_count} declaration_typess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_declaration_types(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single declaration_types by ID"""
    logger.debug(f"Deleting declaration_types with id: {id}")
    
    service = Declaration_typesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Declaration_types with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Declaration_types not found")
        
        logger.info(f"Declaration_types {id} deleted successfully")
        return {"message": "Declaration_types deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting declaration_types {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")