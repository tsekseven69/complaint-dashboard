/**
 * Client-side analytics engine.
 * Replaces ALL backend analytics endpoints — computes everything from Complaint[].
 */
import type { Complaint } from './excelParser'

// ── Helper ──────────────────────────────────────────────────────────────────

function extractDateFromId(cid: string): string | null {
  const m = cid.match(/^[A-Z](\d{2})(\d{2})(\d{2})\d+/)
  if (m) return `20${m[1]}-${m[2]}-${m[3]}`
  return null
}

function extractMonthFromId(cid: string): number | null {
  const m = cid.match(/^[A-Z]\d{2}(\d{2})\d{2}\d+/)
  if (m) return parseInt(m[1], 10)
  return null
}

function counter<T extends string | number>(items: (T | null | undefined)[]): Map<T, number> {
  const m = new Map<T, number>()
  for (const item of items) {
    if (item != null) m.set(item, (m.get(item) || 0) + 1)
  }
  return m
}

function sortedEntries<T>(map: Map<T, number>): [T, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0
}

// ── Types (matching the existing frontend interfaces) ───────────────────────

export interface DashboardStats {
  total_complaints: number
  resolved_count: number
  pending_count: number
  resolution_rate: number
  by_category: { category: string; count: number }[]
  by_district: { district: string; count: number }[]
  by_status: { status: string; count: number }[]
  date_range: string | null
}

export interface FilterOptions {
  districts: string[]
  categories: string[]
  responding_orgs: string[]
}

export interface MonthlyDynamic {
  month: string
  month_num: number
  ӨГ: number
  [key: string]: string | number
}

export interface SourceItem { prefix: string; name: string; count: number; pct: number }
export interface SourceAnalysis { sources: SourceItem[]; total: number }

export interface DailyEntry {
  date: string; count: number; trend: number
  [key: string]: string | number | undefined
}
export interface Annotation { date: string; count: number; reason: string; reason_count: number }
export interface DailyDynamics { daily: DailyEntry[]; annotations: Annotation[] }

export interface TrendDay { date: string; count: number; resolved: number; change: number; change_pct: number }
export interface CategoryTrend { category: string; first_half: number; second_half: number; change: number; direction: string }
export interface TrendAnalysis { daily: TrendDay[]; category_trends: CategoryTrend[] }

export interface ResolutionByCategory { category: string; total: number; resolved: number; pending: number; rate: number }
export interface ResolutionByDistrict { district: string; total: number; resolved: number; rate: number }
export interface ResolutionAnalysis {
  by_category: ResolutionByCategory[]
  by_district: ResolutionByDistrict[]
  top_responding_orgs: { org: string; count: number }[]
  response_coverage: { with_response: number; without_response: number }
  status_breakdown: { status: string; count: number }[]
}

export interface ThemeExample { complaint_id: string; complaint_number: number; category: string | null; description: string | null }
export interface Theme { theme: string; count: number; examples: ThemeExample[] }
export interface EdgeComplaint {
  complaint_id: string; complaint_number: number; citizen_name: string | null
  district: string | null; category: string | null; description: string | null
  resolution_status: string | null; flags: string[]
}
export interface ContentClassification {
  themes: Theme[]; edge_summary: { flag: string; count: number }[]
  edge_complaints: EdgeComplaint[]; total_with_edges: number
}

export interface Insight { type: 'info' | 'warning' | 'danger'; title: string; description: string }

export interface CategoryDetail {
  category: string; count: number; resolved: number; pending: number; resolution_rate: number
  sample_complaints: { complaint_id: string; complaint_number: number; description: string | null; resolution_status: string | null }[]
  sample_responses: { complaint_id: string; response: string | null; resolution_status: string | null }[]
  statuses: { status: string; count: number }[]
  orgs: { org: string; count: number }[]
}
export interface CategoryAnalysisResult {
  categories: CategoryDetail[]; total_complaints: number; categorized_count: number
  org_table: { org: string; count: number }[]
}

export interface SubCategory { category: string; count: number; resolved: number; resolution_rate: number }
export interface CategoryGroup { group: string; count: number; resolved: number; resolution_rate: number; sub_categories: SubCategory[] }
export interface GroupedCategories { groups: CategoryGroup[]; total_classified: number }

