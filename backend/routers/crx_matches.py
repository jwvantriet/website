import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.crx_matches import Crx_matchesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/crx_matches", tags=["crx_matches"])


# ---------- Pydantic Schemas ----------
class Crx_matchesData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    match_title: str = None
    employee_carerix_id: int = None
    vacancy_carerix_id: int = None
    company_carerix_id: int = None
    publication_carerix_id: int = None
    status_display: str = None
    status_indication_color: str = None
    motivation: str = None
    notes: str = None
    fit_score: int = None
    fit_gap: str = None
    cv_summary: str = None
    salary: float = None
    agreed_salary: str = None
    cost_price: float = None
    selling_price: float = None
    purchase_rate: float = None
    invoice_rate: float = None
    wage_rate: float = None
    margin_amount: float = None
    margin_percentage: float = None
    margin_ok: bool = None
    sales_factor: float = None
    sort_order: int = None
    source_info: str = None
    apply_source: str = None
    apply_medium: str = None
    apply_campaign: str = None
    apply_content: str = None
    apply_term: str = None
    job_start_date: str = None
    is_overdue: bool = None
    owner_display: str = None
    owner_carerix_id: int = None
    deleted: bool = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class Crx_matchesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    match_title: Optional[str] = None
    employee_carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    publication_carerix_id: Optional[int] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    motivation: Optional[str] = None
    notes: Optional[str] = None
    fit_score: Optional[int] = None
    fit_gap: Optional[str] = None
    cv_summary: Optional[str] = None
    salary: Optional[float] = None
    agreed_salary: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    purchase_rate: Optional[float] = None
    invoice_rate: Optional[float] = None
    wage_rate: Optional[float] = None
    margin_amount: Optional[float] = None
    margin_percentage: Optional[float] = None
    margin_ok: Optional[bool] = None
    sales_factor: Optional[float] = None
    sort_order: Optional[int] = None
    source_info: Optional[str] = None
    apply_source: Optional[str] = None
    apply_medium: Optional[str] = None
    apply_campaign: Optional[str] = None
    apply_content: Optional[str] = None
    apply_term: Optional[str] = None
    job_start_date: Optional[str] = None
    is_overdue: Optional[bool] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class Crx_matchesResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    match_title: Optional[str] = None
    employee_carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    publication_carerix_id: Optional[int] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    motivation: Optional[str] = None
    notes: Optional[str] = None
    fit_score: Optional[int] = None
    fit_gap: Optional[str] = None
    cv_summary: Optional[str] = None
    salary: Optional[float] = None
    agreed_salary: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    purchase_rate: Optional[float] = None
    invoice_rate: Optional[float] = None
    wage_rate: Optional[float] = None
    margin_amount: Optional[float] = None
    margin_percentage: Optional[float] = None
    margin_ok: Optional[bool] = None
    sales_factor: Optional[float] = None
    sort_order: Optional[int] = None
    source_info: Optional[str] = None
    apply_source: Optional[str] = None
    apply_medium: Optional[str] = None
    apply_campaign: Optional[str] = None
    apply_content: Optional[str] = None
    apply_term: Optional[str] = None
    job_start_date: Optional[str] = None
    is_overdue: Optional[bool] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class Crx_matchesListResponse(BaseModel):
    """List response schema"""
    items: List[Crx_matchesResponse]
    total: int
    skip: int
    limit: int


class Crx_matchesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Crx_matchesData]


class Crx_matchesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Crx_matchesUpdateData


class Crx_matchesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Crx_matchesBatchUpdateItem]


class Crx_matchesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Crx_matchesListResponse)
async def query_crx_matchess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query crx_matchess with filtering, sorting, and pagination"""
    logger.debug(f"Querying crx_matchess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Crx_matchesService(db)
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
        logger.debug(f"Found {result['total']} crx_matchess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_matchess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Crx_matchesListResponse)
async def query_crx_matchess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query crx_matchess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying crx_matchess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Crx_matchesService(db)
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
        logger.debug(f"Found {result['total']} crx_matchess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_matchess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Crx_matchesResponse)
async def get_crx_matches(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single crx_matches by ID"""
    logger.debug(f"Fetching crx_matches with id: {id}, fields={fields}")
    
    service = Crx_matchesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Crx_matches with id {id} not found")
            raise HTTPException(status_code=404, detail="Crx_matches not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crx_matches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Crx_matchesResponse, status_code=201)
async def create_crx_matches(
    data: Crx_matchesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new crx_matches"""
    logger.debug(f"Creating new crx_matches with data: {data}")
    
    service = Crx_matchesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create crx_matches")
        
        logger.info(f"Crx_matches created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating crx_matches: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating crx_matches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Crx_matchesResponse], status_code=201)
async def create_crx_matchess_batch(
    request: Crx_matchesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple crx_matchess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} crx_matchess")
    
    service = Crx_matchesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} crx_matchess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Crx_matchesResponse])
async def update_crx_matchess_batch(
    request: Crx_matchesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple crx_matchess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} crx_matchess")
    
    service = Crx_matchesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} crx_matchess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Crx_matchesResponse)
async def update_crx_matches(
    id: int,
    data: Crx_matchesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing crx_matches"""
    logger.debug(f"Updating crx_matches {id} with data: {data}")

    service = Crx_matchesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Crx_matches with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Crx_matches not found")
        
        logger.info(f"Crx_matches {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating crx_matches {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating crx_matches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_crx_matchess_batch(
    request: Crx_matchesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple crx_matchess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} crx_matchess")
    
    service = Crx_matchesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} crx_matchess successfully")
        return {"message": f"Successfully deleted {deleted_count} crx_matchess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_crx_matches(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single crx_matches by ID"""
    logger.debug(f"Deleting crx_matches with id: {id}")
    
    service = Crx_matchesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Crx_matches with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Crx_matches not found")
        
        logger.info(f"Crx_matches {id} deleted successfully")
        return {"message": "Crx_matches deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting crx_matches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")