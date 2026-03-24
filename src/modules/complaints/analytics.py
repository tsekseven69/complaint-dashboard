"""Advanced analytics: trends, resolution analysis, content classification, edge detection."""
import logging
import re
from collections import Counter, defaultdict

from sqlalchemy import func, select, case, literal_column, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.complaints.models import Complaint

logger = logging.getLogger(__name__)

# ── Content classification: broad themes from keywords ──────────────────────
THEME_KEYWORDS: dict[str, list[str]] = {
    "Зам, тээвэр": [
        "замын", "автобус", "жолооч", "зогсоол", "тээвр", "буудал",
        "түгжрэл", "зорчигч", "нийтийн тээвэр", "чиглэл", "автомашин",
        "гүүр", "явган", "хурд сааруулагч", "гэрлэн дохио",
    ],
    "Боловсрол": [
        "сургууль", "цэцэрлэг", "багш", "боловсрол", "сурагч",
        "хүүхэд", "анги", "суралцаж", "сургалт",
    ],
    "Хууль, цагдаа": [
        "цагдаа", "гэмт хэрэг", "зөрчил", "торгууль", "мөрдөгч",
        "хэрэг", "шүүх", "прокурор", "залилан",
    ],
    "Барилга, газар": [
        "барилга", "газар", "орон сууц", "байр", "хашаа", "дээвэр",
        "лифт", "контор", "байшин", "нормыг зөрчиж",
    ],
    "Эрүүл мэнд": [
        "эмнэлэг", "эрүүл мэнд", "эмч", "өрхийн эрүүл", "сувилал",
        "эм", "оношилгоо", "даатгал",
    ],
    "Дулаан, цахилгаан, ус": [
        "халаалт", "дулаан", "цахилгаан", "тог", "ус", "тоолуур",
        "шугам сүлжээ", "хүйтэн ус", "халуун ус", "бохир ус",
    ],
    "Түлш, нүүрс": [
        "түлээ", "нүүрс", "түлш", "шахмал", "утаа",
    ],
    "Худалдаа, үйлчилгээ": [
        "худалдаа", "дэлгүүр", "ТҮЦ", "зах", "павильон", "тамхи",
        "согтууруулах", "архи", "үнэ",
    ],
    "Байгаль орчин": [
        "байгаль", "бохирдол", "хог", "агаар", "ой", "гол", "горхи",
        "худаг", "мод", "нөөц",
    ],
    "Нийгмийн халамж": [
        "нийгмийн", "халамж", "тэтгэвэр", "тэтгэмж", "хөдөлмөр",
        "ажилгүй", "хөгжлийн бэрхшээл",
    ],
    "Засаг захиргаа": [
        "засаг дарга", "хороо", "тамгын газар", "албан хаагч",
        "ёс зүй", "харилцаа хандлага", "хэлтэс",
    ],
}

URGENCY_KEYWORDS = [
    "яаралтай", "аюултай", "амь нас", "осол", "хүчирхийлэл",
    "зодож", "цохиж", "айлган", "аюулгүй байдал", "гал",
    "гамшиг", "онцгой", "нэн даруй", "хохирол", "амьдралд аюул",
]

REPEAT_KEYWORDS = [
    "удаа дараа", "олон удаа", "дахин дахин", "хэд хэдэн удаа",
    "өмнө нь", "урьд нь", "анх удаа биш", "байнга",
]


def classify_text(text: str | None) -> list[str]:
    """Classify complaint text into broad themes."""
    if not text:
        return []
    lower = text.lower()
    themes = []
    for theme, keywords in THEME_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in lower:
                themes.append(theme)
                break
    return themes if themes else ["Бусад"]


def detect_edges(description: str | None, category: str | None) -> list[str]:
    """Detect edge-case flags for a complaint."""
    flags: list[str] = []
    if not description:
        return flags

    lower = description.lower()

    # Urgency
    for kw in URGENCY_KEYWORDS:
        if kw in lower:
            flags.append("Яаралтай")
            break

    # Repeat complaint indicator
    for kw in REPEAT_KEYWORDS:
        if kw in lower:
            flags.append("Давтагдсан")
            break

    # Very long complaint (complex issue)
    if len(description) > 500:
        flags.append("Дэлгэрэнгүй")

    # Contains personal data concern
    if "нууцална уу" in lower or "мэдээллийг нууц" in lower:
        flags.append("Нууцлал хүссэн")

    # Multiple orgs mentioned
    org_mentions = sum(1 for org in ["дүүрэг", "хороо", "газар", "хэлтэс", "алба"]
                       if org in lower)
    if org_mentions >= 3:
        flags.append("Олон байгууллага")

    # Child-related
    if any(kw in lower for kw in ["хүүхэд", "бага насны", "нярай"]):
        flags.append("Хүүхэдтэй холбоотой")

    return flags


