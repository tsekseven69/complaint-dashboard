import { useCallback, useMemo, useState } from 'react'
import { BarChart3, Table2, Upload, Brain, FileText, Tags, Building2, Calendar } from 'lucide-react'
import { parseExcelFile, type Complaint } from './lib/excelParser'
import {
  computeStats, computeFilters, type FilterParams, type FilterOptions, type DashboardStats,
} from './lib/analytics'
import FileUpload from './components/FileUpload'
import StatsCards from './components/StatsCards'
import Charts from './components/Charts'
import ComplaintTable from './components/ComplaintTable'
import Analytics from './components/Analytics'
import Report from './components/Report'
import CategoryAnalysis from './components/CategoryAnalysis'

type Tab = 'dashboard' | 'report' | 'categories' | 'analytics' | 'table'

export default function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [tab, setTab] = useState<Tab>('dashboard')
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [selectedOrg, setSelectedOrg] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fp: FilterParams = useMemo(() => ({
    org: selectedOrg || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [selectedOrg, dateFrom, dateTo])

  const stats: DashboardStats | null = useMemo(() => {
    if (complaints.length === 0) return null
    return computeStats(complaints, fp)
  }, [complaints, fp])

  const handleFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const { complaints: parsed } = parseExcelFile(buffer)
    setComplaints(prev => {
      // Merge by complaint_id (upsert logic)
      const map = new Map(prev.map(c => [c.complaint_id, c]))
      for (const c of parsed) map.set(c.complaint_id, c)
      const merged = [...map.values()].sort((a, b) => a.complaint_number - b.complaint_number)
      return merged
    })
    setFilters(computeFilters([...new Map([...complaints, ...parsed].map(c => [c.complaint_id, c])).values()]))
    setUploadMsg(`Амжилттай! ${parsed.length} гомдол уншигдлаа.`)
  }, [complaints])

  // Recompute filters when complaints change
  useMemo(() => {
    if (complaints.length > 0) setFilters(computeFilters(complaints))
  }, [complaints])

  const hasFilters = selectedOrg || dateFrom || dateTo

  return (
    <div className="app">
      <div className="header">
        <h1>Гомдлын Dashboard</h1>
        {stats?.date_range && (
          <span className="date-range">{stats.date_range}</span>
        )}
      </div>

      <FileUpload onFile={handleFile} />

      {uploadMsg && (
        <div className="upload-result">{uploadMsg}</div>
      )}

      {/* Global filters */}
      {complaints.length > 0 && (
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
      )}

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

      {tab === 'dashboard' ? (
        stats && stats.total_complaints > 0 ? (
          <>
            <StatsCards stats={stats} />
            <Charts complaints={complaints} fp={fp} stats={stats} />
          </>
        ) : (
          <div className="empty-state">
            <Upload size={48} style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
            <p>Мэдээлэл байхгүй байна. Excel файл оруулна уу.</p>
          </div>
        )
      ) : tab === 'report' ? (
        <Report complaints={complaints} fp={fp} />
      ) : tab === 'categories' ? (
        <CategoryAnalysis complaints={complaints} fp={fp} />
      ) : tab === 'analytics' ? (
        <Analytics complaints={complaints} fp={fp} />
      ) : (
        <ComplaintTable complaints={complaints} fp={fp} />
      )}
    </div>
  )
}
