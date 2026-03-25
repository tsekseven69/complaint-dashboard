import logging
import re
import uuid
from io import BytesIO

import openpyxl
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.complaints.models import Complaint
from src.modules.complaints.schemas import (
    CategoryStat,
    DashboardStats,
    DistrictStat,
    StatusStat,
    UploadResult,
)

logger = logging.getLogger(__name__)

PENDING_STATUS = "Шийдвэрлэгдээгүй"


def _clean(value: object) -> str | None:
    """Return cleaned string or None."""
    if value is None:
        return None
    s = str(value).strip()
    if s in ("", "null", "None", "_"):
        return None
    return s


def _merge_text(base: str | None, addition: str | None) -> str | None:
    """Merge multirow text fields."""
    if not addition:
        return base
    if not base:
        return addition
    return base + " " + addition


def parse_excel(file_bytes: bytes) -> tuple[list[dict], str | None]:
    """Parse the complaint Excel file and return list of complaint dicts."""
    wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    ws = wb.active

    date_range: str | None = None
    row2_val = ws.cell(row=2, column=1).value
    if row2_val:
        date_range = str(row2_val).strip()

    complaints: list[dict] = []
    current: dict | None = None

    for row_idx in range(4, ws.max_row + 1):
        col1 = ws.cell(row=row_idx, column=1).value
        col3 = ws.cell(row=row_idx, column=3).value

        # If col1 has a number and col3 has an ID, this is a new complaint row
        is_new_record = False
        if col1 is not None:
            try:
                int(col1)
                is_new_record = col3 is not None
            except (ValueError, TypeError):
                pass

        if is_new_record:
            if current:
                complaints.append(current)

            # Parse citizen name and phone from col5
            citizen_raw = _clean(ws.cell(row=row_idx, column=5).value)
            citizen_name = None
            citizen_phone = None
            if citizen_raw:
                # Try to split name and phone
                phone_match = re.search(r'(\d{8,})$', citizen_raw)
                if phone_match:
                    citizen_phone = phone_match.group(1)
                    citizen_name = citizen_raw[:phone_match.start()].strip()
                else:
                    citizen_name = citizen_raw

            responding_org_raw = _clean(ws.cell(row=row_idx, column=20).value)
            if responding_org_raw and responding_org_raw == "null, null":
                responding_org_raw = None

            response_date_raw = _clean(ws.cell(row=row_idx, column=24).value)
            if response_date_raw == "null":
                response_date_raw = None

            current = {
                "complaint_number": int(col1),
                "complaint_id": str(col3).strip(),
                "citizen_register": _clean(ws.cell(row=row_idx, column=4).value),
                "citizen_name": citizen_name,
                "citizen_phone": citizen_phone,
                "complaint_type": _clean(ws.cell(row=row_idx, column=9).value),
                "district": _clean(ws.cell(row=row_idx, column=10).value),
                "khoroo": _clean(ws.cell(row=row_idx, column=12).value),
                "address": _clean(ws.cell(row=row_idx, column=13).value),
                "category": _clean(ws.cell(row=row_idx, column=15).value),
                "description": _clean(ws.cell(row=row_idx, column=16).value),
                "response": _clean(ws.cell(row=row_idx, column=18).value),
                "responding_org": responding_org_raw,
                "officer": _clean(ws.cell(row=row_idx, column=21).value),
                "resolution_status": _clean(ws.cell(row=row_idx, column=22).value),
                "response_method": response_date_raw,
                "resolution_date": _clean(ws.cell(row=row_idx, column=25).value),
                "report_date_range": date_range,
            }
        elif current:
            # Continuation row — merge text fields
            desc_extra = _clean(ws.cell(row=row_idx, column=16).value)
            resp_extra = _clean(ws.cell(row=row_idx, column=18).value)
            current["description"] = _merge_text(current["description"], desc_extra)
            current["response"] = _merge_text(current["response"], resp_extra)

            # Pick up status/org if it appears on continuation rows
            status_val = _clean(ws.cell(row=row_idx, column=22).value)
            if status_val and not current.get("resolution_status"):
                current["resolution_status"] = status_val
            org_val = _clean(ws.cell(row=row_idx, column=20).value)
            if org_val and org_val != "null, null" and not current.get("responding_org"):
                current["responding_org"] = org_val

    if current:
        complaints.append(current)

    wb.close()
    logger.info("Parsed %d complaints from Excel", len(complaints))
    return complaints, date_range


async def upsert_complaints(
    db: AsyncSession, complaints: list[dict]
) -> UploadResult:
    """Upsert complaints into the database."""
    batch_id = str(uuid.uuid4())[:8]
    inserted = 0
    updated = 0

    for c in complaints:
        c["upload_batch"] = batch_id
        stmt = (
            pg_insert(Complaint)
            .values(**c)
            .on_conflict_do_update(
                index_elements=["complaint_id"],
                set_={k: v for k, v in c.items() if k != "complaint_id"},
            )
        )
        result = await db.execute(stmt)
        if result.rowcount:
            # PostgreSQL: inserted = xmax == 0, updated = xmax != 0
            # Simplified: count all as inserted for now
            inserted += 1

    await db.commit()
    date_range = complaints[0].get("report_date_range") if complaints else None
    return UploadResult(
        total_parsed=len(complaints),
        total_inserted=inserted,
        total_updated=updated,
        date_range=date_range,
    )