def extract_date_from_id(complaint_id: str) -> str | None:
    """Extract date from complaint ID like G260324001 -> 2026-03-24."""
    m = re.match(r'G(\d{2})(\d{2})(\d{2})\d+', complaint_id)
    if m:
        return f"2026-{m.group(2)}-{m.group(3)}"
    return None


def extract_month_from_id(complaint_id: str) -> int | None:
    """Extract month number from complaint ID like G260324001 -> 3."""
    m = re.match(r'G\d{2}(\d{2})\d{2}\d+', complaint_id)
    if m:
        return int(m.group(1))
    return None


MONTH_NAMES = {
    1: "1-р сар", 2: "2-р сар", 3: "3-р сар", 4: "4-р сар",
    5: "5-р сар", 6: "6-р сар", 7: "7-р сар", 8: "8-р сар",
    9: "9-р сар", 10: "10-р сар", 11: "11-р сар", 12: "12-р сар",
}


async def get_monthly_dynamics(db: AsyncSession) -> list[dict]:
    """Monthly complaint dynamics grouped by type (ӨГ, Гомдол, Зөрчил)."""
    rows = (await db.execute(
        select(Complaint.complaint_id, Complaint.complaint_type)
    )).all()

    # Count by month and type
    month_type: dict[int, Counter] = defaultdict(Counter)
    month_total: dict[int, int] = Counter()

    for cid, ctype in rows:
        month = extract_month_from_id(cid)
        if month is None:
            continue
        type_name = (ctype or "").strip() if ctype else "Бусад"
        month_type[month][type_name] += 1
        month_total[month] += 1

    # Collect all unique types
    all_types = set()
    for counts in month_type.values():
        all_types.update(counts.keys())

    result = []
    for month_num in sorted(month_total.keys()):
        entry: dict = {
            "month": MONTH_NAMES.get(month_num, f"{month_num}-р сар"),
            "month_num": month_num,
            "ӨГ": month_total[month_num],
        }
        for t in sorted(all_types):
            entry[t] = month_type[month_num].get(t, 0)
        result.append(entry)

    return result


# ── Database analytics queries ──────────────────────────────────────────────

