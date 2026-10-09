const KM_PER_MI = 1.609344

// Odometer values are stored in km; the user's unit preference only affects display and input.
export const fromKm = (km, unit) => (km == null ? null : unit === 'mi' ? Math.round(km / KM_PER_MI) : km)
export const toKm = (value, unit) => (unit === 'mi' ? Math.round(value * KM_PER_MI) : Math.round(value))
export const formatDistance = (km, unit) => (km == null ? '—' : `${fromKm(km, unit).toLocaleString()} ${unit}`)

/** Keeps the stored km untouched when the user didn't edit the field (avoids mi↔km rounding drift). */
export function parseDistanceInput(raw, unit, originalKm) {
  if (raw === '' || raw == null) return null
  if (originalKm != null && String(raw) === String(fromKm(originalKm, unit))) return originalKm
  return toKm(Number(raw), unit)
}

export const formatMoney = (amount, currency = 'INR') => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0) }
  catch { return `${currency} ${Number(amount || 0).toFixed(2)}` }
}

const pad = (n) => String(n).padStart(2, '0')
export const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toLocalISO(new Date())
export const parseDate = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null)
export const formatDate = (s) => (s ? parseDate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const formatMonth = (s) => parseDate(s).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
export const daysUntil = (s) => Math.round((parseDate(s) - parseDate(todayISO())) / 86400000)

export function relativeDays(n) {
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return '1 day overdue'
  return n > 0 ? `in ${n} days` : `${-n} days overdue`
}

export const cleanText = (v) => { const t = (v ?? '').toString().trim(); return t === '' ? null : t }
export const cleanNumber = (v) => (v === '' || v == null ? null : Number(v))

export function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
