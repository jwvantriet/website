import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.crx_vacancies import Crx_vacanciesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/crx_vacancies", tags=["crx_vacancies"])


# ---------- Pydantic Schemas ----------
class Crx_vacanciesData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    vacancy_no: str = None
    job_title: str = None
    title_information: str = None
    intro_information: str = None
    vacancy_information: str = None
    offer_information: str = None
    company_information: str = None
    requirements: str = None
    additional_information: str = None
    contact_information: str = None
    application_contact_information: str = None
    training_information: str = None
    company_name: str = None
    company_carerix_id: int = None
    work_location: str = None
    work_city: str = None
    work_city_code: str = None
    work_postal_code: str = None
    work_street: str = None
    work_full_address: str = None
    start_date: str = None
    end_date: str = None
    deadline: str = None
    hours_per_week: float = None
    days_per_week: int = None
    fte: float = None
    min_salary: float = None
    max_salary: float = None
    salary_scale: str = None
    number_of_vacancies: int = None
    is_anonymous: bool = None
    is_hidden: bool = None
    is_template: bool = None
    has_bonus: bool = None
    has_company_car: bool = None
    match_count: int = None
    active_publications_count: int = None
    status_display: str = None
    status_indication_color: str = None
    owner_display: str = None
    owner_carerix_id: int = None
    source_info: str = None
    notes: str = None
    customer_reference: str = None
    deleted: bool = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class Crx_vacanciesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    vacancy_no: Optional[str] = None
    job_title: Optional[str] = None
    title_information: Optional[str] = None
    intro_information: Optional[str] = None
    vacancy_information: Optional[str] = None
    offer_information: Optional[str] = None
    company_information: Optional[str] = None
    requirements: Optional[str] = None
    additional_information: Optional[str] = None
    contact_information: Optional[str] = None
    application_contact_information: Optional[str] = None
    training_information: Optional[str] = None
    company_name: Optional[str] = None
    company_carerix_id: Optional[int] = None
    work_location: Optional[str] = None
    work_city: Optional[str] = None
    work_city_code: Optional[str] = None
    work_postal_code: Optional[str] = None
    work_street: Optional[str] = None
    work_full_address: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    deadline: Optional[str] = None
    hours_per_week: Optional[float] = None
    days_per_week: Optional[int] = None
    fte: Optional[float] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    salary_scale: Optional[str] = None
    number_of_vacancies: Optional[int] = None
    is_anonymous: Optional[bool] = None
    is_hidden: Optional[bool] = None
    is_template: Optional[bool] = None
    has_bonus: Optional[bool] = None
    has_company_car: Optional[bool] = None
    match_count: Optional[int] = None
    active_publications_count: Optional[int] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    notes: Optional[str] = None
    customer_reference: Optional[str] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class Crx_vacanciesResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    vacancy_no: Optional[str] = None
    job_title: Optional[str] = None
    title_information: Optional[str] = None
    intro_information: Optional[str] = None
    vacancy_information: Optional[str] = None
    offer_information: Optional[str] = None
    company_information: Optional[str] = None
    requirements: Optional[str] = None
    additional_information: Optional[str] = None
    contact_information: Optional[str] = None
    application_contact_information: Optional[str] = None
    training_information: Optional[str] = None
    company_name: Optional[str] = None
    company_carerix_id: Optional[int] = None
    work_location: Optional[str] = None
    work_city: Optional[str] = None
    work_city_code: Optional[str] = None
    work_postal_code: Optional[str] = None
    work_street: Optional[str] = None
    work_full_address: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    deadline: Optional[str] = None
    hours_per_week: Optional[float] = None
    days_per_week: Optional[int] = None
    fte: Optional[float] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    salary_scale: Optional[str] = None
    number_of_vacancies: Optional[int] = None
    is_anonymous: Optional[bool] = None
    is_hidden: Optional[bool] = None
    is_template: Optional[bool] = None
    has_bonus: Optional[bool] = None
    has_company_car: Optional[bool] = None
    match_count: Optional[int] = None
    active_publications_count: Optional[int] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    notes: Optional[str] = None
    customer_reference: Optional[str] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class Crx_vacanciesListResponse(BaseModel):
    """List response schema"""
    items: List[Crx_vacanciesResponse]
    total: int
    skip: int
    limit: int


class Crx_vacanciesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Crx_vacanciesData]


class Crx_vacanciesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Crx_vacanciesUpdateData


class Crx_vacanciesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Crx_vacanciesBatchUpdateItem]


class Crx_vacanciesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Crx_vacanciesListResponse)
async def query_crx_vacanciess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query crx_vacanciess with filtering, sorting, and pagination"""
    logger.debug(f"Querying crx_vacanciess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Crx_vacanciesService(db)
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
        logger.debug(f"Found {result['total']} crx_vacanciess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_vacanciess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Crx_vacanciesListResponse)
async def query_crx_vacanciess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query crx_vacanciess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying crx_vacanciess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Crx_vacanciesService(db)
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
        logger.debug(f"Found {result['total']} crx_vacanciess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_vacanciess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Crx_vacanciesResponse)
async def get_crx_vacancies(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single crx_vacancies by ID"""
    logger.debug(f"Fetching crx_vacancies with id: {id}, fields={fields}")
    
    service = Crx_vacanciesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Crx_vacancies with id {id} not found")
            raise HTTPException(status_code=404, detail="Crx_vacancies not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crx_vacancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Crx_vacanciesResponse, status_code=201)
async def create_crx_vacancies(
    data: Crx_vacanciesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new crx_vacancies"""
    logger.debug(f"Creating new crx_vacancies with data: {data}")
    
    service = Crx_vacanciesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create crx_vacancies")
        
        logger.info(f"Crx_vacancies created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating crx_vacancies: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating crx_vacancies: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Crx_vacanciesResponse], status_code=201)
async def create_crx_vacanciess_batch(
    request: Crx_vacanciesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple crx_vacanciess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} crx_vacanciess")
    
    service = Crx_vacanciesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} crx_vacanciess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Crx_vacanciesResponse])
async def update_crx_vacanciess_batch(
    request: Crx_vacanciesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple crx_vacanciess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} crx_vacanciess")
    
    service = Crx_vacanciesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} crx_vacanciess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Crx_vacanciesResponse)
async def update_crx_vacancies(
    id: int,
    data: Crx_vacanciesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing crx_vacancies"""
    logger.debug(f"Updating crx_vacancies {id} with data: {data}")

    service = Crx_vacanciesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Crx_vacancies with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Crx_vacancies not found")
        
        logger.info(f"Crx_vacancies {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating crx_vacancies {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating crx_vacancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_crx_vacanciess_batch(
    request: Crx_vacanciesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple crx_vacanciess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} crx_vacanciess")
    
    service = Crx_vacanciesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} crx_vacanciess successfully")
        return {"message": f"Successfully deleted {deleted_count} crx_vacanciess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_crx_vacancies(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single crx_vacancies by ID"""
    logger.debug(f"Deleting crx_vacancies with id: {id}")
    
    service = Crx_vacanciesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Crx_vacancies with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Crx_vacancies not found")
        
        logger.info(f"Crx_vacancies {id} deleted successfully")
        return {"message": "Crx_vacancies deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting crx_vacancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")