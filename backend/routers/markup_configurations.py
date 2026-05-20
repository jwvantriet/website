import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.markup_configurations import Markup_configurationsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/markup_configurations", tags=["markup_configurations"])


# ---------- Pydantic Schemas ----------
class Markup_configurationsData(BaseModel):
    """Entity data schema (for create/update)"""
    company_id: int = None
    model_type: str = None
    percentage_value: float = None
    fixed_amount: float = None
    tier_definitions: str = None
    valid_from: str = None
    valid_to: str = None
    is_active: bool = None
    created_at: str = None
    updated_at: str = None


class Markup_configurationsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    company_id: Optional[int] = None
    model_type: Optional[str] = None
    percentage_value: Optional[float] = None
    fixed_amount: Optional[float] = None
    tier_definitions: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Markup_configurationsResponse(BaseModel):
    """Entity response schema"""
    id: int
    company_id: Optional[int] = None
    model_type: Optional[str] = None
    percentage_value: Optional[float] = None
    fixed_amount: Optional[float] = None
    tier_definitions: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class Markup_configurationsListResponse(BaseModel):
    """List response schema"""
    items: List[Markup_configurationsResponse]
    total: int
    skip: int
    limit: int


class Markup_configurationsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Markup_configurationsData]


class Markup_configurationsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Markup_configurationsUpdateData


class Markup_configurationsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Markup_configurationsBatchUpdateItem]


class Markup_configurationsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Markup_configurationsListResponse)
async def query_markup_configurationss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query markup_configurationss with filtering, sorting, and pagination"""
    logger.debug(f"Querying markup_configurationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Markup_configurationsService(db)
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
        logger.debug(f"Found {result['total']} markup_configurationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying markup_configurationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Markup_configurationsListResponse)
async def query_markup_configurationss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query markup_configurationss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying markup_configurationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Markup_configurationsService(db)
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
        logger.debug(f"Found {result['total']} markup_configurationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying markup_configurationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Markup_configurationsResponse)
async def get_markup_configurations(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single markup_configurations by ID"""
    logger.debug(f"Fetching markup_configurations with id: {id}, fields={fields}")
    
    service = Markup_configurationsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Markup_configurations with id {id} not found")
            raise HTTPException(status_code=404, detail="Markup_configurations not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching markup_configurations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Markup_configurationsResponse, status_code=201)
async def create_markup_configurations(
    data: Markup_configurationsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new markup_configurations"""
    logger.debug(f"Creating new markup_configurations with data: {data}")
    
    service = Markup_configurationsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create markup_configurations")
        
        logger.info(f"Markup_configurations created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating markup_configurations: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating markup_configurations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Markup_configurationsResponse], status_code=201)
async def create_markup_configurationss_batch(
    request: Markup_configurationsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple markup_configurationss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} markup_configurationss")
    
    service = Markup_configurationsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} markup_configurationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Markup_configurationsResponse])
async def update_markup_configurationss_batch(
    request: Markup_configurationsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple markup_configurationss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} markup_configurationss")
    
    service = Markup_configurationsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} markup_configurationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Markup_configurationsResponse)
async def update_markup_configurations(
    id: int,
    data: Markup_configurationsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing markup_configurations"""
    logger.debug(f"Updating markup_configurations {id} with data: {data}")

    service = Markup_configurationsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Markup_configurations with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Markup_configurations not found")
        
        logger.info(f"Markup_configurations {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating markup_configurations {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating markup_configurations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_markup_configurationss_batch(
    request: Markup_configurationsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple markup_configurationss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} markup_configurationss")
    
    service = Markup_configurationsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} markup_configurationss successfully")
        return {"message": f"Successfully deleted {deleted_count} markup_configurationss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_markup_configurations(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single markup_configurations by ID"""
    logger.debug(f"Deleting markup_configurations with id: {id}")
    
    service = Markup_configurationsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Markup_configurations with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Markup_configurations not found")
        
        logger.info(f"Markup_configurations {id} deleted successfully")
        return {"message": "Markup_configurations deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting markup_configurations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")