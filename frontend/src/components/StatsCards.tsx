import { DashboardStats } from '../api/client'

interface Props {
  stats: DashboardStats
}

export default function StatsCards({ stats }: Props) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="label">Нийт гомдол</div>
        <div className="value">{stats.total_complaints}</div>
      </div>
      <div className="stat-card resolved">
        <div className="label">Шийдвэрлэсэн</div>
        <div className="value">{stats.resolved_count}</div>
      </div>
      <div className="stat-card pending">
        <div className="label">Хүлээгдэж буй</div>
        <div className="value">{stats.pending_count}</div>
      </div>
      <div className="stat-card rate">
        <div className="label">Шийдвэрлэлтийн хувь</div>
        <div className="value">{stats.resolution_rate}%</div>
      </div>
    </div>
  )
}
