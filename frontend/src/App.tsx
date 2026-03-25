import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Table2, Upload, Brain, FileText, Tags, Building2, Calendar } from 'lucide-react'
import { DashboardStats, FilterOptions, FilterParams, UploadResult, fetchFilters, fetchStats } from './api/client'
import FileUpload from './components/FileUpload'
import StatsCards from './components/StatsCards'
import Charts from './components/Charts'
import ComplaintTable from './components/ComplaintTable'
import Analytics from './components/Analytics'
import Report from './components/Report'
import CategoryAnalysis from './components/CategoryAnalysis'

type Tab = 'dashboard' | 'report' | 'categories' | 'analytics' | 'table'

export default function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [selectedOrg, setSelectedOrg] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fp: FilterParams = useMemo(() => ({
    org: selectedOrg || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [selectedOrg, dateFrom, dateTo])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetchStats(fp)
      setStats(s)
    } catch {
      // stats will be null when no data exists
    } finally {
      setLoading(false)
    }
  }, [fp])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    fetchFilters().then(setFilters).catch(() => {})
  }, [])

  const handleUploadSuccess = useCallback((result: UploadResult) => {
    setUploadResult(result)
    loadStats()
    fetchFilters().then(setFilters).catch(() => {})
  }, [loadStats])

  const hasFilters = selectedOrg || dateFrom || dateTo

  return (
    <div className="app">
      <div className="header">
        <h1>Гомдлын Dashboard</h1>
        {stats?.date_range && (
          <span className="date-range">{stats.date_range}</span>
        )}
      </div>

      <FileUpload onUploadSuccess={handleUploadSuccess} />

      {uploadResult && (
        <div className="upload-result">
          Амжилттай! {uploadResult.total_parsed} гомдол уншигдлаа,
          {' '}{uploadResult.total_inserted} бичигдлээ.
          {uploadResult.date_range && ` (${uploadResult.date_range})`}
        </div>
      )}

      {/* Global filters */}
      <div className="global-filter-bar">
        <div className="filter-group">
          <Building2 size={16} className="filter-icon" />
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="filter-select"
          >
            <option value="">Бүх байгууллага</option>
            {filters?.responding_orgs.map((o) => (
              <option key={o} value={o}>{o.length > 60 ? o.slice(0, 60) + '...' : o}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <Calendar size={16} className="filter-icon" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="filter-date"
            placeholder="Эхлэх"
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-date"
            placeholder="Дуусах"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSelectedOrg(''); setDateFrom(''); setDateTo('') }}
            className="filter-clear"
          >
            Цэвэрлэх
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
          <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Дашбоард
        </button>
        <button className={`tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
          <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Тайлан
        </button>
        <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
          <Tags size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Ангилал
        </button>
        <button className={`tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>
          <Brain size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Дүн шинжилгээ
        </button>
        <button className={`tab ${tab === 'table' ? 'active' : ''}`} onClick={() => setTab('table')}>
          <Table2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Жагсаалт
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : tab === 'dashboard' ? (
        stats && stats.total_complaints > 0 ? (
          <>
            <StatsCards stats={stats} />
            <Charts stats={stats} fp={fp} />
          </>
        ) : (
          <div className="empty-state">
            <Upload size={48} style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
            <p>Мэдээлэл байхгүй байна. Excel файл оруулна уу.</p>
          </div>
        )
      ) : tab === 'report' ? (
        <Report fp={fp} />
      ) : tab === 'categories' ? (
        <CategoryAnalysis fp={fp} />
      ) : tab === 'analytics' ? (
        <Analytics fp={fp} />
      ) : (
        <ComplaintTable fp={fp} />
      )}
    </div>
  )
}
