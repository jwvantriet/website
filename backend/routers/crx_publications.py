import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.crx_publications import Crx_publicationsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/crx_publications", tags=["crx_publications"])


# ---------- Pydantic Schemas ----------
class Crx_publicationsData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    vacancy_carerix_id: int = None
    company_carerix_id: int = None
    title_information: str = None
    title_information_html: str = None
    intro_information: str = None
    intro_information_html: str = None
    vacancy_information: str = None
    vacancy_information_html: str = None
    requirements_information: str = None
    requirements_information_html: str = None
    offer_information: str = None
    offer_information_html: str = None
    company_information: str = None
    company_information_html: str = None
    application_contact_information: str = None
    application_contact_information_html: str = None
    function_contact_information: str = None
    function_contact_information_html: str = None
    work_location: str = None
    work_location_html: str = None
    vacancy_no: str = None
    vacancy_url: str = None
    apply_url: str = None
    campaign: str = None
    meta_tags: str = None
    publication_start: str = None
    publication_end: str = None
    status: int = None
    status_display: str = None
    closed: bool = None
    deleted: bool = None
    owner_display: str = None
    notes: str = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class Crx_publicationsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    title_information: Optional[str] = None
    title_information_html: Optional[str] = None
    intro_information: Optional[str] = None
    intro_information_html: Optional[str] = None
    vacancy_information: Optional[str] = None
    vacancy_information_html: Optional[str] = None
    requirements_information: Optional[str] = None
    requirements_information_html: Optional[str] = None
    offer_information: Optional[str] = None
    offer_information_html: Optional[str] = None
    company_information: Optional[str] = None
    company_information_html: Optional[str] = None
    application_contact_information: Optional[str] = None
    application_contact_information_html: Optional[str] = None
    function_contact_information: Optional[str] = None
    function_contact_information_html: Optional[str] = None
    work_location: Optional[str] = None
    work_location_html: Optional[str] = None
    vacancy_no: Optional[str] = None
    vacancy_url: Optional[str] = None
    apply_url: Optional[str] = None
    campaign: Optional[str] = None
    meta_tags: Optional[str] = None
    publication_start: Optional[str] = None
    publication_end: Optional[str] = None
    status: Optional[int] = None
    status_display: Optional[str] = None
    closed: Optional[bool] = None
    deleted: Optional[bool] = None
    owner_display: Optional[str] = None
    notes: Optional[str] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class Crx_publicationsResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    vacancy_carerix_id: Optional[int] = None
    company_carerix_id: Optional[int] = None
    title_information: Optional[str] = None
    title_information_html: Optional[str] = None
    intro_information: Optional[str] = None
    intro_information_html: Optional[str] = None
    vacancy_information: Optional[str] = None
    vacancy_information_html: Optional[str] = None
    requirements_information: Optional[str] = None
    requirements_information_html: Optional[str] = None
    offer_information: Optional[str] = None
    offer_information_html: Optional[str] = None
    company_information: Optional[str] = None
    company_information_html: Optional[str] = None
    application_contact_information: Optional[str] = None
    application_contact_information_html: Optional[str] = None
    function_contact_information: Optional[str] = None
    function_contact_information_html: Optional[str] = None
    work_location: Optional[str] = None
    work_location_html: Optional[str] = None
    vacancy_no: Optional[str] = None
    vacancy_url: Optional[str] = None
    apply_url: Optional[str] = None
    campaign: Optional[str] = None
    meta_tags: Optional[str] = None
    publication_start: Optional[str] = None
    publication_end: Optional[str] = None
    status: Optional[int] = None
    status_display: Optional[str] = None
    closed: Optional[bool] = None
    deleted: Optional[bool] = None
    owner_display: Optional[str] = None
    notes: Optional[str] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class Crx_publicationsListResponse(BaseModel):
    """List response schema"""
    items: List[Crx_publicationsResponse]
    total: int
    skip: int
    limit: int


class Crx_publicationsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Crx_publicationsData]


class Crx_publicationsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Crx_publicationsUpdateData


class Crx_publicationsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Crx_publicationsBatchUpdateItem]


class Crx_publicationsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Crx_publicationsListResponse)
async def query_crx_publicationss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query crx_publicationss with filtering, sorting, and pagination"""
    logger.debug(f"Querying crx_publicationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Crx_publicationsService(db)
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
        logger.debug(f"Found {result['total']} crx_publicationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_publicationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Crx_publicationsListResponse)
async def query_crx_publicationss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query crx_publicationss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying crx_publicationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Crx_publicationsService(db)
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
        logger.debug(f"Found {result['total']} crx_publicationss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying crx_publicationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Crx_publicationsResponse)
async def get_crx_publications(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single crx_publications by ID"""
    logger.debug(f"Fetching crx_publications with id: {id}, fields={fields}")
    
    service = Crx_publicationsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Crx_publications with id {id} not found")
            raise HTTPException(status_code=404, detail="Crx_publications not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crx_publications {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Crx_publicationsResponse, status_code=201)
async def create_crx_publications(
    data: Crx_publicationsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new crx_publications"""
    logger.debug(f"Creating new crx_publications with data: {data}")
    
    service = Crx_publicationsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create crx_publications")
        
        logger.info(f"Crx_publications created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating crx_publications: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating crx_publications: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Crx_publicationsResponse], status_code=201)
async def create_crx_publicationss_batch(
    request: Crx_publicationsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple crx_publicationss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} crx_publicationss")
    
    service = Crx_publicationsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} crx_publicationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Crx_publicationsResponse])
async def update_crx_publicationss_batch(
    request: Crx_publicationsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple crx_publicationss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} crx_publicationss")
    
    service = Crx_publicationsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} crx_publicationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Crx_publicationsResponse)
async def update_crx_publications(
    id: int,
    data: Crx_publicationsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing crx_publications"""
    logger.debug(f"Updating crx_publications {id} with data: {data}")

    service = Crx_publicationsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Crx_publications with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Crx_publications not found")
        
        logger.info(f"Crx_publications {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating crx_publications {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating crx_publications {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_crx_publicationss_batch(
    request: Crx_publicationsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple crx_publicationss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} crx_publicationss")
    
    service = Crx_publicationsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} crx_publicationss successfully")
        return {"message": f"Successfully deleted {deleted_count} crx_publicationss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_crx_publications(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single crx_publications by ID"""
    logger.debug(f"Deleting crx_publications with id: {id}")
    
    service = Crx_publicationsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Crx_publications with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Crx_publications not found")
        
        logger.info(f"Crx_publications {id} deleted successfully")
        return {"message": "Crx_publications deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting crx_publications {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")