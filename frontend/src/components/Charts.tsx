import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LabelList,
  ComposedChart, Line, ReferenceLine,
} from 'recharts'
import type { Complaint } from '../lib/excelParser'
import {
  computeMonthlyDynamics, computeSources, computeDailyDynamics,
  type FilterParams, type DashboardStats, type MonthlyDynamic,
} from '../lib/analytics'

interface Props {
  complaints: Complaint[]
  fp: FilterParams
  stats: DashboardStats
}

const COLORS = [
  '#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#8e24aa',
  '#00acc1', '#43a047', '#e8710a', '#d81b60', '#6d4c41',
  '#546e7a', '#7cb342', '#039be5', '#c0ca33', '#ff7043',
]

const STATUS_COLORS: Record<string, string> = {
  'Шийдвэрлэсэн': '#34a853',
  'Шийдвэрлэгдээгүй': '#f9ab00',
}

const DYNAMIC_COLORS: Record<string, string> = {
  'ӨГ': '#1b2a4a', 'Гомдол': '#a01929', 'Зөрчил': '#8c8c8c',
  'Хүсэлт': '#2e7d32', 'Санал': '#e65100', 'Мэдэгдэл': '#6a1b9a',
  'Талархал': '#00838f', 'Бусад': '#546e7a',
}

const SOURCE_COLORS: Record<string, string> = {
  'G': '#1a73e8', 'C': '#ea4335', 'M': '#f9ab00', 'J': '#34a853', 'W': '#8e24aa',
}

export default function Charts({ complaints, fp, stats }: Props) {
  const monthly = useMemo(() => computeMonthlyDynamics(complaints, fp), [complaints, fp])
  const sources = useMemo(() => computeSources(complaints, fp), [complaints, fp])
  const daily = useMemo(() => computeDailyDynamics(complaints, fp), [complaints, fp])

  const districtData = stats.by_district.slice(0, 12).map((d) => ({
    name: d.district.replace('Улаанбаатар, ', 'УБ, '),
    count: d.count,
  }))

  const categoryData = stats.by_category.slice(0, 10).map((c) => ({
    name: c.category.length > 40 ? c.category.slice(0, 40) + '...' : c.category,
    count: c.count,
  }))

  const statusData = stats.by_status.map((s) => ({
    name: s.status,
    value: s.count,
  }))

  const typeKeys = monthly.length > 0
    ? Object.keys(monthly[0]).filter(k => !['month', 'month_num', 'ӨГ'].includes(k))
    : []
  const barKeys = ['ӨГ', ...typeKeys]

  return (
    <div className="charts-grid">
      {/* Source prefix chart */}
      {sources.sources.length > 0 && (
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Эх үүсвэрээр (Гомдлын дугаарын эхний үсэг)</h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sources.sources} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Тоо" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {sources.sources.map((s) => (
                      <Cell key={s.prefix} fill={SOURCE_COLORS[s.prefix] || '#546e7a'} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 13, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Тайлбар</div>
              {sources.sources.map((s) => (
                <div key={s.prefix} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: SOURCE_COLORS[s.prefix] || '#546e7a', flexShrink: 0 }} />
                  <strong>{s.prefix}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>— {s.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{s.count} ({s.pct}%)</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, fontWeight: 700, fontSize: 13 }}>
                Нийт: {sources.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily dynamics */}
      {daily.daily.length > 0 && (
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Өдөр тутмын гомдлын тоон динамик</h3>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={daily.daily.map(d => ({ ...d, date: d.date.slice(5) }))} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
              {Object.keys(SOURCE_COLORS).map((prefix) => (
                <Bar key={prefix} dataKey={prefix} name={prefix} stackId="sources" fill={SOURCE_COLORS[prefix]} maxBarSize={40} />
              ))}
              <Line type="monotone" dataKey="trend" name="Тренд (3 өдрийн дундаж)" stroke="#1b2a4a" strokeWidth={2.5} dot={false} />
              {daily.annotations.filter(a => a.reason !== 'Бага өдөр').map((a) => (
                <ReferenceLine key={a.date} x={a.date.slice(5)} stroke="#ea4335" strokeDasharray="3 3"
                  label={{ value: a.reason, position: 'top', fontSize: 10, fill: '#c5221f' }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          {daily.annotations.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {daily.annotations.filter(a => a.reason !== 'Бага өдөр').map((a) => (
                <div key={a.date} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, background: '#fce8e6', color: '#c5221f', border: '1px solid #ea433540' }}>
                  <strong>{a.date.slice(5)}</strong>: {a.count} гомдол — {a.reason} ({a.reason_count})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Dynamics */}
      {monthly.length > 0 && (
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Сараар (Өргөдөл, гомдлын тоон динамик)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={monthly} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barCategoryGap="25%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
              {barKeys.map((key) => (
                <Bar key={key} dataKey={key} name={key}
                  fill={DYNAMIC_COLORS[key] || COLORS[barKeys.indexOf(key) % COLORS.length]}
                  radius={[2, 2, 0, 0]} maxBarSize={60}
                >
                  <LabelList dataKey={key} position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#333' }} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="chart-card">
        <h3>Дүүргээр</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={districtData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1a73e8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Шийдвэрлэлтийн байдал</h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={120}
              dataKey="value" label={({ name, value }) => `${name}: ${value}`}
            >
              {statusData.map((entry, index) => (
                <Cell key={index} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3>Ангилалаар (Топ 10)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={280} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {categoryData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