export interface OrgDetail {
  org: string; total: number; resolved: number; resolution_rate: number
  content_categories: { category: string; count: number; resolved: number; resolution_rate: number }[]
  original_categories: { category: string; count: number }[]
}

export interface Report {
  summary: { total: number; resolved: number; pending: number; resolution_rate: number; date_range: string | null }
  type_breakdown: { type: string; count: number; pct: number }[]
  monthly: MonthlyDynamic[]
  category_table: { category: string; count: number; pct: number }[]
  district_table: { district: string; count: number; pct: number; resolved: number; resolution_rate: number }[]
  responding_org_table: { org: string; count: number; pct: number }[]
}

// ── Filter helper ───────────────────────────────────────────────────────────

export interface FilterParams {
  org?: string
  date_from?: string
  date_to?: string
}

function applyFilters(complaints: Complaint[], fp?: FilterParams): Complaint[] {
  if (!fp) return complaints
  let result = complaints
  if (fp.org) result = result.filter(c => c.responding_org === fp.org)
  if (fp.date_from) {
    const parts = fp.date_from.split('-')
    const yymmdd = parts[0].slice(2) + parts[1] + parts[2]
    result = result.filter(c => {
      const m = c.complaint_id.match(/^[A-Z](\d{6})/)
      return m ? m[1] >= yymmdd : true
    })
  }
  if (fp.date_to) {
    const parts = fp.date_to.split('-')
    const yymmdd = parts[0].slice(2) + parts[1] + parts[2]
    result = result.filter(c => {
      const m = c.complaint_id.match(/^[A-Z](\d{6})/)
      return m ? m[1] <= yymmdd : true
    })
  }
  return result
}

// ── Compute Functions ───────────────────────────────────────────────────────

export function computeStats(complaints: Complaint[], fp?: FilterParams): DashboardStats {
  const data = applyFilters(complaints, fp)
  const total = data.length
  const resolved = data.filter(c => c.resolution_status).length
  const pending = total - resolved
  const rate = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0

  const catMap = counter(data.map(c => c.category))
  const distMap = counter(data.map(c => c.district))

  return {
    total_complaints: total,
    resolved_count: resolved,
    pending_count: pending,
    resolution_rate: rate,
    by_category: sortedEntries(catMap).slice(0, 20).map(([category, count]) => ({ category, count })),
    by_district: sortedEntries(distMap).map(([district, count]) => ({ district, count })),
    by_status: [
      { status: 'Шийдвэрлэсэн', count: resolved },
      { status: 'Шийдвэрлэгдээгүй', count: pending },
    ],
    date_range: data[0]?.report_date_range || null,
  }
}

export function computeFilters(complaints: Complaint[]): FilterOptions {
  const districts = [...new Set(complaints.map(c => c.district).filter(Boolean) as string[])].sort()
  const categories = [...new Set(complaints.map(c => c.category).filter(Boolean) as string[])].sort()
  const responding_orgs = [...new Set(complaints.map(c => c.responding_org).filter(Boolean) as string[])].sort()
  return { districts, categories, responding_orgs }
}

const SOURCE_NAMES: Record<string, string> = {
  G: 'Дижитал сити',
  C: '11-11 төвөөс ирсэн',
  M: '1800-1200 дугаарын оператор',
  J: 'Засгийн газрын 1111',
  W: 'Веб порталаас ирсэн',
}

export function computeSources(complaints: Complaint[], fp?: FilterParams): SourceAnalysis {
  const data = applyFilters(complaints, fp)
  const prefixes = counter(data.map(c => c.complaint_id.charAt(0)))
  const total = data.length
  const sources = sortedEntries(prefixes).map(([prefix, count]) => ({
    prefix,
    name: SOURCE_NAMES[prefix] || `${prefix} код`,
    count,
    pct: pct(count, total),
  }))
  return { sources, total }
}

