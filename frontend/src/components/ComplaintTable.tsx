import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Complaint, ComplaintList, FilterOptions, FilterParams, fetchComplaints, fetchFilters } from '../api/client'

function ComplaintDetail({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3>Гомдол #{complaint.complaint_number} — {complaint.complaint_id}</h3>

        <div className="field">
          <div className="field-label">Иргэн</div>
          <div className="field-value">
            {complaint.citizen_name || '—'} {complaint.citizen_phone ? `(${complaint.citizen_phone})` : ''}
          </div>
        </div>

        <div className="field">
          <div className="field-label">Дүүрэг / Хороо</div>
          <div className="field-value">{complaint.district || '—'} / {complaint.khoroo || '—'}</div>
        </div>

        <div className="field">
          <div className="field-label">Хаяг</div>
          <div className="field-value">{complaint.address || '—'}</div>
        </div>

        <div className="field">
          <div className="field-label">Ангилал</div>
          <div className="field-value">{complaint.category || '—'}</div>
        </div>

        <div className="field">
          <div className="field-label">Дэлгэрэнгүй</div>
          <div className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{complaint.description || '—'}</div>
        </div>

        {complaint.response && (
          <div className="field">
            <div className="field-label">Хариу</div>
            <div className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{complaint.response}</div>
          </div>
        )}

        {complaint.responding_org && (
          <div className="field">
            <div className="field-label">Хариу өгсөн байгууллага</div>
            <div className="field-value">{complaint.responding_org}</div>
          </div>
        )}

        {complaint.officer && (
          <div className="field">
            <div className="field-label">Албан хаагч</div>
            <div className="field-value">{complaint.officer}</div>
          </div>
        )}

        <div className="field">
          <div className="field-label">Төлөв</div>
          <div className="field-value">
            <span className={`status-badge ${complaint.resolution_status ? 'resolved' : 'pending'}`}>
              {complaint.resolution_status || 'Шийдвэрлэгдээгүй'}
            </span>
          </div>
        </div>

        {complaint.resolution_date && (
          <div className="field">
            <div className="field-label">Шийдвэрлэсэн огноо</div>
            <div className="field-value">{complaint.resolution_date}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComplaintTable({ fp }: { fp: FilterParams }) {
  const [data, setData] = useState<ComplaintList | null>(null)
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [page, setPage] = useState(1)
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchComplaints({
        page,
        page_size: 30,
        district: district || undefined,
        category: category || undefined,
        status: status || undefined,
        search: search || undefined,
        org: fp.org,
        date_from: fp.date_from,
        date_to: fp.date_to,
      })
      setData(result)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, district, category, status, search, fp])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchFilters().then(setFilters).catch(() => {})
  }, [])

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="table-card">
      <h3>Гомдлын жагсаалт ({data?.total ?? 0})</h3>

      <div className="filters-bar" style={{ padding: '0 20px 16px' }}>
        <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1) }}>
          <option value="">Бүх дүүрэг</option>
          {filters?.districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
          <option value="">Бүх ангилал</option>
          {filters?.categories.map((c) => (
            <option key={c} value={c}>{c.length > 60 ? c.slice(0, 60) + '...' : c}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Бүх төлөв</option>
          <option value="resolved">Шийдвэрлэсэн</option>
          <option value="pending">Хүлээгдэж буй</option>
        </select>

        <div style={{ display: 'flex', gap: 0 }}>
          <input
            placeholder="Хайх..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ borderRadius: '8px 0 0 8px', minWidth: 150 }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              background: 'var(--primary)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-state">
          <p>Мэдээлэл олдсонгүй. Excel файл оруулна уу.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дугаар</th>
                  <th>Иргэн</th>
                  <th>Дүүрэг</th>
                  <th>Ангилал</th>
                  <th>Товч агуулга</th>
                  <th>Төлөв</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.complaint_number}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.complaint_id}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.citizen_name || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.district?.replace('Улаанбаатар, ', '') || '—'}</td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{c.category || '—'}</td>
                    <td className="desc-cell">
                      {c.description ? (c.description.length > 80 ? c.description.slice(0, 80) + '...' : c.description) : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${c.resolution_status ? 'resolved' : 'pending'}`}>
                        {c.resolution_status ? 'Шийдвэрлэсэн' : 'Хүлээгдэж буй'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelected(c)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--primary)', padding: 4,
                        }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} /> Өмнөх
            </button>
            <span className="info">
              Хуудас {page} / {totalPages} (Нийт {data.total})
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Дараах <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {selected && <ComplaintDetail complaint={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
