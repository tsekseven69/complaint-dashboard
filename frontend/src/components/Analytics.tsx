import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Shield, Tag, Activity } from 'lucide-react'
import type { Complaint } from '../lib/excelParser'
import {
  computeTrends, computeResolution, computeContent, computeInsights,
  type FilterParams, type TrendAnalysis, type ResolutionAnalysis, type ContentClassification, type Insight,
} from '../lib/analytics'

const COLORS = [
  '#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#8e24aa',
  '#00acc1', '#43a047', '#e8710a', '#d81b60', '#6d4c41',
  '#546e7a', '#7cb342',
]

const INSIGHT_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  info: { bg: '#e8f0fe', border: '#1a73e8', color: '#174ea6' },
  warning: { bg: '#fef7e0', border: '#f9ab00', color: '#b06000' },
  danger: { bg: '#fce8e6', border: '#ea4335', color: '#c5221f' },
}

export default function Analytics({ complaints, fp }: { complaints: Complaint[]; fp: FilterParams }) {
  const [subTab, setSubTab] = useState<'trends' | 'resolution' | 'content' | 'edges'>('trends')

  const trends = useMemo(() => computeTrends(complaints, fp), [complaints, fp])
  const resolution = useMemo(() => computeResolution(complaints, fp), [complaints, fp])
  const content = useMemo(() => computeContent(complaints, fp), [complaints, fp])
  const insights = useMemo(() => computeInsights(complaints, fp), [complaints, fp])

  if (complaints.length === 0) return <div className="empty-state"><p>Мэдээлэл байхгүй. Excel файл оруулна уу.</p></div>

  return (
    <div>
      {insights.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {insights.map((ins, i) => {
            const style = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info
            return (
              <div key={i} style={{ flex: '1 1 280px', background: style.bg, borderLeft: `4px solid ${style.border}`, borderRadius: 10, padding: '14px 18px', color: style.color }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {ins.type === 'danger' && <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
                  {ins.title}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{ins.description}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${subTab === 'trends' ? 'active' : ''}`} onClick={() => setSubTab('trends')}>
          <Activity size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Өсөлт / Бууралт
        </button>
        <button className={`tab ${subTab === 'resolution' ? 'active' : ''}`} onClick={() => setSubTab('resolution')}>
          <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Шийдвэрлэлт
        </button>
        <button className={`tab ${subTab === 'content' ? 'active' : ''}`} onClick={() => setSubTab('content')}>
          <Tag size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Агуулгын ангилал
        </button>
        <button className={`tab ${subTab === 'edges' ? 'active' : ''}`} onClick={() => setSubTab('edges')}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Edge тохиолдлууд
        </button>
      </div>

      {subTab === 'trends' && <TrendsView data={trends} />}
      {subTab === 'resolution' && <ResolutionView data={resolution} />}
      {subTab === 'content' && <ContentView data={content} />}
      {subTab === 'edges' && <EdgesView data={content} />}
    </div>
  )
}

function TrendsView({ data }: { data: TrendAnalysis }) {
  const dailyChart = data.daily.map(d => ({ ...d, pending: d.count - d.resolved, date: d.date.slice(5) }))

  return (
    <div className="charts-grid">
      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Өдөр тутмын гомдлын тоо</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#1a73e8" name="Нийт" strokeWidth={2} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="resolved" stroke="#34a853" name="Шийдвэрлэсэн" strokeWidth={2} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {data.daily.map(d => (
            <div key={d.date} style={{ padding: '8px 14px', borderRadius: 8, background: d.change > 0 ? '#fce8e6' : d.change < 0 ? '#e6f4ea' : '#f8f9fa', fontSize: 13 }}>
              <strong>{d.date.slice(5)}</strong>: {d.count} гомдол
              {d.change !== 0 && <span style={{ marginLeft: 6, color: d.change > 0 ? '#ea4335' : '#34a853' }}>({d.change > 0 ? '+' : ''}{d.change}, {d.change_pct > 0 ? '+' : ''}{d.change_pct}%)</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Ангилалын өсөлт / бууралт (эхний хагас vs сүүлийн хагас)</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ангилал</th>
                <th style={{ textAlign: 'center' }}>Эхний хагас</th>
                <th style={{ textAlign: 'center' }}>Сүүлийн хагас</th>
                <th style={{ textAlign: 'center' }}>Өөрчлөлт</th>
                <th>Чиг хандлага</th>
              </tr>
            </thead>
            <tbody>
              {data.category_trends.map((ct, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 300, fontSize: 12 }}>{ct.category}</td>
                  <td style={{ textAlign: 'center' }}>{ct.first_half}</td>
                  <td style={{ textAlign: 'center' }}>{ct.second_half}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: ct.change > 0 ? '#ea4335' : ct.change < 0 ? '#34a853' : '#5f6368' }}>
                    {ct.change > 0 ? '+' : ''}{ct.change}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: ct.direction === 'өсөлт' ? '#fce8e6' : ct.direction === 'бууралт' ? '#e6f4ea' : '#f8f9fa',
                      color: ct.direction === 'өсөлт' ? '#c5221f' : ct.direction === 'бууралт' ? '#137333' : '#5f6368' }}>
                      {ct.direction === 'өсөлт' ? <TrendingUp size={13} /> : ct.direction === 'бууралт' ? <TrendingDown size={13} /> : <Minus size={13} />}
                      {ct.direction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ResolutionView({ data }: { data: ResolutionAnalysis }) {
  const catData = data.by_category.slice(0, 12).map(c => ({ name: c.category.length > 35 ? c.category.slice(0, 35) + '...' : c.category, resolved: c.resolved, pending: c.pending, rate: c.rate }))
  const orgData = data.top_responding_orgs.map(o => ({ name: o.org.length > 45 ? o.org.slice(0, 45) + '...' : o.org, count: o.count }))
  const coverageData = [{ name: 'Хариу өгсөн', value: data.response_coverage.with_response }, { name: 'Хариу өгөөгүй', value: data.response_coverage.without_response }]

  return (
    <div className="charts-grid">
      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Ангилалаар шийдвэрлэлтийн хувь</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={catData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={260} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="resolved" stackId="a" fill="#34a853" name="Шийдвэрлэсэн" />
            <Bar dataKey="pending" stackId="a" fill="#f9ab00" name="Хүлээгдэж буй" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Хариу өгсөн байдал</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={coverageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              <Cell fill="#34a853" /><Cell fill="#dadce0" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Хариу өгсөн байгууллагууд (Топ 10)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={orgData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={240} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1a73e8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Дүүргээр шийдвэрлэлтийн хувь</h3>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Дүүрэг</th><th style={{ textAlign: 'center' }}>Нийт</th><th style={{ textAlign: 'center' }}>Шийдвэрлэсэн</th><th style={{ textAlign: 'center' }}>Хувь</th><th>Прогресс</th></tr></thead>
            <tbody>
              {data.by_district.map((d, i) => (
                <tr key={i}>
                  <td>{d.district}</td>
                  <td style={{ textAlign: 'center' }}>{d.total}</td>
                  <td style={{ textAlign: 'center' }}>{d.resolved}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.rate}%</td>
                  <td style={{ minWidth: 120 }}>
                    <div style={{ background: '#f0f0f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${d.rate}%`, height: '100%', background: d.rate >= 30 ? '#34a853' : d.rate >= 10 ? '#f9ab00' : '#ea4335', borderRadius: 6, transition: 'width 0.3s' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ContentView({ data }: { data: ContentClassification }) {
  const themeData = data.themes.map(t => ({ name: t.theme, count: t.count }))
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Агуулгын сэдвээр ангилал</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={themeData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {themeData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Сэдвийн хуваарилалт</h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={themeData} cx="50%" cy="50%" outerRadius={110} dataKey="count" label={({ name, count }) => `${name}: ${count}`}>
              {themeData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Сэдэв бүрийн жишээ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {data.themes.map((theme, ti) => (
            <div key={ti} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, borderTop: `3px solid ${COLORS[ti % COLORS.length]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{theme.theme}</strong>
                <span style={{ background: COLORS[ti % COLORS.length] + '20', color: COLORS[ti % COLORS.length], padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{theme.count}</span>
              </div>
              {theme.examples.map((ex, ei) => (
                <div key={ei} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0', borderTop: ei > 0 ? '1px solid #f0f0f0' : 'none', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>#{ex.complaint_number}</span> {ex.description}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EdgesView({ data }: { data: ContentClassification }) {
  const FLAG_COLORS: Record<string, string> = { 'Яаралтай': '#ea4335', 'Давтагдсан': '#f9ab00', 'Дэлгэрэнгүй': '#1a73e8', 'Нууцлал хүссэн': '#8e24aa', 'Олон байгууллага': '#00acc1', 'Хүүхэдтэй холбоотой': '#e8710a' }

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeftColor: '#ea4335' }}>
          <div className="label">Нийт edge тохиолдол</div>
          <div className="value">{data.total_with_edges}</div>
        </div>
        {data.edge_summary.map((es, i) => (
          <div key={i} className="stat-card" style={{ borderLeftColor: FLAG_COLORS[es.flag] || '#5f6368' }}>
            <div className="label">{es.flag}</div>
            <div className="value">{es.count}</div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <h3>Edge тохиолдлууд (анхаарах шаардлагатай)</h3>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>Дугаар</th><th>Иргэн</th><th>Дүүрэг</th><th>Ангилал</th><th>Тэмдэглэгээ</th><th>Товч агуулга</th><th>Төлөв</th></tr></thead>
            <tbody>
              {data.edge_complaints.map((ec, i) => (
                <tr key={i}>
                  <td>{ec.complaint_number}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ec.complaint_id}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{ec.citizen_name || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{ec.district?.replace('Улаанбаатар, ', '') || '—'}</td>
                  <td style={{ maxWidth: 180, fontSize: 12 }}>{ec.category || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ec.flags.map((f, fi) => (
                        <span key={fi} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500,
                          background: (FLAG_COLORS[f] || '#5f6368') + '18', color: FLAG_COLORS[f] || '#5f6368', border: `1px solid ${(FLAG_COLORS[f] || '#5f6368')}40` }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="desc-cell" style={{ maxWidth: 250 }}>{ec.description || '—'}</td>
                  <td><span className={`status-badge ${ec.resolution_status ? 'resolved' : 'pending'}`}>{ec.resolution_status ? 'Шийдвэрлэсэн' : 'Хүлээгдэж буй'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