export function computeMonthlyDynamics(complaints: Complaint[], fp?: FilterParams): MonthlyDynamic[] {
  const data = applyFilters(complaints, fp)
  const MONTH_NAMES = ['', '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар']

  const monthlyMap = new Map<number, { total: number; byType: Map<string, number> }>()

  for (const c of data) {
    const month = extractMonthFromId(c.complaint_id)
    if (!month) continue
    if (!monthlyMap.has(month)) monthlyMap.set(month, { total: 0, byType: new Map() })
    const entry = monthlyMap.get(month)!
    entry.total++
    const type = c.complaint_type || 'Бусад'
    entry.byType.set(type, (entry.byType.get(type) || 0) + 1)
  }

  const allTypes = new Set<string>()
  for (const entry of monthlyMap.values()) {
    for (const t of entry.byType.keys()) allTypes.add(t)
  }

  const months = [...monthlyMap.keys()].sort((a, b) => a - b)
  return months.map(month => {
    const entry = monthlyMap.get(month)!
    const row: MonthlyDynamic = {
      month: MONTH_NAMES[month] || `${month}-р сар`,
      month_num: month,
      ӨГ: entry.total,
    }
    for (const type of allTypes) {
      row[type] = entry.byType.get(type) || 0
    }
    return row
  })
}

export function computeDailyDynamics(complaints: Complaint[], fp?: FilterParams): DailyDynamics {
  const data = applyFilters(complaints, fp)

  const dailyMap = new Map<string, { count: number; byPrefix: Map<string, number>; byCat: Map<string, number> }>()
  for (const c of data) {
    const date = extractDateFromId(c.complaint_id)
    if (!date) continue
    if (!dailyMap.has(date)) dailyMap.set(date, { count: 0, byPrefix: new Map(), byCat: new Map() })
    const entry = dailyMap.get(date)!
    entry.count++
    const prefix = c.complaint_id.charAt(0)
    entry.byPrefix.set(prefix, (entry.byPrefix.get(prefix) || 0) + 1)
    if (c.category) entry.byCat.set(c.category, (entry.byCat.get(c.category) || 0) + 1)
  }

  const sortedDates = [...dailyMap.keys()].sort()
  const counts = sortedDates.map(d => dailyMap.get(d)!.count)

  // 3-day moving average trend
  const trendValues = counts.map((_, i) => {
    const start = Math.max(0, i - 1)
    const end = Math.min(counts.length, i + 2)
    const slice = counts.slice(start, end)
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
  })

  const daily: DailyEntry[] = sortedDates.map((date, i) => {
    const entry = dailyMap.get(date)!
    const row: DailyEntry = { date, count: entry.count, trend: trendValues[i] }
    for (const [prefix, cnt] of entry.byPrefix) {
      row[prefix] = cnt
    }
    return row
  })

  // Annotations: spikes and drops
  const annotations: Annotation[] = []
  const avg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0
  for (let i = 0; i < sortedDates.length; i++) {
    const c = counts[i]
    if (c > avg * 1.5 && avg > 0) {
      const entry = dailyMap.get(sortedDates[i])!
      const topCat = sortedEntries(entry.byCat)[0]
      annotations.push({
        date: sortedDates[i], count: c,
        reason: topCat ? topCat[0] : 'Өсөлт',
        reason_count: topCat ? topCat[1] : c,
      })
    }
  }

  return { daily, annotations }
}

export function computeTrends(complaints: Complaint[], fp?: FilterParams): TrendAnalysis {
  const data = applyFilters(complaints, fp)

  const dailyMap = new Map<string, { total: number; resolved: number; byCat: Map<string, number> }>()
  for (const c of data) {
    const date = extractDateFromId(c.complaint_id)
    if (!date) continue
    if (!dailyMap.has(date)) dailyMap.set(date, { total: 0, resolved: 0, byCat: new Map() })
    const entry = dailyMap.get(date)!
    entry.total++
    if (c.resolution_status) entry.resolved++
    if (c.category) entry.byCat.set(c.category, (entry.byCat.get(c.category) || 0) + 1)
  }

  const sortedDates = [...dailyMap.keys()].sort()
  const daily: TrendDay[] = sortedDates.map((date, i) => {
    const entry = dailyMap.get(date)!
    const prev = i > 0 ? dailyMap.get(sortedDates[i - 1])!.total : 0
    const change = i > 0 ? entry.total - prev : 0
    return {
      date, count: entry.total, resolved: entry.resolved,
      change, change_pct: prev > 0 ? Math.round(change / prev * 1000) / 10 : 0,
    }
  })

  // Category trends: first half vs second half
  const mid = Math.floor(sortedDates.length / 2)
  const firstHalf = sortedDates.slice(0, mid)
  const secondHalf = sortedDates.slice(mid)

  const catFirst = new Map<string, number>()
  const catSecond = new Map<string, number>()
  for (const d of firstHalf) {
    for (const [cat, cnt] of dailyMap.get(d)!.byCat) catFirst.set(cat, (catFirst.get(cat) || 0) + cnt)
  }
  for (const d of secondHalf) {
    for (const [cat, cnt] of dailyMap.get(d)!.byCat) catSecond.set(cat, (catSecond.get(cat) || 0) + cnt)
  }

  const allCats = new Set([...catFirst.keys(), ...catSecond.keys()])
  const category_trends: CategoryTrend[] = []
  for (const cat of allCats) {
    const f = catFirst.get(cat) || 0
    const s = catSecond.get(cat) || 0
    if (f + s >= 3) {
      const change = s - f
      category_trends.push({
        category: cat, first_half: f, second_half: s, change,
        direction: change > 0 ? 'өсөлт' : change < 0 ? 'бууралт' : 'тогтвортой',
      })
    }
  }
  category_trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  return { daily, category_trends: category_trends.slice(0, 15) }
}

