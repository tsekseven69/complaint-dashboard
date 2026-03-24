from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ComplaintOut(BaseModel):
    id: UUID
    complaint_number: int
    complaint_id: str
    citizen_register: str | None = None
    citizen_name: str | None = None
    citizen_phone: str | None = None
    complaint_type: str | None = None
    district: str | None = None
    khoroo: str | None = None
    address: str | None = None
    category: str | None = None
    description: str | None = None
    response: str | None = None
    responding_org: str | None = None
    officer: str | None = None
    resolution_status: str | None = None
    response_method: str | None = None
    resolution_date: str | None = None
    report_date_range: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintListOut(BaseModel):
    items: list[ComplaintOut]
    total: int
    page: int
    page_size: int


class UploadResult(BaseModel):
    total_parsed: int
    total_inserted: int
    total_updated: int
    date_range: str | None = None


class CategoryStat(BaseModel):
    category: str
    count: int


class DistrictStat(BaseModel):
    district: str
    count: int


class StatusStat(BaseModel):
    status: str
    count: int


class DashboardStats(BaseModel):
    total_complaints: int
    resolved_count: int
    pending_count: int
    resolution_rate: float
    by_category: list[CategoryStat]
    by_district: list[DistrictStat]
    by_status: list[StatusStat]
    date_range: str | None = None
