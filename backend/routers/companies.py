import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.companies import CompaniesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/companies", tags=["companies"])


# ---------- Pydantic Schemas ----------
class CompaniesData(BaseModel):
    """Entity data schema (for create/update)"""
    carerix_id: int = None
    name: str = None
    short_name: str = None
    division: str = None
    company_information: str = None
    company_profile: str = None
    email_address: str = None
    phone_number: str = None
    fax_number: str = None
    url: str = None
    linkedin_url: str = None
    visit_address: str = None
    visit_street: str = None
    visit_number: str = None
    visit_number_suffix: str = None
    visit_postal_code: str = None
    visit_city: str = None
    visit_city_code: str = None
    mailing_address: str = None
    mailing_street: str = None
    mailing_number: str = None
    mailing_number_suffix: str = None
    mailing_postal_code: str = None
    mailing_city: str = None
    mailing_city_code: str = None
    invoice_address: str = None
    invoice_city: str = None
    invoice_postal_code: str = None
    invoice_email_address: str = None
    debtor_number: str = None
    kvk_number: str = None
    tax_number: str = None
    company_size: int = None
    revenue: float = None
    fee_percentage: float = None
    branche_level1: str = None
    branche_level2: str = None
    status_display: str = None
    status_indication_color: str = None
    owner_display: str = None
    owner_carerix_id: int = None
    parent_carerix_id: int = None
    source_info: str = None
    notes: str = None
    is_competitor: bool = None
    is_supplier: bool = None
    deleted: bool = None
    carerix_created_date: str = None
    carerix_modified_date: str = None
    raw_json: str = None


class CompaniesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    carerix_id: Optional[int] = None
    name: Optional[str] = None
    short_name: Optional[str] = None
    division: Optional[str] = None
    company_information: Optional[str] = None
    company_profile: Optional[str] = None
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    fax_number: Optional[str] = None
    url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visit_address: Optional[str] = None
    visit_street: Optional[str] = None
    visit_number: Optional[str] = None
    visit_number_suffix: Optional[str] = None
    visit_postal_code: Optional[str] = None
    visit_city: Optional[str] = None
    visit_city_code: Optional[str] = None
    mailing_address: Optional[str] = None
    mailing_street: Optional[str] = None
    mailing_number: Optional[str] = None
    mailing_number_suffix: Optional[str] = None
    mailing_postal_code: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_city_code: Optional[str] = None
    invoice_address: Optional[str] = None
    invoice_city: Optional[str] = None
    invoice_postal_code: Optional[str] = None
    invoice_email_address: Optional[str] = None
    debtor_number: Optional[str] = None
    kvk_number: Optional[str] = None
    tax_number: Optional[str] = None
    company_size: Optional[int] = None
    revenue: Optional[float] = None
    fee_percentage: Optional[float] = None
    branche_level1: Optional[str] = None
    branche_level2: Optional[str] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    parent_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    notes: Optional[str] = None
    is_competitor: Optional[bool] = None
    is_supplier: Optional[bool] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None


class CompaniesResponse(BaseModel):
    """Entity response schema"""
    id: int
    carerix_id: Optional[int] = None
    name: Optional[str] = None
    short_name: Optional[str] = None
    division: Optional[str] = None
    company_information: Optional[str] = None
    company_profile: Optional[str] = None
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    fax_number: Optional[str] = None
    url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visit_address: Optional[str] = None
    visit_street: Optional[str] = None
    visit_number: Optional[str] = None
    visit_number_suffix: Optional[str] = None
    visit_postal_code: Optional[str] = None
    visit_city: Optional[str] = None
    visit_city_code: Optional[str] = None
    mailing_address: Optional[str] = None
    mailing_street: Optional[str] = None
    mailing_number: Optional[str] = None
    mailing_number_suffix: Optional[str] = None
    mailing_postal_code: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_city_code: Optional[str] = None
    invoice_address: Optional[str] = None
    invoice_city: Optional[str] = None
    invoice_postal_code: Optional[str] = None
    invoice_email_address: Optional[str] = None
    debtor_number: Optional[str] = None
    kvk_number: Optional[str] = None
    tax_number: Optional[str] = None
    company_size: Optional[int] = None
    revenue: Optional[float] = None
    fee_percentage: Optional[float] = None
    branche_level1: Optional[str] = None
    branche_level2: Optional[str] = None
    status_display: Optional[str] = None
    status_indication_color: Optional[str] = None
    owner_display: Optional[str] = None
    owner_carerix_id: Optional[int] = None
    parent_carerix_id: Optional[int] = None
    source_info: Optional[str] = None
    notes: Optional[str] = None
    is_competitor: Optional[bool] = None
    is_supplier: Optional[bool] = None
    deleted: Optional[bool] = None
    carerix_created_date: Optional[str] = None
    carerix_modified_date: Optional[str] = None
    raw_json: Optional[str] = None

    class Config:
        from_attributes = True


class CompaniesListResponse(BaseModel):
    """List response schema"""
    items: List[CompaniesResponse]
    total: int
    skip: int
    limit: int


class CompaniesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[CompaniesData]


class CompaniesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: CompaniesUpdateData


class CompaniesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[CompaniesBatchUpdateItem]


class CompaniesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=CompaniesListResponse)
async def query_companiess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query companiess with filtering, sorting, and pagination"""
    logger.debug(f"Querying companiess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = CompaniesService(db)
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
        logger.debug(f"Found {result['total']} companiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying companiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=CompaniesListResponse)
async def query_companiess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query companiess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying companiess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = CompaniesService(db)
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
        logger.debug(f"Found {result['total']} companiess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying companiess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=CompaniesResponse)
async def get_companies(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single companies by ID"""
    logger.debug(f"Fetching companies with id: {id}, fields={fields}")
    
    service = CompaniesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Companies with id {id} not found")
            raise HTTPException(status_code=404, detail="Companies not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching companies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=CompaniesResponse, status_code=201)
async def create_companies(
    data: CompaniesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new companies"""
    logger.debug(f"Creating new companies with data: {data}")
    
    service = CompaniesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create companies")
        
        logger.info(f"Companies created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating companies: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating companies: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[CompaniesResponse], status_code=201)
async def create_companiess_batch(
    request: CompaniesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple companiess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} companiess")
    
    service = CompaniesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} companiess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[CompaniesResponse])
async def update_companiess_batch(
    request: CompaniesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple companiess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} companiess")
    
    service = CompaniesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} companiess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=CompaniesResponse)
async def update_companies(
    id: int,
    data: CompaniesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing companies"""
    logger.debug(f"Updating companies {id} with data: {data}")

    service = CompaniesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Companies with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Companies not found")
        
        logger.info(f"Companies {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating companies {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating companies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_companiess_batch(
    request: CompaniesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple companiess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} companiess")
    
    service = CompaniesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} companiess successfully")
        return {"message": f"Successfully deleted {deleted_count} companiess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_companies(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single companies by ID"""
    logger.debug(f"Deleting companies with id: {id}")
    
    service = CompaniesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Companies with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Companies not found")
        
        logger.info(f"Companies {id} deleted successfully")
        return {"message": "Companies deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting companies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")