export function computeResolution(complaints: Complaint[], fp?: FilterParams): ResolutionAnalysis {
  const data = applyFilters(complaints, fp)

  // By category
  const catMap = new Map<string, { total: number; resolved: number }>()
  for (const c of data) {
    if (!c.category) continue
    if (!catMap.has(c.category)) catMap.set(c.category, { total: 0, resolved: 0 })
    const entry = catMap.get(c.category)!
    entry.total++
    if (c.resolution_status) entry.resolved++
  }
  const by_category = [...catMap.entries()]
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([category, { total, resolved }]) => ({
      category, total, resolved, pending: total - resolved,
      rate: Math.round(resolved / total * 1000) / 10,
    }))

  // By district
  const distMap = new Map<string, { total: number; resolved: number }>()
  for (const c of data) {
    if (!c.district) continue
    if (!distMap.has(c.district)) distMap.set(c.district, { total: 0, resolved: 0 })
    const entry = distMap.get(c.district)!
    entry.total++
    if (c.resolution_status) entry.resolved++
  }
  const by_district = [...distMap.entries()]
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([district, { total, resolved }]) => ({
      district, total, resolved,
      rate: Math.round(resolved / total * 1000) / 10,
    }))

  // Top responding orgs
  const orgMap = counter(data.map(c => c.responding_org).filter(Boolean) as string[])
  const top_responding_orgs = sortedEntries(orgMap).slice(0, 10).map(([org, count]) => ({ org, count }))

  // Response coverage
  const with_response = data.filter(c => c.response).length
  const without_response = data.length - with_response

  // Status breakdown
  const statusMap = counter(data.map(c => c.resolution_status || 'Шийдвэрлэгдээгүй'))
  const status_breakdown = sortedEntries(statusMap).map(([status, count]) => ({ status, count }))

  return { by_category, by_district, top_responding_orgs, response_coverage: { with_response, without_response }, status_breakdown }
}

// ── Content Classification ──────────────────────────────────────────────────

