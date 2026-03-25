import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.modules.complaints.schemas import (
    ComplaintListOut,
    ComplaintOut,
    DashboardStats,
    UploadResult,
)
from src.modules.complaints.analytics import (
    get_category_detail_analysis,
    get_content_classification,
    get_daily_dynamics,
    get_grouped_categories,
    get_insights,
    get_monthly_dynamics,
    get_org_detail,
    get_report,
    get_resolution_analysis,
    get_source_analysis,
    get_trend_analysis,
)
from src.modules.complaints.service import (
    get_complaints,
    get_dashboard_stats,
    get_filter_options,
    parse_excel,
    upsert_complaints,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])


@router.post("/upload", response_model=UploadResult)
async def upload_excel(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
):
    """Upload an Excel file and parse complaints into the database."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xls files are accepted")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        complaints, date_range = parse_excel(content)
    except Exception as e:
        logger.error("Failed to parse Excel: %s", e)
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {e}")

    if not complaints:
        raise HTTPException(status_code=400, detail="No complaint records found in file")

    result = await upsert_complaints(db, complaints)
    logger.info("Upload complete: %s", result)
    return result


@router.get("", response_model=ComplaintListOut)
async def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    district: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List complaints with pagination and filters."""
    items, total = await get_complaints(
        db, page=page, page_size=page_size,
        district=district, category=category,
        status=status, search=search, org=org,
        date_from=date_from, date_to=date_to,
    )
    return ComplaintListOut(
        items=[ComplaintOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics."""
    return await get_dashboard_stats(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/filters")
async def filters(db: AsyncSession = Depends(get_db)):
    """Get filter dropdown options."""
    return await get_filter_options(db)


@router.get("/analytics/monthly")
async def monthly(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Monthly complaint dynamics by type."""
    return await get_monthly_dynamics(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/trends")
async def trends(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Trend analysis: daily volumes, category growth/decline."""
    return await get_trend_analysis(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/resolution")
async def resolution(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Resolution analysis: rates by category/district, org performance."""
    return await get_resolution_analysis(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/content")
async def content(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Content classification: themes, edge cases, flags."""
    return await get_content_classification(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/insights")
async def insights(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generated insights and recommendations."""
    return await get_insights(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/categories")
async def category_analysis(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Content-based category analysis with responses and org breakdown."""
    return await get_category_detail_analysis(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/sources")
async def sources(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Source analysis by complaint ID prefix."""
    return await get_source_analysis(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/daily")
async def daily_dynamics(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Daily dynamics with trend line and spike annotations."""
    return await get_daily_dynamics(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/grouped-categories")
async def grouped_categories(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Category analysis grouped into parent groups."""
    return await get_grouped_categories(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/analytics/org-detail")
async def org_detail(
    org: str = Query(...),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Detailed category breakdown for a specific org."""
    return await get_org_detail(db, org=org, date_from=date_from, date_to=date_to)


@router.get("/report")
async def report(
    org: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Full report matching PDF analysis format."""
    return await get_report(db, org=org, date_from=date_from, date_to=date_to)
