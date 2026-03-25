const BASE_URL = '/api/v1/complaints'

export interface FilterParams {
  org?: string
  date_from?: string
  date_to?: string
}

function filterQs(p?: FilterParams): string {
  if (!p) return ''
  const qs = new URLSearchParams()
  if (p.org) qs.set('org', p.org)
  if (p.date_from) qs.set('date_from', p.date_from)
  if (p.date_to) qs.set('date_to', p.date_to)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export interface Complaint {
  id: string
  complaint_number: number
  complaint_id: string
  citizen_register: string | null
  citizen_name: string | null
  citizen_phone: string | null
  complaint_type: string | null
  district: string | null
  khoroo: string | null
  address: string | null
  category: string | null
  description: string | null
  response: string | null
  responding_org: string | null
  officer: string | null
  resolution_status: string | null
  response_method: string | null
  resolution_date: string | null
  report_date_range: string | null
  created_at: string
}

export interface ComplaintList {
  items: Complaint[]
  total: number
  page: number
  page_size: number
}

export interface UploadResult {
  total_parsed: number
  total_inserted: number
  total_updated: number
  date_range: string | null
}

export interface CategoryStat {
  category: string
  count: number
}

export interface DistrictStat {
  district: string
  count: number
}

export interface StatusStat {
  status: string
  count: number
}

export interface DashboardStats {
  total_complaints: number
  resolved_count: number
  pending_count: number
  resolution_rate: number
  by_category: CategoryStat[]
  by_district: DistrictStat[]
  by_status: StatusStat[]
  date_range: string | null
}

export interface FilterOptions {
  districts: string[]
  categories: string[]
  responding_orgs: string[]
}

export async function uploadExcel(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function fetchStats(f?: FilterParams): Promise<DashboardStats> {
  const res = await fetch(`${BASE_URL}/stats${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function fetchComplaints(params: {
  page?: number
  page_size?: number
  district?: string
  category?: string
  status?: string
  search?: string
  org?: string
  date_from?: string
  date_to?: string
}): Promise<ComplaintList> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  if (params.district) qs.set('district', params.district)
  if (params.category) qs.set('category', params.category)
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  if (params.org) qs.set('org', params.org)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  const res = await fetch(`${BASE_URL}?${qs}`)
  if (!res.ok) throw new Error('Failed to fetch complaints')
  return res.json()
}

export async function fetchFilters(): Promise<FilterOptions> {
  const res = await fetch(`${BASE_URL}/filters`)
  if (!res.ok) throw new Error('Failed to fetch filters')
  return res.json()
}

// ── Analytics types ──

export interface MonthlyDynamic {
  month: string
  month_num: number
  ӨГ: number
  [key: string]: string | number
}

export async function fetchMonthlyDynamics(f?: FilterParams): Promise<MonthlyDynamic[]> {
  const res = await fetch(`${BASE_URL}/analytics/monthly${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch monthly dynamics')
  return res.json()
}

export interface TrendDay {
  date: string
  count: number
  resolved: number
  change: number
  change_pct: number
}

export interface CategoryTrend {
  category: string
  first_half: number
  second_half: number
  change: number
  direction: string
}

export interface TrendAnalysis {
  daily: TrendDay[]
  category_trends: CategoryTrend[]
}

export interface ResolutionByCategory {
  category: string
  total: number
  resolved: number
  pending: number
  rate: number
}

export interface ResolutionByDistrict {
  district: string
  total: number
  resolved: number
  rate: number
}

export interface RespondingOrg {
  org: string
  count: number
}

export interface ResolutionAnalysis {
  by_category: ResolutionByCategory[]
  by_district: ResolutionByDistrict[]
  top_responding_orgs: RespondingOrg[]
  response_coverage: { with_response: number; without_response: number }
  status_breakdown: { status: string; count: number }[]
}

export interface ThemeExample {
  complaint_id: string
  complaint_number: number
  category: string | null
  description: string | null
}

export interface Theme {
  theme: string
  count: number
  examples: ThemeExample[]
}

export interface EdgeComplaint {
  complaint_id: string
  complaint_number: number
  citizen_name: string | null
  district: string | null
  category: string | null
  description: string | null
  resolution_status: string | null
  flags: string[]
}

export interface ContentClassification {
  themes: Theme[]
  edge_summary: { flag: string; count: number }[]
  edge_complaints: EdgeComplaint[]
  total_with_edges: number
}

export interface Insight {
  type: 'info' | 'warning' | 'danger'
  title: string
  description: string
}

export async function fetchTrends(f?: FilterParams): Promise<TrendAnalysis> {
  const res = await fetch(`${BASE_URL}/analytics/trends${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch trends')
  return res.json()
}

export async function fetchResolution(f?: FilterParams): Promise<ResolutionAnalysis> {
  const res = await fetch(`${BASE_URL}/analytics/resolution${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch resolution')
  return res.json()
}

export async function fetchContent(f?: FilterParams): Promise<ContentClassification> {
  const res = await fetch(`${BASE_URL}/analytics/content${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch content')
  return res.json()
}

export async function fetchInsights(f?: FilterParams): Promise<Insight[]> {
  const res = await fetch(`${BASE_URL}/analytics/insights${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch insights')
  return res.json()
}

// ── Category Detail Analysis types ──

export interface SampleComplaint {
  complaint_id: string
  complaint_number: number
  description: string | null
  resolution_status: string | null
}

export interface SampleResponse {
  complaint_id: string
  response: string | null
  resolution_status: string | null
}

export interface CategoryDetail {
  category: string
  count: number
  resolved: number
  pending: number
  resolution_rate: number
  sample_complaints: SampleComplaint[]
  sample_responses: SampleResponse[]
  statuses: { status: string; count: number }[]
  orgs: { org: string; count: number }[]
}

export interface OrgTableRow {
  org: string
  count: number
}

export interface CategoryAnalysisResult {
  categories: CategoryDetail[]
  total_complaints: number
  categorized_count: number
  org_table: OrgTableRow[]
}

export async function fetchCategoryAnalysis(f?: FilterParams): Promise<CategoryAnalysisResult> {
  const res = await fetch(`${BASE_URL}/analytics/categories${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch category analysis')
  return res.json()
}

// ── Report types ──

export interface ReportSummary {
  total: number
  resolved: number
  pending: number
  resolution_rate: number
  date_range: string | null
}

export interface TypeBreakdown {
  type: string
  count: number
  pct: number
}

export interface CategoryRow {
  category: string
  count: number
  pct: number
}

export interface DistrictRow {
  district: string
  count: number
  pct: number
  resolved: number
  resolution_rate: number
}

export interface OrgRow {
  org: string
  count: number
  pct: number
}

export interface Report {
  summary: ReportSummary
  type_breakdown: TypeBreakdown[]
  monthly: MonthlyDynamic[]
  category_table: CategoryRow[]
  district_table: DistrictRow[]
  responding_org_table: OrgRow[]
}

export async function fetchReport(f?: FilterParams): Promise<Report> {
  const res = await fetch(`${BASE_URL}/report${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

// ── Source Analysis ──

export interface SourceItem {
  prefix: string
  name: string
  count: number
  pct: number
}

export interface SourceAnalysis {
  sources: SourceItem[]
  total: number
}

export async function fetchSources(f?: FilterParams): Promise<SourceAnalysis> {
  const res = await fetch(`${BASE_URL}/analytics/sources${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch sources')
  return res.json()
}

// ── Daily Dynamics ──

export interface DailyEntry {
  date: string
  count: number
  trend: number
  G?: number
  C?: number
  M?: number
  J?: number
  W?: number
  [key: string]: string | number | undefined
}

export interface Annotation {
  date: string
  count: number
  reason: string
  reason_count: number
}

export interface DailyDynamics {
  daily: DailyEntry[]
  annotations: Annotation[]
}

export async function fetchDailyDynamics(f?: FilterParams): Promise<DailyDynamics> {
  const res = await fetch(`${BASE_URL}/analytics/daily${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch daily dynamics')
  return res.json()
}

// ── Grouped Categories ──

export interface SubCategory {
  category: string
  count: number
  resolved: number
  resolution_rate: number
}

export interface CategoryGroup {
  group: string
  count: number
  resolved: number
  resolution_rate: number
  sub_categories: SubCategory[]
}

export interface GroupedCategories {
  groups: CategoryGroup[]
  total_classified: number
}

export async function fetchGroupedCategories(f?: FilterParams): Promise<GroupedCategories> {
  const res = await fetch(`${BASE_URL}/analytics/grouped-categories${filterQs(f)}`)
  if (!res.ok) throw new Error('Failed to fetch grouped categories')
  return res.json()
}

// ── Org Detail ──

export interface OrgCategoryItem {
  category: string
  count: number
  resolved: number
  resolution_rate: number
}

export interface OrgDetail {
  org: string
  total: number
  resolved: number
  resolution_rate: number
  content_categories: OrgCategoryItem[]
  original_categories: { category: string; count: number }[]
}

export async function fetchOrgDetail(org: string, f?: FilterParams): Promise<OrgDetail> {
  const qs = new URLSearchParams()
  qs.set('org', org)
  if (f?.date_from) qs.set('date_from', f.date_from)
  if (f?.date_to) qs.set('date_to', f.date_to)
  const res = await fetch(`${BASE_URL}/analytics/org-detail?${qs}`)
  if (!res.ok) throw new Error('Failed to fetch org detail')
  return res.json()
}