const THEME_KEYWORDS: Record<string, string[]> = {
  'Зам, тээвэр': ['замын', 'автобус', 'жолооч', 'зогсоол', 'тээвр', 'буудал', 'түгжрэл', 'зорчигч', 'нийтийн тээвэр', 'чиглэл', 'автомашин', 'гүүр', 'явган', 'хурд сааруулагч', 'гэрлэн дохио'],
  'Боловсрол': ['сургууль', 'цэцэрлэг', 'багш', 'боловсрол', 'сурагч', 'хүүхэд', 'анги', 'суралцаж', 'сургалт'],
  'Хууль, цагдаа': ['цагдаа', 'гэмт хэрэг', 'зөрчил', 'торгууль', 'мөрдөгч', 'хэрэг', 'шүүх', 'прокурор', 'залилан'],
  'Барилга, газар': ['барилга', 'газар', 'орон сууц', 'байр', 'хашаа', 'дээвэр', 'лифт', 'контор', 'байшин', 'нормыг зөрчиж'],
  'Эрүүл мэнд': ['эмнэлэг', 'эрүүл мэнд', 'эмч', 'өрхийн эрүүл', 'сувилал', 'эм', 'оношилгоо', 'даатгал'],
  'Дулаан, цахилгаан, ус': ['халаалт', 'дулаан', 'цахилгаан', 'тог', 'ус', 'тоолуур', 'шугам сүлжээ', 'хүйтэн ус', 'халуун ус', 'бохир ус'],
  'Түлш, нүүрс': ['түлээ', 'нүүрс', 'түлш', 'шахмал', 'утаа'],
  'Худалдаа, үйлчилгээ': ['худалдаа', 'дэлгүүр', 'ТҮЦ', 'зах', 'павильон', 'тамхи', 'согтууруулах', 'архи', 'үнэ'],
  'Байгаль орчин': ['байгаль', 'бохирдол', 'хог', 'агаар', 'ой', 'гол', 'горхи', 'худаг', 'мод', 'нөөц'],
  'Нийгмийн халамж': ['нийгмийн', 'халамж', 'тэтгэвэр', 'тэтгэмж', 'хөдөлмөр', 'ажилгүй', 'хөгжлийн бэрхшээл'],
  'Засаг захиргаа': ['засаг дарга', 'хороо', 'тамгын газар', 'албан хаагч', 'ёс зүй', 'харилцаа хандлага', 'хэлтэс'],
}

const URGENCY_KEYWORDS = ['яаралтай', 'аюултай', 'амь нас', 'осол', 'хүчирхийлэл', 'зодож', 'цохиж', 'айлган', 'аюулгүй байдал', 'гал', 'гамшиг', 'онцгой', 'нэн даруй', 'хохирол', 'амьдралд аюул']
const REPEAT_KEYWORDS = ['удаа дараа', 'олон удаа', 'дахин дахин', 'хэд хэдэн удаа', 'өмнө нь', 'урьд нь', 'анх удаа биш', 'байнга']

function classifyText(text: string | null): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const themes: string[] = []
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) { themes.push(theme); break }
    }
  }
  return themes.length > 0 ? themes : ['Бусад']
}

function detectEdges(desc: string | null): string[] {
  if (!desc) return []
  const lower = desc.toLowerCase()
  const flags: string[] = []
  if (URGENCY_KEYWORDS.some(kw => lower.includes(kw))) flags.push('Яаралтай')
  if (REPEAT_KEYWORDS.some(kw => lower.includes(kw))) flags.push('Давтагдсан')
  if (desc.length > 500) flags.push('Дэлгэрэнгүй')
  if (lower.includes('нууцална уу') || lower.includes('мэдээллийг нууц')) flags.push('Нууцлал хүссэн')
  const orgMentions = ['дүүрэг', 'хороо', 'газар', 'хэлтэс', 'алба'].filter(o => lower.includes(o)).length
  if (orgMentions >= 3) flags.push('Олон байгууллага')
  if (['хүүхэд', 'бага насны', 'нярай'].some(kw => lower.includes(kw))) flags.push('Хүүхэдтэй холбоотой')
  return flags
}

export function computeContent(complaints: Complaint[], fp?: FilterParams): ContentClassification {
  const data = applyFilters(complaints, fp)

  const themeMap = new Map<string, { count: number; examples: ThemeExample[] }>()
  const edgeComplaints: EdgeComplaint[] = []

  for (const c of data) {
    const themes = classifyText(c.description)
    for (const t of themes) {
      if (!themeMap.has(t)) themeMap.set(t, { count: 0, examples: [] })
      const entry = themeMap.get(t)!
      entry.count++
      if (entry.examples.length < 3) {
        entry.examples.push({
          complaint_id: c.complaint_id, complaint_number: c.complaint_number,
          category: c.category,
          description: c.description && c.description.length > 150 ? c.description.slice(0, 150) + '...' : c.description,
        })
      }
    }

    const edges = detectEdges(c.description)
    if (edges.length > 0) {
      edgeComplaints.push({
        complaint_id: c.complaint_id, complaint_number: c.complaint_number,
        citizen_name: c.citizen_name, district: c.district, category: c.category,
        description: c.description && c.description.length > 200 ? c.description.slice(0, 200) + '...' : c.description,
        resolution_status: c.resolution_status, flags: edges,
      })
    }
  }

  const themes = [...themeMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([theme, { count, examples }]) => ({ theme, count, examples }))

  const flagMap = new Map<string, number>()
  for (const ec of edgeComplaints) for (const f of ec.flags) flagMap.set(f, (flagMap.get(f) || 0) + 1)
  const edge_summary = sortedEntries(flagMap).map(([flag, count]) => ({ flag, count }))

  edgeComplaints.sort((a, b) => {
    const aUrgent = a.flags.includes('Яаралтай') ? 0 : 1
    const bUrgent = b.flags.includes('Яаралтай') ? 0 : 1
    return aUrgent - bUrgent || b.flags.length - a.flags.length
  })

  return { themes, edge_summary, edge_complaints: edgeComplaints.slice(0, 30), total_with_edges: edgeComplaints.length }
}

