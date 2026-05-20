import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.employees import EmployeesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/employees", tags=["employees"])


# ---------- Pydantic Schemas ----------
class EmployeesData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    first_name: str = None
    last_name: str = None
    last_name_prefix: str = None
    initials: str = None
    full_first_names: str = None
    name: str = None
    title: str = None
    email_address: str = None
    email_address_business: str = None
    email_address_private: str = None
    phone_number: str = None
    phone_number_business: str = None
    mobile_number: str = None
    mobile_number_business: str = None
    address: str = None
    street: str = None
    house_number: str = None
    house_number_suffix: str = None
    postal_code: str = None
    city: str = None
    city_code: str = None
    birth_date: str = None
    birth_city: str = None
    gender_node: int = None
    age: int = None
    cv_summary: str = None
    employee_information: str = None
    experience_information: str = None
    education_information: str = None
    ambition: str = None
    hobbies: str = None
    notes: str = None
    skill_notes: str = None
    language_notes: str = None
    current_conditions: str = None
    current_employer_name: str = None
    current_salary: float = None
    min_salary: float = None
    salary: int = None
    available_date: str = None
    available_from_date: str = None
    hours_per_week: float = None
    days_per_week: int = None
    fte: float = None
    min_fte: float = None
    max_fte: float = None
    max_distance: int = None
    years_of_experience: int = None
    has_car: bool = None
    ranking: float = None
    rating: int = None
    engagement_score: int = None
    completeness_score: float = None
    status_display: str = None
    status_indication_color: str = None
    owner_display: str = None
    owner_carerix_id: int = None
    source_info: str = None
    active_job_count: int = None
    match_count: int = None
    is_confidential: bool = None
    deleted: bool = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class EmployeesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_name_prefix: Optional[str] = None
    initials: Optional[str] = None
    full_first_names: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    email_address: Optional[str] = None
    email_address_business: Optional[str] = None
    email_address_private: Optional[str] = None
    phone_number: Optional[str] = None
    phone_number_business: Optional[str] = None
    mobile_number: Optional[str] = None
    mobile_number_business: Optional[str] = None
    address: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    house_number_suffix: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    city_code: Optional[str] = None
    birth_date: Optional[str] = None
    birth_city: Optional[str] = None
    gender_node: Optional[int] = None
    age: Optional[int] = None
    cv_summary: Optional[str] = None
    employee_information: Optional[str] = None
    experience_information: Optional[str] = None
    education_information: Optional[str] = None
    ambition: Optional[str] = None
    hobbies: Optional[str] = None
    notes: Optional[str] = None
    skill_notes: Optional[str] = None
    language_notes: Optional[str] = None
    current_conditions: Optional[str] = None
    current_employer_name: Optional[str] = None
    current_salary: Optional[float] = None
    min_salary: Optional[float] = None
    salary: Optional[int] = None
    available_date: Optional[str] = None
    available_from_date: Optional[str] = None
    hours_per_week: Optional[float] = None
    days_per_week: Optional[int] = None
    fte: Optional[float] = None
    min_fte: Optional[float] = None
    max_fte: Optional[float] = None
    max_distance: Optional[int] = None
    years_of_experience: Optional[int] = None
    has_car: Optional[bool] = None
    ranking: Optional[float] = None
    rating: Optional[int] = None
    engagement_score: Optional[int] = None
    completeness_score: Optional[float] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    active_job_count: Optional[int] = None
    match_count: Optional[int] = None
    is_confidential: Optional[bool] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class EmployeesResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_name_prefix: Optional[str] = None
    initials: Optional[str] = None
    full_first_names: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    email_address: Optional[str] = None
    email_address_business: Optional[str] = None
    email_address_private: Optional[str] = None
    phone_number: Optional[str] = None
    phone_number_business: Optional[str] = None
    mobile_number: Optional[str] = None
    mobile_number_business: Optional[str] = None
    address: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    house_number_suffix: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    city_code: Optional[str] = None
    birth_date: Optional[str] = None
    birth_city: Optional[str] = None
    gender_node: Optional[int] = None
    age: Optional[int] = None
    cv_summary: Optional[str] = None
    employee_information: Optional[str] = None
    experience_information: Optional[str] = None
    education_information: Optional[str] = None
    ambition: Optional[str] = None
    hobbies: Optional[str] = None
    notes: Optional[str] = None
    skill_notes: Optional[str] = None
    language_notes: Optional[str] = None
    current_conditions: Optional[str] = None
    current_employer_name: Optional[str] = None
    current_salary: Optional[float] = None
    min_salary: Optional[float] = None
    salary: Optional[int] = None
    available_date: Optional[str] = None
    available_from_date: Optional[str] = None
    hours_per_week: Optional[float] = None
    days_per_week: Optional[int] = None
    fte: Optional[float] = None
    min_fte: Optional[float] = None
    max_fte: Optional[float] = None
    max_distance: Optional[int] = None
    years_of_experience: Optional[int] = None
    has_car: Optional[bool] = None
    ranking: Optional[float] = None
    rating: Optional[int] = None
    engagement_score: Optional[int] = None
    completeness_score: Optional[float] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    active_job_count: Optional[int] = None
    match_count: Optional[int] = None
    is_confidential: Optional[bool] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeesListResponse(BaseModel):
    """List response schema"""
    items: List[EmployeesResponse]
    total: int
    skip: int
    limit: int


class EmployeesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[EmployeesData]


class EmployeesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: EmployeesUpdateData


class EmployeesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[EmployeesBatchUpdateItem]


class EmployeesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=EmployeesListResponse)
async def query_employeess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query employeess with filtering, sorting, and pagination"""
    logger.debug(f"Querying employeess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = EmployeesService(db)
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
        logger.debug(f"Found {result['total']} employeess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying employeess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=EmployeesListResponse)
async def query_employeess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query employeess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying employeess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = EmployeesService(db)
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
        logger.debug(f"Found {result['total']} employeess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying employeess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=EmployeesResponse)
async def get_employees(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single employees by ID"""
    logger.debug(f"Fetching employees with id: {id}, fields={fields}")
    
    service = EmployeesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Employees with id {id} not found")
            raise HTTPException(status_code=404, detail="Employees not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employees {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=EmployeesResponse, status_code=201)
async def create_employees(
    data: EmployeesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new employees"""
    logger.debug(f"Creating new employees with data: {data}")
    
    service = EmployeesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create employees")
        
        logger.info(f"Employees created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating employees: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating employees: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[EmployeesResponse], status_code=201)
async def create_employeess_batch(
    request: EmployeesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple employeess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} employeess")
    
    service = EmployeesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} employeess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[EmployeesResponse])
async def update_employeess_batch(
    request: EmployeesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple employeess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} employeess")
    
    service = EmployeesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} employeess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=EmployeesResponse)
async def update_employees(
    id: int,
    data: EmployeesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing employees"""
    logger.debug(f"Updating employees {id} with data: {data}")

    service = EmployeesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Employees with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Employees not found")
        
        logger.info(f"Employees {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating employees {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating employees {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_employeess_batch(
    request: EmployeesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple employeess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} employeess")
    
    service = EmployeesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} employeess successfully")
        return {"message": f"Successfully deleted {deleted_count} employeess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_employees(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single employees by ID"""
    logger.debug(f"Deleting employees with id: {id}")
    
    service = EmployeesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Employees with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Employees not found")
        
        logger.info(f"Employees {id} deleted successfully")
        return {"message": "Employees deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employees {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")