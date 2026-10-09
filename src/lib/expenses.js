import { toLocalISO } from './format'

/**
 * Builds the spending ledger. Service records already carry a cost, so they can be included
 * read-only (as 'service' or 'repairs') instead of forcing double entry.
 */
export function buildLedger(expenses, services, includeService = true) {
  const manual = expenses.map((e) => ({ id: e.id, source: 'expense', date: e.expense_date, vehicleId: e.vehicle_id, category: e.category,
    amount: Number(e.amount), description: e.description, receiptPath: e.receipt_path, raw: e }))
  if (!includeService) return manual
  const fromService = services.filter((s) => Number(s.total_cost) > 0).map((s) => ({ id: `svc:${s.id}`, source: 'service', date: s.service_date,
    vehicleId: s.vehicle_id, category: s.service_type === 'repair' ? 'repairs' : 'service', amount: Number(s.total_cost),
    description: s.service_center || 'Service record', raw: s }))
  return [...manual, ...fromService].sort((a, b) => b.date.localeCompare(a.date))
}

export function periodStart(period, now = new Date()) {
  if (period === '3m') { const d = new Date(now); d.setMonth(d.getMonth() - 3); return toLocalISO(d) }
  if (period === '12m') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return toLocalISO(d) }
  if (period === 'ytd') return `${now.getFullYear()}-01-01`
  return null
}

export function filterLedger(ledger, { vehicleId, from, to }) {
  return ledger.filter((e) => (!vehicleId || e.vehicleId === vehicleId) && (!from || e.date >= from) && (!to || e.date <= to))
}

export const total = (entries) => entries.reduce((s, e) => s + e.amount, 0)

export function byCategory(entries) {
  const map = {}
  for (const e of entries) map[e.category] = (map[e.category] || 0) + e.amount
  return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}

export function byVehicle(entries, vehicles) {
  const map = {}
  for (const e of entries) map[e.vehicleId] = (map[e.vehicleId] || 0) + e.amount
  return Object.entries(map).map(([id, amount]) => ({ id, name: vehicles.find((v) => v.id === id)?.nickname ?? 'Unknown', amount })).sort((a, b) => b.amount - a.amount)
}

const monthKey = (iso) => iso.slice(0, 7)

/** One row per calendar month between the first and last month, zero-filled, with a 3-month moving average. */
export function monthlySeries(entries, fromISO) {
  if (!entries.length) return []
  const sums = {}
  for (const e of entries) sums[monthKey(e.date)] = (sums[monthKey(e.date)] || 0) + e.amount
  const keys = Object.keys(sums).sort()
  const start = fromISO ? monthKey(fromISO) : keys[0]
  const now = toLocalISO(new Date())
  const end = keys[keys.length - 1] > monthKey(now) ? keys[keys.length - 1] : monthKey(now)
  const rows = []
  let [y, m] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    rows.push({ key, total: Math.round((sums[key] || 0) * 100) / 100 })
    m += 1; if (m > 12) { m = 1; y += 1 }
  }
  return rows.map((r, i) => {
    const win = rows.slice(Math.max(0, i - 2), i + 1)
    return { ...r, average: Math.round((win.reduce((s, x) => s + x.total, 0) / win.length) * 100) / 100 }
  })
}