export function computeInsights(complaints: Complaint[], fp?: FilterParams): Insight[] {
  const data = applyFilters(complaints, fp)
  if (data.length === 0) return []
  const insights: Insight[] = []

  const total = data.length
  const resolved = data.filter(c => c.resolution_status).length
  const rate = Math.round(resolved / total * 1000) / 10

  if (rate < 20) {
    insights.push({
      type: 'warning', title: 'Шийдвэрлэлтийн түвшин бага',
      description: `Нийт ${total} гомдлын дөнгөж ${resolved} (${rate}%) нь шийдвэрлэгдсэн.`,
    })
  }

  // Top unresolved category
  const unresolvedByCat = new Map<string, number>()
  for (const c of data) {
    if (!c.resolution_status && c.category) unresolvedByCat.set(c.category, (unresolvedByCat.get(c.category) || 0) + 1)
  }
  const topUnresolved = sortedEntries(unresolvedByCat)[0]
  if (topUnresolved) {
    insights.push({
      type: 'info', title: 'Хамгийн их шийдвэрлэгдээгүй ангилал',
      description: `"${topUnresolved[0]}" ангилалд ${topUnresolved[1]} шийдвэрлэгдээгүй гомдол байна.`,
    })
  }

  // Top district
  const distMap = counter(data.map(c => c.district).filter(Boolean) as string[])
  const topDist = sortedEntries(distMap)[0]
  if (topDist) {
    insights.push({
      type: 'info', title: 'Хамгийн ихтэй дүүрэг',
      description: `"${topDist[0]}" дүүргээс нийт гомдлын ${pct(topDist[1], total)}% (${topDist[1]}) ирсэн.`,
    })
  }

  // Categories with 0% resolution
  const resolvedCats = new Set(data.filter(c => c.resolution_status && c.category).map(c => c.category!))
  const zeroCats = [...unresolvedByCat.entries()]
    .filter(([cat, cnt]) => cnt >= 5 && !resolvedCats.has(cat))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  if (zeroCats.length > 0) {
    insights.push({
      type: 'danger', title: '0% шийдвэрлэлттэй ангилалууд',
      description: `${zeroCats.map(([c]) => `"${c}"`).join(', ')} зэрэг ангилалуудад нэг ч гомдол шийдвэрлэгдээгүй.`,
    })
  }

  return insights
}

// ── Category Analysis ───────────────────────────────────────────────────────

const CATEGORY_GROUPS: Record<string, string[]> = {
  'Зам, тээвэр, замын хөдөлгөөн': ['замын хөдөлгөөн', 'тээвр', 'автобус', 'жолооч', 'зогсоол', 'авто зам', 'гүүр', 'явган'],
  'Боловсрол, сургалт': ['боловсрол', 'сургууль', 'цэцэрлэг', 'сургалт'],
  'Хууль, дүрэм, цагдаа': ['цагдаа', 'гэмт хэрэг', 'зөрчил', 'торгууль', 'шүүх'],
  'Барилга, газар, орон сууц': ['барилга', 'газар', 'орон сууц', 'байр', 'барилгажилт'],
  'Эрүүл мэнд, эмнэлэг': ['эрүүл мэнд', 'эмнэлэг', 'өрхийн эрүүл'],
  'Дэд бүтэц (дулаан, ус, цахилгаан)': ['дулаан', 'халаалт', 'цахилгаан', 'усан хангамж', 'ус', 'тог'],
  'Түлш, нүүрс': ['түлээ', 'нүүрс', 'түлш'],
  'Худалдаа, үйлчилгээ': ['худалдаа', 'үйлчилгээ', 'дэлгүүр', 'зах'],
  'Байгаль орчин': ['байгаль', 'гол горхи', 'худаг', 'хог', 'ногоон'],
  'Нийгмийн асуудал': ['нийгмийн', 'халамж', 'тэтгэвэр', 'хөдөлмөр'],
  'Засаг захиргаа, хороо, дүүрэг': ['засаг дарга', 'хороо', 'тамгын газар', 'дүүрэг'],
}

