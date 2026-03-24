import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Table2, Upload, Brain, FileText } from 'lucide-react'
import { DashboardStats, UploadResult, fetchStats } from './api/client'
import FileUpload from './components/FileUpload'
import StatsCards from './components/StatsCards'
import Charts from './components/Charts'
import ComplaintTable from './components/ComplaintTable'
import Analytics from './components/Analytics'
import Report from './components/Report'

type Tab = 'dashboard' | 'report' | 'analytics' | 'table'

export default function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetchStats()
      setStats(s)
    } catch {
      // stats will be null when no data exists
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleUploadSuccess = useCallback((result: UploadResult) => {
    setUploadResult(result)
    loadStats()
  }, [loadStats])

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

      <div className="tabs">
        <button
          className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Дашбоард
        </button>
        <button
          className={`tab ${tab === 'report' ? 'active' : ''}`}
          onClick={() => setTab('report')}
        >
          <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Тайлан
        </button>
        <button
          className={`tab ${tab === 'analytics' ? 'active' : ''}`}
          onClick={() => setTab('analytics')}
        >
          <Brain size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Дүн шинжилгээ
        </button>
        <button
          className={`tab ${tab === 'table' ? 'active' : ''}`}
          onClick={() => setTab('table')}
        >
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
            <Charts stats={stats} />
          </>
        ) : (
          <div className="empty-state">
            <Upload size={48} style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
            <p>Мэдээлэл байхгүй байна. Excel файл оруулна уу.</p>
          </div>
        )
      ) : tab === 'report' ? (
        <Report />
      ) : tab === 'analytics' ? (
        <Analytics />
      ) : (
        <ComplaintTable />
      )}
    </div>
  )
}
