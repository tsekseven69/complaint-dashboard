import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    complaint_number: Mapped[int] = mapped_column(nullable=False)
    complaint_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    citizen_register: Mapped[str | None] = mapped_column(String(50))
    citizen_name: Mapped[str | None] = mapped_column(String(255))
    citizen_phone: Mapped[str | None] = mapped_column(String(50))
    complaint_type: Mapped[str | None] = mapped_column(String(50))
    district: Mapped[str | None] = mapped_column(String(255))
    khoroo: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500))
    category: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    response: Mapped[str | None] = mapped_column(Text)
    responding_org: Mapped[str | None] = mapped_column(String(500))
    officer: Mapped[str | None] = mapped_column(String(255))
    resolution_status: Mapped[str | None] = mapped_column(String(255))
    response_method: Mapped[str | None] = mapped_column(String(255))
    resolution_date: Mapped[str | None] = mapped_column(String(100))
    upload_batch: Mapped[str | None] = mapped_column(String(100))
    report_date_range: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