function groupCategory(category: string): string {
  const lower = category.toLowerCase()
  for (const [group, keywords] of Object.entries(CATEGORY_GROUPS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return group
    }
  }
  return 'Бусад'
}

export function computeCategoryAnalysis(complaints: Complaint[], fp?: FilterParams): CategoryAnalysisResult {
  const data = applyFilters(complaints, fp)

  const catMap = new Map<string, Complaint[]>()
  for (const c of data) {
    const cat = c.category || 'Тодорхойгүй'
    if (!catMap.has(cat)) catMap.set(cat, [])
    catMap.get(cat)!.push(c)
  }

  const categories: CategoryDetail[] = [...catMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, items]) => {
      const resolved = items.filter(c => c.resolution_status).length
      const statusMap = counter(items.map(c => c.resolution_status || 'Хүлээгдэж буй'))
      const orgMap = counter(items.map(c => c.responding_org).filter(Boolean) as string[])

      return {
        category, count: items.length, resolved, pending: items.length - resolved,
        resolution_rate: Math.round(resolved / items.length * 1000) / 10,
        sample_complaints: items.slice(0, 3).map(c => ({
          complaint_id: c.complaint_id, complaint_number: c.complaint_number,
          description: c.description && c.description.length > 200 ? c.description.slice(0, 200) + '...' : c.description,
          resolution_status: c.resolution_status,
        })),
        sample_responses: items.filter(c => c.response).slice(0, 2).map(c => ({
          complaint_id: c.complaint_id, response: c.response, resolution_status: c.resolution_status,
        })),
        statuses: sortedEntries(statusMap).map(([status, count]) => ({ status, count })),
        orgs: sortedEntries(orgMap).slice(0, 5).map(([org, count]) => ({ org, count })),
      }
    })

  const orgMap = counter(data.map(c => c.responding_org).filter(Boolean) as string[])
  const org_table = sortedEntries(orgMap).slice(0, 25).map(([org, count]) => ({ org, count }))

  return {
    categories,
    total_complaints: data.length,
    categorized_count: data.filter(c => c.category).length,
    org_table,
  }
}

export function computeGroupedCategories(complaints: Complaint[], fp?: FilterParams): GroupedCategories {
  const data = applyFilters(complaints, fp)

  const groupMap = new Map<string, Map<string, { count: number; resolved: number }>>()
  for (const c of data) {
    if (!c.category) continue
    const group = groupCategory(c.category)
    if (!groupMap.has(group)) groupMap.set(group, new Map())
    const subMap = groupMap.get(group)!
    if (!subMap.has(c.category)) subMap.set(c.category, { count: 0, resolved: 0 })
    const entry = subMap.get(c.category)!
    entry.count++
    if (c.resolution_status) entry.resolved++
  }

  const groups: CategoryGroup[] = [...groupMap.entries()]
    .map(([group, subMap]) => {
      const sub_categories = [...subMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([category, { count, resolved }]) => ({
          category, count, resolved,
          resolution_rate: Math.round(resolved / count * 1000) / 10,
        }))
      const totalCount = sub_categories.reduce((s, c) => s + c.count, 0)
      const totalResolved = sub_categories.reduce((s, c) => s + c.resolved, 0)
      return {
        group, count: totalCount, resolved: totalResolved,
        resolution_rate: totalCount > 0 ? Math.round(totalResolved / totalCount * 1000) / 10 : 0,
        sub_categories,
      }
    })
    .sort((a, b) => b.count - a.count)

  return { groups, total_classified: data.filter(c => c.category).length }
}

