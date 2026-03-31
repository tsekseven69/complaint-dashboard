import { useMemo, useState } from 'react'
import type { Complaint } from '../lib/excelParser'
import {
  computeCategoryAnalysis, computeGroupedCategories, computeOrgDetail,
  type FilterParams, type CategoryDetail, type CategoryGroup, type OrgDetail,
} from '../lib/analytics'
import { ChevronDown, ChevronRight, Building2, X } from 'lucide-react'

export default function CategoryAnalysis({ complaints, fp }: { complaints: Complaint[]; fp: FilterParams }) {
  const data = useMemo(() => computeCategoryAnalysis(complaints, fp), [complaints, fp])
  const grouped = useMemo(() => computeGroupedCategories(complaints, fp), [complaints, fp])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped')

  const toggle = (cat: string) => {
    setExpanded((prev) => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next })
  }
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => { const next = new Set(prev); next.has(group) ? next.delete(group) : next.add(group); return next })
  }
  const showOrgDetail = (orgName: string) => {
    setOrgDetail(computeOrgDetail(complaints, orgName, fp))
  }

  if (complaints.length === 0) return <div className="empty-state"><p>Мэдээлэл байхгүй. Excel файл оруулна уу.</p></div>

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="label">Нийт гомдол</div><div className="value">{data.total_complaints}</div></div>
        <div className="stat-card resolved"><div className="label">Ангилагдсан</div><div className="value">{data.categorized_count}</div></div>
        <div className="stat-card rate"><div className="label">Ангилалын тоо</div><div className="value">{data.categories.length}</div></div>
        <div className="stat-card" style={{ borderLeftColor: '#00acc1' }}><div className="label">Бүлгийн тоо</div><div className="value">{grouped.groups.length}</div></div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${viewMode === 'grouped' ? 'active' : ''}`} onClick={() => setViewMode('grouped')}>Бүлгээр</button>
        <button className={`tab ${viewMode === 'detailed' ? 'active' : ''}`} onClick={() => setViewMode('detailed')}>Дэлгэрэнгүй ангилал</button>
      </div>

      {orgDetail && (
        <div className="modal-overlay" onClick={() => setOrgDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <button className="modal-close" onClick={() => setOrgDetail(null)}><X size={20} /></button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={20} /> {orgDetail.org}</h3>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><div className="label">Нийт</div><div className="value">{orgDetail.total}</div></div>
              <div className="stat-card resolved"><div className="label">Шийдвэрлэсэн</div><div className="value">{orgDetail.resolved}</div></div>
              <div className="stat-card rate"><div className="label">Хувь</div><div className="value">{orgDetail.resolution_rate}%</div></div>
            </div>
            {orgDetail.content_categories.length > 0 && (
              <>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Агуулгын ангилал</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {orgDetail.content_categories.map((c) => (
                    <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{c.category}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span>{c.count} гомдол</span>
                        <span style={{ fontWeight: 600, color: c.resolution_rate >= 50 ? 'var(--success)' : c.resolution_rate > 0 ? 'var(--warning)' : 'var(--danger)' }}>{c.resolution_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {orgDetail.original_categories.length > 0 && (
              <>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Excel ангилалаар</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {orgDetail.original_categories.map((c) => (
                    <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                      <span>{c.category}</span><strong>{c.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'grouped' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grouped.groups.map((group) => (
            <GroupCard key={group.group} group={group} isExpanded={expandedGroups.has(group.group)} onToggle={() => toggleGroup(group.group)} />
          ))}
        </div>
      )}

      {viewMode === 'detailed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.categories.map((cat) => (
            <CategoryCard key={cat.category} cat={cat} isExpanded={expanded.has(cat.category)} onToggle={() => toggle(cat.category)} onOrgClick={showOrgDetail} />
          ))}
        </div>
      )}

      <div className="table-card" style={{ marginTop: 32 }}>
        <h3>Хариу өгсөн байгууллагаар (Топ 25)</h3>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>Байгууллага</th><th>Гомдлын тоо</th></tr></thead>
            <tbody>
              {data.org_table.map((row, i) => (
                <tr key={row.org} style={{ cursor: 'pointer' }} onClick={() => showOrgDetail(row.org)}>
                  <td>{i + 1}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{row.org}</td>
                  <td><strong>{row.count}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function GroupCard({ group, isExpanded, onToggle }: { group: CategoryGroup; isExpanded: boolean; onToggle: () => void }) {
  const rateColor = group.resolution_rate >= 50 ? 'var(--success)' : group.resolution_rate > 0 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span style={{ fontWeight: 700, fontSize: 15 }}>{group.group}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{group.count} гомдол</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: rateColor }}>{group.resolution_rate}% шийдвэрлэсэн</span>
          <div style={{ width: 80, height: 6, background: '#e0e0e0', borderRadius: 3 }}>
            <div style={{ width: `${group.resolution_rate}%`, height: '100%', background: rateColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {group.sub_categories.map((sc) => {
              const scColor = sc.resolution_rate >= 50 ? 'var(--success)' : sc.resolution_rate > 0 ? 'var(--warning)' : 'var(--danger)'
              return (
                <div key={sc.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{sc.category}</span>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>{sc.count} гомдол</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: scColor }}>{sc.resolution_rate}%</span>
                    <div style={{ width: 60, height: 5, background: '#e0e0e0', borderRadius: 3 }}>
                      <div style={{ width: `${sc.resolution_rate}%`, height: '100%', background: scColor, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryCard({ cat, isExpanded, onToggle, onOrgClick }: { cat: CategoryDetail; isExpanded: boolean; onToggle: () => void; onOrgClick: (org: string) => void }) {
  const rateColor = cat.resolution_rate >= 50 ? 'var(--success)' : cat.resolution_rate > 0 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.count} гомдол</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: rateColor }}>{cat.resolution_rate}% шийдвэрлэсэн</span>
          <div style={{ width: 80, height: 6, background: '#e0e0e0', borderRadius: 3 }}>
            <div style={{ width: `${cat.resolution_rate}%`, height: '100%', background: rateColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Статус</h4>
              {cat.statuses.map((s) => (
                <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{s.status || 'Тодорхойгүй'}</span><strong>{s.count}</strong>
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Хариу өгсөн байгууллага</h4>
              {cat.orgs.length > 0 ? cat.orgs.map((o) => (
                <div key={o.org} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, cursor: 'pointer', padding: '2px 0' }}
                  onClick={(e) => { e.stopPropagation(); onOrgClick(o.org) }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8, color: 'var(--primary)' }}>{o.org}</span>
                  <strong style={{ flexShrink: 0 }}>{o.count}</strong>
                </div>
              )) : <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Мэдээлэл байхгүй</span>}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Жишээ гомдлууд</h4>
            {cat.sample_complaints.map((c) => (
              <div key={c.complaint_id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>#{c.complaint_number}</span>
                  <span className={`status-badge ${c.resolution_status?.includes('Шийдвэрлэсэн') ? 'resolved' : 'pending'}`}>{c.resolution_status || 'Хүлээгдэж буй'}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{c.description}</div>
              </div>
            ))}
          </div>
          {cat.sample_responses.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Өгсөн хариунууд</h4>
              {cat.sample_responses.map((r, i) => (
                <div key={i} style={{ background: '#e6f4ea', borderRadius: 8, padding: '10px 14px', fontSize: 13, lineHeight: 1.5, borderLeft: '3px solid var(--success)', marginBottom: 8 }}>
                  <div style={{ color: '#137333' }}>{r.response}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
