import { computeHealth, healthMeta, latestService, taskIsOverdue } from '../health'
import { buildLedger, byCategory, byVehicle, filterLedger, monthlySeries, total } from '../expenses'
import { EXPENSE_CATEGORIES, FUEL_TYPES, ISSUE_SEVERITIES, SERVICE_TYPES, TASK_CATEGORIES, TASK_STATUSES, TRANSMISSIONS, labelOf } from '../constants'
import { formatDate, formatMonth, relativeDays, daysUntil } from '../format'

export const REPORT_TYPES = [
  { value: 'summary', label: 'Vehicle summary', description: 'Key details, compliance dates, health and cost at a glance.', needsVehicle: true },
  { value: 'health', label: 'Vehicle health report', description: 'Health score with what affects it, open issues and overdue tasks.', needsVehicle: true },
  { value: 'service', label: 'Service history report', description: 'Every service and repair with costs, parts and next-service dates.', needsVehicle: true, range: true },
  { value: 'maintenance', label: 'Maintenance report', description: 'Maintenance tasks by status with due dates.', needsVehicle: true },
  { value: 'expense', label: 'Expense report', description: 'Spending by month, category and vehicle, with every line item.', range: true, allVehicles: true },
]

/** Currency for PDFs uses the ISO code (e.g. "INR 1,200.00") because standard PDF fonts lack many currency symbols. */
export const plainMoney = (currency) => (n) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(Number(n) || 0).replace(/\u00a0/g, ' ') }
  catch { return `${currency} ${(Number(n) || 0).toFixed(2)}` }
}

const kv = (heading, rows) => ({ type: 'kv', heading, rows: rows.filter((r) => r[1] !== null && r[1] !== undefined && r[1] !== '') })
const table = (heading, columns, rows, opts = {}) => rows.length
  ? { type: 'table', heading, columns, rows, ...opts }
  : { type: 'text', heading, text: opts.empty || 'No records.' }
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const rangeText = ({ from, to }) => (from || to ? `${from ? formatDate(from) : 'Start'} to ${to ? formatDate(to) : 'today'}` : 'All time')
const dateStamp = () => new Date().toISOString().slice(0, 10)

const vehicleDetails = (v, fmt) => kv('Vehicle', [
  ['Nickname', v.nickname],
  ['Make / model', [v.make, v.model, v.variant].filter(Boolean).join(' ')],
  ['Year', v.manufacturing_year],
  ['Registration', v.registration_number],
  ['VIN / chassis', v.vin],
  ['Fuel', labelOf(FUEL_TYPES, v.fuel_type)],
  ['Transmission', v.transmission && labelOf(TRANSMISSIONS, v.transmission)],
  ['Odometer', fmt.dist(v.odometer_km)],
  ['Purchased', v.purchase_date && `${formatDate(v.purchase_date)}${v.purchase_price != null ? ` for ${fmt.money(v.purchase_price)}` : ''}`],
])

const compliance = (v) => {
  const line = (date) => (date ? `${formatDate(date)} (${relativeDays(daysUntil(date)).replace('overdue', 'ago')})` : 'Not recorded')
  return kv('Insurance, PUC and warranty', [
    ['Insurance', [v.insurance_provider, v.insurance_policy_number].filter(Boolean).join(', ') || null],
    ['Insurance expiry', line(v.insurance_expiry)],
    ['PUC expiry', line(v.puc_expiry)],
    ['Warranty', v.warranty_provider],
    ['Warranty expiry', line(v.warranty_expiry)],
  ])
}

const healthSection = (health) => ({
  type: 'table', heading: `Health score: ${health.score} / 100 (${healthMeta[health.level].label})`,
  columns: ['Factor', 'Status', 'Detail', 'Impact'],
  rows: health.factors.map((f) => [f.label, { good: 'Good', warn: 'Watch', bad: 'Problem', unknown: 'No data' }[f.status], f.detail, f.penalty ? `-${f.penalty}` : '0']),
})

const issueRows = (issues) => issues.map((i) => [i.title, labelOf(ISSUE_SEVERITIES, i.severity), formatDate(i.reported_at), i.description || ''])

