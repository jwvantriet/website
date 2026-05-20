import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.crx_todos import Crx_todosService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/crx_todos", tags=["crx_todos"])


# ---------- Pydantic Schemas ----------
class Crx_todosData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    subject: str = None
    todo_name: str = None
    todo_title: str = None
    todo_type: str = None
    todo_type_key: int = None
    status: int = None
    status_display: str = None
    priority: int = None
    start_date: str = None
    end_date: str = None
    deadline: str = None
    location: str = None
    is_all_day: bool = None
    is_email: bool = None
    is_meeting: bool = None
    is_note: bool = None
    is_task: bool = None
    email_body: str = None
    notes_text: str = None
    from_address: str = None
    to_address: str = None
    cc_address: str = None
    employee_carerix_id: int = None
    vacancy_carerix_id: int = None
    company_carerix_id: int = None
    match_carerix_id: int = None
    job_carerix_id: int = None
    contact_carerix_id: int = None
    owner_display: str = None
    owner_carerix_id: int = None
    deleted: bool = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class Crx_todosUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    subject: Optional[str] = None
    todo_name: Optional[str] = None
    todo_title: Optional[str] = None
    todo_type: Optional[str] = None
    todo_type_key: Optional[int] = None
    status: Optional[int] = None
    status_display: Optional[str] = None
    priority: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    deadline: Optional[str] = None
    location: Optional[str] = None
    is_all_day: Optional[bool] = None
    is_email: Optional[bool] = None
    is_meeting: Optional[bool] = None
    is_note: Optional[bool] = None
    is_task: Optional[bool] = None
    email_body: Optional[str] = None
    notes_text: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    cc_address: Optional[str] = None
    employee_carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    match_carerix_id: Optional[int] = None
    job_carerix_id: Optional[int] = None
    contact_carerix_id: Optional[int] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class Crx_todosResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    subject: Optional[str] = None
    todo_name: Optional[str] = None
    todo_title: Optional[str] = None
    todo_type: Optional[str] = None
    todo_type_key: Optional[int] = None
    status: Optional[int] = None
    status_display: Optional[str] = None
    priority: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    deadline: Optional[str] = None
    location: Optional[str] = None
    is_all_day: Optional[bool] = None
    is_email: Optional[bool] = None
    is_meeting: Optional[bool] = None
    is_note: Optional[bool] = None
    is_task: Optional[bool] = None
    email_body: Optional[str] = None
    notes_text: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    cc_address: Optional[str] = None
    employee_carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    match_carerix_id: Optional[int] = None
    job_carerix_id: Optional[int] = None
    contact_carerix_id: Optional[int] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class Crx_todosListResponse(BaseModel):
    """List response schema"""
    items: List[Crx_todosResponse]
    total: int
    skip: int
    limit: int


class Crx_todosBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Crx_todosData]


class Crx_todosBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Crx_todosUpdateData


class Crx_todosBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Crx_todosBatchUpdateItem]


class Crx_todosBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Crx_todosListResponse)
async def query_crx_todoss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query crx_todoss with filtering, sorting, and pagination"""
    logger.debug(f"Querying crx_todoss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Crx_todosService(db)
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
        logger.debug(f"Found {result['total']} crx_todoss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_todoss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Crx_todosListResponse)
async def query_crx_todoss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query crx_todoss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying crx_todoss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Crx_todosService(db)
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
        logger.debug(f"Found {result['total']} crx_todoss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_todoss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Crx_todosResponse)
async def get_crx_todos(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single crx_todos by ID"""
    logger.debug(f"Fetching crx_todos with id: {id}, fields={fields}")
    
    service = Crx_todosService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Crx_todos with id {id} not found")
            raise HTTPException(status_code=404, detail="Crx_todos not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crx_todos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Crx_todosResponse, status_code=201)
async def create_crx_todos(
    data: Crx_todosData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new crx_todos"""
    logger.debug(f"Creating new crx_todos with data: {data}")
    
    service = Crx_todosService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create crx_todos")
        
        logger.info(f"Crx_todos created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating crx_todos: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating crx_todos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Crx_todosResponse], status_code=201)
async def create_crx_todoss_batch(
    request: Crx_todosBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple crx_todoss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} crx_todoss")
    
    service = Crx_todosService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} crx_todoss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Crx_todosResponse])
async def update_crx_todoss_batch(
    request: Crx_todosBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple crx_todoss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} crx_todoss")
    
    service = Crx_todosService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} crx_todoss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Crx_todosResponse)
async def update_crx_todos(
    id: int,
    data: Crx_todosUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing crx_todos"""
    logger.debug(f"Updating crx_todos {id} with data: {data}")

    service = Crx_todosService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Crx_todos with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Crx_todos not found")
        
        logger.info(f"Crx_todos {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating crx_todos {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating crx_todos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_crx_todoss_batch(
    request: Crx_todosBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple crx_todoss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} crx_todoss")
    
    service = Crx_todosService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} crx_todoss successfully")
        return {"message": f"Successfully deleted {deleted_count} crx_todoss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_crx_todos(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single crx_todos by ID"""
    logger.debug(f"Deleting crx_todos with id: {id}")
    
    service = Crx_todosService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Crx_todos with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Crx_todos not found")
        
        logger.info(f"Crx_todos {id} deleted successfully")
        return {"message": "Crx_todos deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting crx_todos {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")