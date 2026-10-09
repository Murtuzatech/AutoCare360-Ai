import { describe, expect, it } from 'vitest'
import { computeHealth } from '@/lib/health'
import { deriveReminders } from '@/lib/reminders'
import { buildTimeline } from '@/lib/timeline'
import { buildLedger, byCategory, filterLedger, monthlySeries, total } from '@/lib/expenses'
import { buildReport, plainMoney, REPORT_TYPES } from '@/lib/reports/models'
import { renderPdf } from '@/lib/reports/pdf'
import { fromKm, parseDistanceInput, toLocalISO } from '@/lib/format'
import { mergeDeep, withDefaults } from '@/lib/preferences'

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toLocalISO(d) }
const now = new Date().toISOString()
const v = { id: 'v1', nickname: 'City', make: 'Honda', model: 'City', fuel_type: 'petrol', odometer_km: 65000, insurance_expiry: day(-5), puc_expiry: day(10), warranty_expiry: null, created_at: now, purchase_date: null }
const svc = [
  { id: 's1', vehicle_id: 'v1', service_date: day(-200), created_at: now, next_service_date: day(-10), next_service_odometer_km: 64000, total_cost: 5000, service_type: 'routine', odometer_km: 60000, parts: [], labour_cost: 5000 },
  { id: 's2', vehicle_id: 'v1', service_date: day(-90), created_at: now, service_type: 'repair', service_center: 'Garage', odometer_km: 58000, labour_cost: 500, parts: [{ name: 'Pad', qty: 2, cost: 100 }], total_cost: 700 },
]
const issues = [{ id: 'i1', vehicle_id: 'v1', status: 'open', severity: 'high', title: 'Brake noise', reported_at: day(-3), created_at: now }]
const tasks = [{ id: 't1', vehicle_id: 'v1', title: 'Brake pads', category: 'brakes', status: 'pending', due_date: day(-2), created_at: now }]
const expenses = [{ id: 'e1', vehicle_id: 'v1', expense_date: day(-5), category: 'fuel', amount: 3000, description: 'Tank' }]

describe('health score', () => {
  it('penalises expired insurance, due PUC, overdue service and high-severity issues', () => {
    const h = computeHealth(v, { services: svc.slice(0, 1), tasks: [], issues })
    expect(h.score).toBe(37); expect(h.level).toBe('action')
  })
  it('is 100 with nothing wrong and never negative', () => {
    expect(computeHealth({ ...v, insurance_expiry: day(200), puc_expiry: day(200) }, { services: [], tasks: [], issues: [] }).score).toBe(100)
    const bad = Array.from({ length: 6 }, (_, i) => ({ ...issues[0], id: `i${i}`, severity: 'critical' }))
    expect(computeHealth(v, { services: svc, tasks, issues: bad }).score).toBeGreaterThanOrEqual(0)
  })
})

describe('reminders', () => {
  const prefs = { notifications: { service: true, insurance: true, puc: false, warranty: true } }
  it('derives from records, respects preferences and hides completed custom reminders', () => {
    const r = deriveReminders({ vehicles: [v], services: svc.slice(0, 1), tasks: [], reminders: [{ id: 'c1', status: 'active', title: 'Tax', due_date: day(5), vehicle_id: null }, { id: 'c2', status: 'done', title: 'x', due_date: day(5), vehicle_id: null }] }, prefs)
    expect(r.map((x) => x.kind).sort()).toEqual(['custom', 'insurance', 'service', 'service'])
    expect(r[0].severity).toBe('overdue')
  })
})

describe('timeline, ledger and units', () => {
  it('timeline is newest first', () => {
    const t = buildTimeline(v, { services: svc, tasks: [], issues })
    expect(t.length).toBeGreaterThanOrEqual(3)
    expect(t.map((e) => e.date)).toEqual([...t.map((e) => e.date)].sort().reverse())
  })
  it('ledger combines expenses and service costs without double counting when toggled', () => {
    expect(total(buildLedger(expenses, svc, true))).toBe(8700)
    expect(total(buildLedger(expenses, svc, false))).toBe(3000)
    expect(byCategory(buildLedger(expenses, svc, true))[0].category).toBe('service')
    expect(filterLedger(buildLedger(expenses, svc, true), { from: day(-100) }).length).toBe(2)
    const m = monthlySeries(buildLedger(expenses, svc, true), null)
    expect(Math.round(m.reduce((s, r) => s + r.total, 0))).toBe(8700)
  })
  it('distance conversion does not drift when the field is untouched', () => {
    expect(fromKm(1609, 'mi')).toBe(1000)
    expect(parseDistanceInput('997', 'mi', 1605)).toBe(1605)
    expect(parseDistanceInput('1200', 'mi', 1605)).toBe(1931)
    expect(parseDistanceInput('', 'km', null)).toBeNull()
  })
  it('preferences merge deeply and keep defaults', () => {
    expect(withDefaults({ units: { distance: 'mi' } }).units).toEqual({ distance: 'mi', currency: 'INR' })
    expect(mergeDeep({ a: { b: 1, c: 2 } }, { a: { b: 9 } })).toEqual({ a: { b: 9, c: 2 } })
  })
})

describe('PDF reports', () => {
  const fmt = { money: plainMoney('INR'), dist: (km) => `${km} km` }
  for (const t of REPORT_TYPES) {
    it(`builds a valid PDF for the ${t.value} report (including non-Latin text)`, () => {
      const exp = [...expenses, { ...expenses[0], id: 'e2', description: 'नमस्ते ₹ — test' }]
      const model = buildReport(t.value, { vehicle: t.allVehicles ? null : v, vehicles: [v], services: svc, tasks, issues, expenses: exp, range: {}, includeService: true, fmt, unit: 'km' })
      expect(model.sections.length).toBeGreaterThanOrEqual(3)
      const bytes = new Uint8Array(renderPdf(model).output('arraybuffer'))
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
      expect(bytes.length).toBeGreaterThan(1500)
    })
  }
  it('supports an AI summary section with wrapped text', () => {
    const model = buildReport('health', { vehicle: v, vehicles: [v], services: svc, tasks, issues, expenses, range: {}, fmt, unit: 'km' })
    model.sections.unshift({ type: 'text', heading: 'AI-generated summary', text: 'Long sentence. '.repeat(60) })
    expect(renderPdf(model).getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
