/**
 * Client-side Excel parser using SheetJS.
 * Mirrors the backend's parse_excel() column mapping exactly.
 */
import * as XLSX from 'xlsx'

export interface Complaint {
  id: string
  complaint_number: number
  complaint_id: string
  citizen_register: string | null
  citizen_name: string | null
  citizen_phone: string | null
  complaint_type: string | null
  district: string | null
  khoroo: string | null
  address: string | null
  category: string | null
  description: string | null
  response: string | null
  responding_org: string | null
  officer: string | null
  resolution_status: string | null
  response_method: string | null
  resolution_date: string | null
  report_date_range: string | null
}

function clean(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (s === '' || s === 'null' || s === 'None' || s === '_') return null
  return s
}

function mergeText(base: string | null, addition: string | null): string | null {
  if (!addition) return base
  if (!base) return addition
  return base + ' ' + addition
}

function cell(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })
  const c = ws[addr]
  return c ? c.v : null
}

export interface ParseResult {
  complaints: Complaint[]
  dateRange: string | null
}

export function parseExcelFile(data: ArrayBuffer): ParseResult {
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const maxRow = range.e.r + 1 // 1-based

  // Date range from row 2, col 1
  const row2 = cell(ws, 2, 1)
  const dateRange = row2 ? String(row2).trim() : null

  const complaints: Complaint[] = []
  let current: Complaint | null = null
  let idCounter = 0

  for (let rowIdx = 4; rowIdx <= maxRow; rowIdx++) {
    const col1 = cell(ws, rowIdx, 1)
    const col3 = cell(ws, rowIdx, 3)

    let isNewRecord = false
    if (col1 != null) {
      const num = Number(col1)
      if (!isNaN(num) && col3 != null) {
        isNewRecord = true
      }
    }

    if (isNewRecord) {
      if (current) complaints.push(current)

      // Parse citizen name and phone
      const citizenRaw = clean(cell(ws, rowIdx, 5))
      let citizenName: string | null = null
      let citizenPhone: string | null = null
      if (citizenRaw) {
        const phoneMatch = citizenRaw.match(/(\d{8,})$/)
        if (phoneMatch) {
          citizenPhone = phoneMatch[1]
          citizenName = citizenRaw.slice(0, phoneMatch.index).trim()
        } else {
          citizenName = citizenRaw
        }
      }

      let respondingOrg = clean(cell(ws, rowIdx, 20))
      if (respondingOrg === 'null, null') respondingOrg = null

      let responseDate = clean(cell(ws, rowIdx, 24))
      if (responseDate === 'null') responseDate = null

      current = {
        id: String(++idCounter),
        complaint_number: Number(col1),
        complaint_id: String(col3).trim(),
        citizen_register: clean(cell(ws, rowIdx, 4)),
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        complaint_type: clean(cell(ws, rowIdx, 9)),
        district: clean(cell(ws, rowIdx, 10)),
        khoroo: clean(cell(ws, rowIdx, 12)),
        address: clean(cell(ws, rowIdx, 13)),
        category: clean(cell(ws, rowIdx, 15)),
        description: clean(cell(ws, rowIdx, 16)),
        response: clean(cell(ws, rowIdx, 18)),
        responding_org: respondingOrg,
        officer: clean(cell(ws, rowIdx, 21)),
        resolution_status: clean(cell(ws, rowIdx, 22)),
        response_method: responseDate,
        resolution_date: clean(cell(ws, rowIdx, 25)),
        report_date_range: dateRange,
      }
    } else if (current) {
      // Continuation row — merge text fields
      const descExtra = clean(cell(ws, rowIdx, 16))
      const respExtra = clean(cell(ws, rowIdx, 18))
      current.description = mergeText(current.description, descExtra)
      current.response = mergeText(current.response, respExtra)

      const statusVal = clean(cell(ws, rowIdx, 22))
      if (statusVal && !current.resolution_status) {
        current.resolution_status = statusVal
      }
      let orgVal = clean(cell(ws, rowIdx, 20))
      if (orgVal === 'null, null') orgVal = null
      if (orgVal && !current.responding_org) {
        current.responding_org = orgVal
      }
    }
  }

  if (current) complaints.push(current)
  return { complaints, dateRange }
}