export function buildReport(type, ctx) {
  const { vehicle, vehicles = [], services = [], tasks = [], issues = [], expenses = [], range = {}, includeService = true, fmt, unit } = ctx
  const meta = REPORT_TYPES.find((r) => r.value === type)
  const generated = `Generated ${formatDate(new Date().toISOString().slice(0, 10))}`

  if (type === 'summary' || type === 'health') {
    const scoped = { services, tasks, issues }
    const health = computeHealth(vehicle, scoped, unit)
    const open = issues.filter((i) => i.status === 'open')
    const overdue = tasks.filter((t) => taskIsOverdue(t, vehicle))
    const sections = [vehicleDetails(vehicle, fmt), compliance(vehicle), healthSection(health)]
    if (type === 'summary') {
      const spend = total(buildLedger(expenses, services, true).filter((e) => e.vehicleId === vehicle.id))
      const last = latestService(services)
      sections.push(kv('Activity', [
        ['Service records', String(services.length)],
        ['Last service', last ? `${formatDate(last.service_date)} at ${fmt.dist(last.odometer_km)}` : 'None recorded'],
        ['Open issues', String(open.length)],
        ['Open maintenance tasks', String(tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length)],
        ['Total recorded spend', fmt.money(spend)],
      ]))
    }
    sections.push(table('Open issues', ['Issue', 'Severity', 'Noticed', 'Details'], issueRows(open), { empty: 'No open issues.' }))
    sections.push(table('Overdue maintenance tasks', ['Task', 'Category', 'Due'], overdue.map((t) => [t.title, labelOf(TASK_CATEGORIES, t.category), t.due_date ? formatDate(t.due_date) : `at ${fmt.dist(t.due_odometer_km)}`]), { empty: 'No overdue tasks.' }))
    sections.push({ type: 'note', text: 'The health score is calculated only from the records entered in AutoCare 360. It is not an inspection or a professional diagnosis. Have safety-critical concerns checked by a qualified mechanic.' })
    return { title: meta.label, subtitle: `${vehicle.nickname} · ${generated}`, filename: `autocare360-${type}-${slug(vehicle.nickname)}-${dateStamp()}.pdf`, sections }
  }

  if (type === 'service') {
    const list = services.filter((s) => (!range.from || s.service_date >= range.from) && (!range.to || s.service_date <= range.to))
      .sort((a, b) => b.service_date.localeCompare(a.service_date))
    const spend = list.reduce((s, r) => s + Number(r.total_cost), 0)
    return {
      title: meta.label, subtitle: `${vehicle.nickname} · ${rangeText(range)} · ${generated}`,
      filename: `autocare360-service-${slug(vehicle.nickname)}-${dateStamp()}.pdf`,
      sections: [
        vehicleDetails(vehicle, fmt),
        kv('Summary', [['Records', String(list.length)], ['Total spend', fmt.money(spend)], ['Average per record', list.length ? fmt.money(spend / list.length) : null]]),
        table('Service records', ['Date', 'Type', 'Service center', 'Odometer', 'Parts', 'Total'],
          list.map((s) => [formatDate(s.service_date), labelOf(SERVICE_TYPES, s.service_type), s.service_center || '', fmt.dist(s.odometer_km),
            s.parts.map((p) => `${p.qty} x ${p.name}`).join(', '), fmt.money(s.total_cost)]), { align: { 3: 'right', 5: 'right' }, empty: 'No service records in this period.' }),
        { type: 'note', text: 'Costs are as entered by the vehicle owner (labour plus parts).' },
      ],
    }
  }

  if (type === 'maintenance') {
    const order = { pending: 0, in_progress: 1, completed: 2, skipped: 3 }
    const sorted = [...tasks].sort((a, b) => order[a.status] - order[b.status] || (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    return {
      title: meta.label, subtitle: `${vehicle.nickname} · ${generated}`, filename: `autocare360-maintenance-${slug(vehicle.nickname)}-${dateStamp()}.pdf`,
      sections: [
        vehicleDetails(vehicle, fmt),
        kv('Summary', TASK_STATUSES.map((s) => [s.label, String(tasks.filter((t) => t.status === s.value).length)])),
        table('Maintenance tasks', ['Task', 'Category', 'Status', 'Due', 'Notes'],
          sorted.map((t) => [t.title, labelOf(TASK_CATEGORIES, t.category), labelOf(TASK_STATUSES, t.status),
            [t.due_date && formatDate(t.due_date), t.due_odometer_km != null && `at ${fmt.dist(t.due_odometer_km)}`].filter(Boolean).join(' ') || '-', t.notes || '']),
          { empty: 'No maintenance tasks recorded.' }),
      ],
    }
  }

  // expense report
  const scopedVehicles = vehicle ? [vehicle] : vehicles
  const ledger = filterLedger(buildLedger(expenses, services, includeService), { vehicleId: vehicle?.id, from: range.from, to: range.to })
  const sum = total(ledger)
  const name = (id) => vehicles.find((v) => v.id === id)?.nickname ?? ''
  const months = monthlySeries(ledger, range.from)
  const sections = [
    kv('Summary', [
      ['Vehicles', scopedVehicles.map((v) => v.nickname).join(', ') || null], ['Period', rangeText(range)],
      ['Total spend', fmt.money(sum)], ['Entries', String(ledger.length)],
      ['Monthly average', months.length ? fmt.money(sum / months.length) : null],
      ['Includes service records', includeService ? 'Yes' : 'No'],
    ]),
    table('By category', ['Category', 'Amount', 'Share'], byCategory(ledger).map((c) => [labelOf(EXPENSE_CATEGORIES, c.category), fmt.money(c.amount), `${Math.round((c.amount / sum) * 100)}%`]), { align: { 1: 'right', 2: 'right' }, empty: 'No spending in this period.' }),
  ]
  if (!vehicle && scopedVehicles.length > 1) sections.push(table('By vehicle', ['Vehicle', 'Amount'], byVehicle(ledger, vehicles).map((v) => [v.name, fmt.money(v.amount)]), { align: { 1: 'right' } }))
  sections.push(table('By month', ['Month', 'Amount'], months.filter((m) => m.total > 0).reverse().map((m) => [formatMonth(`${m.key}-01`), fmt.money(m.total)]), { align: { 1: 'right' } }))
  sections.push(table('All entries', vehicle ? ['Date', 'Category', 'Description', 'Amount'] : ['Date', 'Vehicle', 'Category', 'Description', 'Amount'],
    ledger.map((e) => (vehicle
      ? [formatDate(e.date), labelOf(EXPENSE_CATEGORIES, e.category), e.description || '', fmt.money(e.amount)]
      : [formatDate(e.date), name(e.vehicleId), labelOf(EXPENSE_CATEGORIES, e.category), e.description || '', fmt.money(e.amount)])),
    { align: { [vehicle ? 3 : 4]: 'right' }, empty: 'No entries.' }))
  return { title: meta.label, subtitle: `${vehicle ? vehicle.nickname : 'All vehicles'} · ${rangeText(range)} · ${generated}`,
    filename: `autocare360-expenses-${vehicle ? slug(vehicle.nickname) : 'all'}-${dateStamp()}.pdf`, sections }
}