export function computeOrgDetail(complaints: Complaint[], orgName: string, fp?: FilterParams): OrgDetail {
  const data = applyFilters(complaints, fp).filter(c => c.responding_org === orgName)
  const resolved = data.filter(c => c.resolution_status).length

  const catMap = new Map<string, { count: number; resolved: number }>()
  for (const c of data) {
    const themes = classifyText(c.description)
    for (const t of themes) {
      if (!catMap.has(t)) catMap.set(t, { count: 0, resolved: 0 })
      const entry = catMap.get(t)!
      entry.count++
      if (c.resolution_status) entry.resolved++
    }
  }

  const origCatMap = counter(data.map(c => c.category).filter(Boolean) as string[])

  return {
    org: orgName, total: data.length, resolved,
    resolution_rate: data.length > 0 ? Math.round(resolved / data.length * 1000) / 10 : 0,
    content_categories: [...catMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, { count, resolved: r }]) => ({
        category, count, resolved: r,
        resolution_rate: count > 0 ? Math.round(r / count * 1000) / 10 : 0,
      })),
    original_categories: sortedEntries(origCatMap).map(([category, count]) => ({ category, count })),
  }
}

export function computeReport(complaints: Complaint[], fp?: FilterParams): Report {
  const data = applyFilters(complaints, fp)
  const total = data.length
  const resolved = data.filter(c => c.resolution_status).length
  const pending = total - resolved

  const typeMap = counter(data.map(c => c.complaint_type || 'Бусад'))
  const type_breakdown = sortedEntries(typeMap).map(([type, count]) => ({ type, count, pct: pct(count, total) }))

  const catMap = counter(data.map(c => c.category).filter(Boolean) as string[])
  const catTotal = [...catMap.values()].reduce((a, b) => a + b, 0)
  const category_table = sortedEntries(catMap).map(([category, count]) => ({ category, count, pct: pct(count, catTotal) }))

  const distMap = new Map<string, { total: number; resolved: number }>()
  for (const c of data) {
    if (!c.district) continue
    if (!distMap.has(c.district)) distMap.set(c.district, { total: 0, resolved: 0 })
    const entry = distMap.get(c.district)!
    entry.total++
    if (c.resolution_status) entry.resolved++
  }
  const distTotal = [...distMap.values()].reduce((s, v) => s + v.total, 0)
  const district_table = [...distMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([district, { total: t, resolved: r }]) => ({
      district, count: t, pct: pct(t, distTotal), resolved: r,
      resolution_rate: t > 0 ? Math.round(r / t * 1000) / 10 : 0,
    }))

  const orgMap = counter(data.map(c => c.responding_org).filter(Boolean) as string[])
  const orgTotal = [...orgMap.values()].reduce((a, b) => a + b, 0)
  const responding_org_table = sortedEntries(orgMap).map(([org, count]) => ({ org, count, pct: pct(count, orgTotal) }))

  return {
    summary: {
      total, resolved, pending,
      resolution_rate: total > 0 ? Math.round(resolved / total * 1000) / 10 : 0,
      date_range: data[0]?.report_date_range || null,
    },
    type_breakdown,
    monthly: computeMonthlyDynamics(complaints, fp),
    category_table,
    district_table,
    responding_org_table,
  }
}

// ── Paginated Complaint List ────────────────────────────────────────────────

export interface ComplaintList {
  items: Complaint[]
  total: number
  page: number
  page_size: number
}

export function getComplaints(
  complaints: Complaint[],
  params: {
    page?: number; page_size?: number; district?: string; category?: string
    status?: string; search?: string; org?: string; date_from?: string; date_to?: string
  },
): ComplaintList {
  let data = applyFilters(complaints, { org: params.org, date_from: params.date_from, date_to: params.date_to })

  if (params.district) data = data.filter(c => c.district === params.district)
  if (params.category) data = data.filter(c => c.category === params.category)
  if (params.status === 'resolved') data = data.filter(c => c.resolution_status)
  else if (params.status === 'pending') data = data.filter(c => !c.resolution_status)
  if (params.search) {
    const lower = params.search.toLowerCase()
    data = data.filter(c =>
      c.description?.toLowerCase().includes(lower) ||
      c.citizen_name?.toLowerCase().includes(lower) ||
      c.complaint_id.toLowerCase().includes(lower)
    )
  }

  const page = params.page || 1
  const pageSize = params.page_size || 30
  const start = (page - 1) * pageSize

  return {
    items: data.slice(start, start + pageSize),
    total: data.length,
    page,
    page_size: pageSize,
  }
}
