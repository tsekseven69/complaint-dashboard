import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, LabelList,
} from 'recharts'
import { DashboardStats, MonthlyDynamic, fetchMonthlyDynamics } from '../api/client'

interface Props {
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

// Fixed colors matching the example screenshot
const DYNAMIC_COLORS: Record<string, string> = {
  'ӨГ': '#1b2a4a',
  'Гомдол': '#a01929',
  'Зөрчил': '#8c8c8c',
}

export default function Charts({ stats }: Props) {
  const [monthly, setMonthly] = useState<MonthlyDynamic[]>([])

  useEffect(() => {
    fetchMonthlyDynamics().then(setMonthly).catch(() => {})
  }, [])

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

  // Get dynamic type keys (everything except month, month_num, ӨГ)
  const typeKeys = monthly.length > 0
    ? Object.keys(monthly[0]).filter(k => !['month', 'month_num', 'ӨГ'].includes(k))
    : []

  // All bar keys: ӨГ first, then types
  const barKeys = ['ӨГ', ...typeKeys]

  return (
    <div className="charts-grid">
      {/* Monthly Dynamics - prominent, full width, matching screenshot style */}
      {monthly.length > 0 && (
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Өргөдөл, гомдлын тоон динамик</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={monthly}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              barCategoryGap="25%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 13, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Legend
                iconType="square"
                wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
              />
              {barKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={DYNAMIC_COLORS[key] || COLORS[barKeys.indexOf(key) % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={60}
                >
                  <LabelList
                    dataKey={key}
                    position="top"
                    style={{ fontSize: 12, fontWeight: 700, fill: '#333' }}
                  />
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
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                />
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