def _apply_date_filter(query, date_from: str | None, date_to: str | None):
    """Apply date filters based on complaint_id substring."""
    if date_from:
        parts = date_from.split("-")
        yymmdd = parts[0][2:] + parts[1] + parts[2]
        query = query.where(func.substring(Complaint.complaint_id, 2, 6) >= yymmdd)
    if date_to:
        parts = date_to.split("-")
        yymmdd = parts[0][2:] + parts[1] + parts[2]
        query = query.where(func.substring(Complaint.complaint_id, 2, 6) <= yymmdd)
    return query


async def get_complaints(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    district: str | None = None,
    category: str | None = None,
    status: str | None = None,
    search: str | None = None,
    org: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[list[Complaint], int]:
    """Get paginated complaints with optional filters."""
    query = select(Complaint)
    count_query = select(func.count(Complaint.id))

    if date_from or date_to:
        query = _apply_date_filter(query, date_from, date_to)
        count_query = _apply_date_filter(count_query, date_from, date_to)

    if district:
        query = query.where(Complaint.district == district)
        count_query = count_query.where(Complaint.district == district)
    if category:
        query = query.where(Complaint.category == category)
        count_query = count_query.where(Complaint.category == category)
    if org:
        query = query.where(Complaint.responding_org == org)
        count_query = count_query.where(Complaint.responding_org == org)
    if status == "resolved":
        query = query.where(Complaint.resolution_status.isnot(None))
        count_query = count_query.where(Complaint.resolution_status.isnot(None))
    elif status == "pending":
        query = query.where(Complaint.resolution_status.is_(None))
        count_query = count_query.where(Complaint.resolution_status.is_(None))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            Complaint.description.ilike(pattern)
            | Complaint.citizen_name.ilike(pattern)
            | Complaint.complaint_id.ilike(pattern)
        )
        count_query = count_query.where(
            Complaint.description.ilike(pattern)
            | Complaint.citizen_name.ilike(pattern)
            | Complaint.complaint_id.ilike(pattern)
        )

    total = (await db.execute(count_query)).scalar() or 0
    query = (
        query.order_by(Complaint.complaint_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_dashboard_stats(
    db: AsyncSession,
    org: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> DashboardStats:
    """Compute dashboard statistics."""
    base = select(func.count(Complaint.id))
    if org:
        base = base.where(Complaint.responding_org == org)
    base = _apply_date_filter(base, date_from, date_to)

    total = (await db.execute(base)).scalar() or 0

    resolved_q = select(func.count(Complaint.id)).where(
        Complaint.resolution_status.isnot(None)
    )
    if org:
        resolved_q = resolved_q.where(Complaint.responding_org == org)
    resolved_q = _apply_date_filter(resolved_q, date_from, date_to)
    resolved = (await db.execute(resolved_q)).scalar() or 0

    pending = total - resolved
    resolution_rate = (resolved / total * 100) if total > 0 else 0.0

    # By category (top 20)
    cat_q = (
        select(Complaint.category, func.count(Complaint.id).label("cnt"))
        .where(Complaint.category.isnot(None))
        .group_by(Complaint.category)
        .order_by(text("cnt DESC"))
        .limit(20)
    )
    if org:
        cat_q = cat_q.where(Complaint.responding_org == org)
    cat_q = _apply_date_filter(cat_q, date_from, date_to)
    cat_rows = (await db.execute(cat_q)).all()
    by_category = [CategoryStat(category=r[0], count=r[1]) for r in cat_rows]

    # By district
    dist_q = (
        select(Complaint.district, func.count(Complaint.id).label("cnt"))
        .where(Complaint.district.isnot(None))
        .group_by(Complaint.district)
        .order_by(text("cnt DESC"))
    )
    if org:
        dist_q = dist_q.where(Complaint.responding_org == org)
    dist_q = _apply_date_filter(dist_q, date_from, date_to)
    dist_rows = (await db.execute(dist_q)).all()
    by_district = [DistrictStat(district=r[0], count=r[1]) for r in dist_rows]

    # By status
    by_status = [
        StatusStat(status="Шийдвэрлэсэн", count=resolved),
        StatusStat(status=PENDING_STATUS, count=pending),
    ]

    # Date range from latest record
    dr = (
        await db.execute(
            select(Complaint.report_date_range)
            .where(Complaint.report_date_range.isnot(None))
            .limit(1)
        )
    ).scalar()

    return DashboardStats(
        total_complaints=total,
        resolved_count=resolved,
        pending_count=pending,
        resolution_rate=round(resolution_rate, 1),
        by_category=by_category,
        by_district=by_district,
        by_status=by_status,
        date_range=dr,
    )


async def get_filter_options(db: AsyncSession) -> dict:
    """Get unique values for filter dropdowns."""
    districts = (
        await db.execute(
            select(Complaint.district)
            .where(Complaint.district.isnot(None))
            .distinct()
            .order_by(Complaint.district)
        )
    ).scalars().all()

    categories = (
        await db.execute(
            select(Complaint.category)
            .where(Complaint.category.isnot(None))
            .distinct()
            .order_by(Complaint.category)
        )
    ).scalars().all()

    responding_orgs = (
        await db.execute(
            select(Complaint.responding_org)
            .where(Complaint.responding_org.isnot(None))
            .distinct()
            .order_by(Complaint.responding_org)
        )
    ).scalars().all()

    return {
        "districts": list(districts),
        "categories": list(categories),
        "responding_orgs": list(responding_orgs),
    }