async def get_trend_analysis(db: AsyncSession) -> dict:
    """Analyze complaint trends by date and category."""
    rows = (await db.execute(
        select(Complaint.complaint_id, Complaint.category, Complaint.resolution_status)
    )).all()

    daily: dict[str, int] = Counter()
    daily_by_cat: dict[str, Counter] = defaultdict(Counter)
    daily_resolved: dict[str, int] = Counter()

    for cid, cat, status in rows:
        d = extract_date_from_id(cid)
        if not d:
            continue
        daily[d] += 1
        if cat:
            daily_by_cat[d][cat] += 1
        if status:
            daily_resolved[d] += 1

    # Sort dates
    sorted_dates = sorted(daily.keys())

    # Compute day-over-day changes
    trend_data = []
    for i, d in enumerate(sorted_dates):
        prev = daily[sorted_dates[i - 1]] if i > 0 else 0
        curr = daily[d]
        change = curr - prev if i > 0 else 0
        change_pct = round(change / prev * 100, 1) if prev > 0 else 0.0
        trend_data.append({
            "date": d,
            "count": curr,
            "resolved": daily_resolved.get(d, 0),
            "change": change,
            "change_pct": change_pct,
        })

    # Find top growing/declining categories between first and last date
    category_trends = []
    if len(sorted_dates) >= 2:
        first_half = sorted_dates[:len(sorted_dates) // 2]
        second_half = sorted_dates[len(sorted_dates) // 2:]

        cat_first: Counter = Counter()
        cat_second: Counter = Counter()
        for d in first_half:
            cat_first += daily_by_cat[d]
        for d in second_half:
            cat_second += daily_by_cat[d]

        all_cats = set(cat_first.keys()) | set(cat_second.keys())
        for cat in all_cats:
            f = cat_first.get(cat, 0)
            s = cat_second.get(cat, 0)
            diff = s - f
            if f + s >= 3:  # Only meaningful categories
                category_trends.append({
                    "category": cat,
                    "first_half": f,
                    "second_half": s,
                    "change": diff,
                    "direction": "өсөлт" if diff > 0 else ("бууралт" if diff < 0 else "тогтвортой"),
                })

        category_trends.sort(key=lambda x: abs(x["change"]), reverse=True)

    return {
        "daily": trend_data,
        "category_trends": category_trends[:15],
    }


async def get_resolution_analysis(db: AsyncSession) -> dict:
    """Analyze resolution patterns."""
    all_rows = (await db.execute(
        select(
            Complaint.category,
            Complaint.district,
            Complaint.resolution_status,
            Complaint.responding_org,
            Complaint.officer,
            Complaint.response,
            Complaint.response_method,
        )
    )).all()

    # Resolution rate by category
    cat_stats: dict[str, dict] = defaultdict(lambda: {"resolved": 0, "total": 0})
    for cat, dist, status, org, officer, resp, method in all_rows:
        if cat:
            cat_stats[cat]["total"] += 1
            if status:
                cat_stats[cat]["resolved"] += 1

    resolution_by_category = []
    for cat, stats in sorted(cat_stats.items(), key=lambda x: x[1]["total"], reverse=True):
        if stats["total"] >= 3:
            rate = round(stats["resolved"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            resolution_by_category.append({
                "category": cat,
                "total": stats["total"],
                "resolved": stats["resolved"],
                "pending": stats["total"] - stats["resolved"],
                "rate": rate,
            })

    # Resolution rate by district
    dist_stats: dict[str, dict] = defaultdict(lambda: {"resolved": 0, "total": 0})
    for cat, dist, status, org, officer, resp, method in all_rows:
        if dist:
            dist_stats[dist]["total"] += 1
            if status:
                dist_stats[dist]["resolved"] += 1

    resolution_by_district = []
    for dist, stats in sorted(dist_stats.items(), key=lambda x: x[1]["total"], reverse=True):
        if stats["total"] >= 3:
            rate = round(stats["resolved"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            resolution_by_district.append({
                "district": dist,
                "total": stats["total"],
                "resolved": stats["resolved"],
                "rate": rate,
            })

    # Responding org performance
    org_stats: dict[str, int] = Counter()
    for cat, dist, status, org, officer, resp, method in all_rows:
        if org:
            org_stats[org] += 1

    top_orgs = [{"org": org, "count": cnt} for org, cnt in org_stats.most_common(10)]

    # Response quality: complaints with vs without detailed responses
    with_response = sum(1 for _, _, _, _, _, resp, _ in all_rows if resp)
    without_response = len(all_rows) - with_response

    # Resolution status breakdown
    status_counts: Counter = Counter()
    for _, _, status, _, _, _, _ in all_rows:
        status_counts[status or "Шийдвэрлэгдээгүй"] += 1

    status_breakdown = [{"status": s, "count": c} for s, c in status_counts.most_common()]

    return {
        "by_category": resolution_by_category[:15],
        "by_district": resolution_by_district,
        "top_responding_orgs": top_orgs,
        "response_coverage": {
            "with_response": with_response,
            "without_response": without_response,
        },
        "status_breakdown": status_breakdown,
    }


async def get_content_classification(db: AsyncSession) -> dict:
    """Classify complaints by content themes and detect edges."""
    rows = (await db.execute(
        select(
            Complaint.id,
            Complaint.complaint_id,
            Complaint.complaint_number,
            Complaint.category,
            Complaint.description,
            Complaint.citizen_name,
            Complaint.district,
            Complaint.resolution_status,
        )
    )).all()

    # Theme classification
    theme_counts: Counter = Counter()
    theme_examples: dict[str, list] = defaultdict(list)
    edge_complaints: list[dict] = []

    for uid, cid, num, cat, desc, name, dist, status in rows:
        themes = classify_text(desc)
        for t in themes:
            theme_counts[t] += 1
            if len(theme_examples[t]) < 3:
                theme_examples[t].append({
                    "complaint_id": cid,
                    "complaint_number": num,
                    "category": cat,
                    "description": (desc or "")[:150] + "..." if desc and len(desc) > 150 else desc,
                })

        edges = detect_edges(desc, cat)
        if edges:
            edge_complaints.append({
                "complaint_id": cid,
                "complaint_number": num,
                "citizen_name": name,
                "district": dist,
                "category": cat,
                "description": (desc or "")[:200] + "..." if desc and len(desc) > 200 else desc,
                "resolution_status": status,
                "flags": edges,
            })

    # Theme distribution
    themes = [
        {
            "theme": theme,
            "count": count,
            "examples": theme_examples.get(theme, []),
        }
        for theme, count in theme_counts.most_common()
    ]

    # Edge summary
    flag_counts: Counter = Counter()
    for ec in edge_complaints:
        for f in ec["flags"]:
            flag_counts[f] += 1

    edge_summary = [{"flag": f, "count": c} for f, c in flag_counts.most_common()]

    # Sort edge complaints: urgent first, then by number of flags
    edge_complaints.sort(
        key=lambda x: (0 if "Яаралтай" in x["flags"] else 1, -len(x["flags"])),
    )

    return {
        "themes": themes,
        "edge_summary": edge_summary,
        "edge_complaints": edge_complaints[:30],
        "total_with_edges": len(edge_complaints),
    }


async def get_insights(db: AsyncSession) -> list[dict]:
    """Generate human-readable insights from the data."""
    total = (await db.execute(select(func.count(Complaint.id)))).scalar() or 0
    resolved = (await db.execute(
        select(func.count(Complaint.id)).where(Complaint.resolution_status.isnot(None))
    )).scalar() or 0

    if total == 0:
        return []

    insights: list[dict] = []

    # Resolution rate insight
    rate = round(resolved / total * 100, 1)
    if rate < 20:
        insights.append({
            "type": "warning",
            "title": "Шийдвэрлэлтийн түвшин бага",
            "description": f"Нийт {total} гомдлын дөнгөж {resolved} ({rate}%) нь шийдвэрлэгдсэн. Хариу өгөх хурдыг нэмэгдүүлэх шаардлагатай.",
        })

    # Top unresolved category
    cat_rows = (await db.execute(
        select(Complaint.category, func.count(Complaint.id).label("cnt"))
        .where(Complaint.resolution_status.is_(None))
        .where(Complaint.category.isnot(None))
        .group_by(Complaint.category)
        .order_by(text("cnt DESC"))
        .limit(3)
    )).all()
    if cat_rows:
        top_cat = cat_rows[0]
        insights.append({
            "type": "info",
            "title": "Хамгийн их шийдвэрлэгдээгүй ангилал",
            "description": f'"{top_cat[0]}" ангилалд {top_cat[1]} шийдвэрлэгдээгүй гомдол байна.',
        })

    # District concentration
    dist_rows = (await db.execute(
        select(Complaint.district, func.count(Complaint.id).label("cnt"))
        .where(Complaint.district.isnot(None))
        .group_by(Complaint.district)
        .order_by(text("cnt DESC"))
        .limit(1)
    )).all()
    if dist_rows:
        top_dist = dist_rows[0]
        pct = round(top_dist[1] / total * 100, 1)
        insights.append({
            "type": "info",
            "title": "Хамгийн ихтэй дүүрэг",
            "description": f'"{top_dist[0]}" дүүргээс нийт гомдлын {pct}% ({top_dist[1]}) ирсэн.',
        })

    # Categories with 0% resolution
    zero_cats = (await db.execute(
        select(Complaint.category, func.count(Complaint.id).label("cnt"))
        .where(Complaint.resolution_status.is_(None))
        .where(Complaint.category.isnot(None))
        .group_by(Complaint.category)
        .having(func.count(Complaint.id) >= 5)
        .order_by(text("cnt DESC"))
    )).all()

    resolved_cats = set()
    res_rows = (await db.execute(
        select(Complaint.category).where(Complaint.resolution_status.isnot(None)).distinct()
    )).scalars().all()
    resolved_cats = set(res_rows)

    fully_unresolved = [c for c in zero_cats if c[0] not in resolved_cats]
    if fully_unresolved:
        names = ", ".join(f'"{c[0]}"' for c in fully_unresolved[:3])
        insights.append({
            "type": "danger",
            "title": "0% шийдвэрлэлттэй ангилалууд",
            "description": f"{names} зэрэг ангилалуудад нэг ч гомдол шийдвэрлэгдээгүй байна.",
        })

    return insights


async def get_report(db: AsyncSession) -> dict:
    """Generate a full report matching the PDF analysis format."""
    rows = (await db.execute(
        select(
            Complaint.complaint_id,
            Complaint.complaint_type,
            Complaint.category,
            Complaint.district,
            Complaint.resolution_status,
            Complaint.responding_org,
            Complaint.officer,
            Complaint.response,
            Complaint.report_date_range,
        )
    )).all()

    total = len(rows)
    if total == 0:
        return {"summary": {}, "monthly": [], "category_table": [],
                "district_table": [], "responding_org_table": [], "type_breakdown": []}

    # ── Summary ──
    date_range = None
    type_counts: Counter = Counter()
    resolved = 0
    for cid, ctype, cat, dist, status, org, officer, resp, dr in rows:
        t = (ctype or "").strip() or "Бусад"
        type_counts[t] += 1
        if status:
            resolved += 1
        if dr and not date_range:
            date_range = dr

    type_breakdown = [
        {"type": t, "count": c, "pct": round(c / total * 100, 1)}
        for t, c in type_counts.most_common()
    ]

    summary = {
        "total": total,
        "resolved": resolved,
        "pending": total - resolved,
        "resolution_rate": round(resolved / total * 100, 1) if total else 0,
        "date_range": date_range,
    }

    # ── Monthly dynamics ──
    month_type: dict[int, Counter] = defaultdict(Counter)
    month_total: dict[int, int] = Counter()
    for cid, ctype, *_ in rows:
        month = extract_month_from_id(cid)
        if month is None:
            continue
        t = (ctype or "").strip() or "Бусад"
        month_type[month][t] += 1
        month_total[month] += 1

    all_types = set()
    for counts in month_type.values():
        all_types.update(counts.keys())

    monthly = []
    for m in sorted(month_total.keys()):
        entry: dict = {
            "month": MONTH_NAMES.get(m, f"{m}-р сар"),
            "month_num": m,
            "ӨГ": month_total[m],
        }
        for t in sorted(all_types):
            entry[t] = month_type[m].get(t, 0)
        monthly.append(entry)

    # ── Category table (Ангилал / Тоо / Хувь) ──
    cat_counts: Counter = Counter()
    for _, _, cat, *_ in rows:
        if cat:
            cat_counts[cat] += 1

    cat_total = sum(cat_counts.values())
    category_table = [
        {"category": cat, "count": cnt, "pct": round(cnt / cat_total * 100, 1)}
        for cat, cnt in cat_counts.most_common()
    ]

    # ── District table ──
    dist_counts: Counter = Counter()
    dist_resolved: dict[str, int] = Counter()
    for _, _, _, dist, status, *_ in rows:
        if dist:
            dist_counts[dist] += 1
            if status:
                dist_resolved[dist] += 1

    dist_total = sum(dist_counts.values())
    district_table = [
        {
            "district": dist,
            "count": cnt,
            "pct": round(cnt / dist_total * 100, 1),
            "resolved": dist_resolved.get(dist, 0),
            "resolution_rate": round(dist_resolved.get(dist, 0) / cnt * 100, 1) if cnt else 0,
        }
        for dist, cnt in dist_counts.most_common()
    ]

    # ── Responding org table (Эх үүсвэр / Хариу өгсөн байгууллага) ──
    org_counts: Counter = Counter()
    for _, _, _, _, _, org, *_ in rows:
        if org:
            org_counts[org] += 1

    org_total = sum(org_counts.values())
    responding_org_table = [
        {"org": org, "count": cnt, "pct": round(cnt / org_total * 100, 1) if org_total else 0}
        for org, cnt in org_counts.most_common(15)
    ]

    return {
        "summary": summary,
        "type_breakdown": type_breakdown,
        "monthly": monthly,
        "category_table": category_table,
        "district_table": district_table,
        "responding_org_table": responding_org_table,
    }
