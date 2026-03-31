import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LabelList,
} from 'recharts'
import type { Complaint } from '../lib/excelParser'
import { computeReport, type FilterParams, type Report as ReportData } from '../lib/analytics'

const DYNAMIC_COLORS: Record<string, string> = {
  'ӨГ': '#1b2a4a', 'Гомдол': '#a01929', 'Зөрчил': '#8c8c8c',
  'Хүсэлт': '#2e7d32', 'Санал': '#e65100', 'Мэдэгдэл': '#6a1b9a',
  'Талархал': '#00838f', 'Бусад': '#546e7a',
}

export default function Report({ complaints, fp }: { complaints: Complaint[]; fp: FilterParams }) {
  const data = useMemo(() => computeReport(complaints, fp), [complaints, fp])

  if (!data || !data.summary.total) return (
    <div className="empty-state"><p>Мэдээлэл байхгүй. Excel файл оруулна уу.</p></div>
  )

  const { summary, type_breakdown, monthly, category_table, district_table, responding_org_table } = data

  const barKeys = monthly.length > 0
    ? ['ӨГ', ...Object.keys(monthly[0]).filter(k => !['month', 'month_num', 'ӨГ'].includes(k))]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
          Ирсэн өргөдөл, гомдлын бүртгэлийн тайлан
        </h2>
        {summary.date_range && <p style={{ textAlign: 'center', color: '#5f6368', fontSize: 14 }}>{summary.date_range}</p>}
      </div>

      {/* Summary Table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нэгдсэн мэдээлэл</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '2px solid #1b2a4a' }}>
              <td style={summaryCell}>Нийт ӨГ</td>
              <td style={{ ...summaryVal, fontSize: 24, color: '#1b2a4a' }}>{summary.total}</td>
            </tr>
            {type_breakdown.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={summaryCell}>{t.type}</td>
                <td style={summaryVal}>{t.count} <span style={{ color: '#5f6368', fontSize: 13 }}>({t.pct}%)</span></td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#e6f4ea' }}>
              <td style={summaryCell}>Шийдвэрлэсэн</td>
              <td style={{ ...summaryVal, color: '#137333' }}>{summary.resolved} <span style={{ fontSize: 13 }}>({summary.resolution_rate}%)</span></td>
            </tr>
            <tr style={{ background: '#fef7e0' }}>
              <td style={summaryCell}>Хүлээгдэж буй</td>
              <td style={{ ...summaryVal, color: '#b06000' }}>{summary.pending}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monthly Dynamics */}
      {monthly.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>Өргөдөл, гомдлын тоон динамик</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={monthly} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barCategoryGap="25%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 14, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
              {barKeys.map((key) => (
                <Bar key={key} dataKey={key} name={key} fill={DYNAMIC_COLORS[key] || '#546e7a'} radius={[2, 2, 0, 0]} maxBarSize={65}>
                  <LabelList dataKey={key} position="top" style={{ fontSize: 13, fontWeight: 700, fill: '#333' }} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, padding: '16px 24px', borderBottom: '1px solid #dadce0' }}>Ангилалаар</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>Ангилал</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Тоо</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Хувь</th>
              </tr>
            </thead>
            <tbody>
              {category_table.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 24px', fontWeight: c.pct >= 5 ? 600 : 400 }}>{c.category}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{c.count}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{c.pct}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8f9fa', fontWeight: 700, borderTop: '2px solid #dadce0' }}>
                <td style={{ padding: '10px 24px' }}>Нийт</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{category_table.reduce((s, c) => s + c.count, 0)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* District Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, padding: '16px 24px', borderBottom: '1px solid #dadce0' }}>Дүүрэг / Аймгаар</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>Дүүрэг</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Тоо</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Хувь</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Шийдвэрлэсэн</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Шийдв. хувь</th>
              </tr>
            </thead>
            <tbody>
              {district_table.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 24px', fontWeight: d.pct >= 5 ? 600 : 400 }}>{d.district}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{d.count}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{d.pct}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{d.resolved}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: d.resolution_rate >= 30 ? '#e6f4ea' : d.resolution_rate > 0 ? '#fef7e0' : '#fce8e6',
                      color: d.resolution_rate >= 30 ? '#137333' : d.resolution_rate > 0 ? '#b06000' : '#c5221f' }}>
                      {d.resolution_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responding Orgs */}
      {responding_org_table.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, padding: '16px 24px', borderBottom: '1px solid #dadce0' }}>Хариу өгсөн байгууллага</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>Байгууллага</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Тоо</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Хувь</th>
                </tr>
              </thead>
              <tbody>
                {responding_org_table.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 24px' }}>{o.org}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{o.count}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{o.pct}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8f9fa', fontWeight: 700, borderTop: '2px solid #dadce0' }}>
                  <td style={{ padding: '10px 24px' }}>Нийт</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{responding_org_table.reduce((s, o) => s + o.count, 0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const summaryCell: React.CSSProperties = { padding: '12px 24px', fontSize: 14, fontWeight: 600 }
const summaryVal: React.CSSProperties = { padding: '12px 24px', fontSize: 18, fontWeight: 700, textAlign: 'right' }
const thStyle: React.CSSProperties = { padding: '10px 24px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: '#5f6368', borderBottom: '2px solid #dadce0' }
