import { daysUntil, formatDate, formatDistance, relativeDays } from './format'
import { latestService } from './health'

const WINDOW_DAYS = 90
const severityOf = (d) => (d < 0 ? 'overdue' : d <= 30 ? 'soon' : 'upcoming')

/**
 * Builds the unified reminder list. Insurance, PUC, warranty, service and task reminders are
 * derived from existing records (so they can never drift out of sync); custom ones come from the
 * reminders table. Notification preferences from Settings decide which derived kinds appear.
 */
export function deriveReminders({ vehicles, services, tasks, reminders }, prefs, unit = 'km') {
  const n = prefs?.notifications ?? {}
  const out = []
  const vname = (id) => vehicles.find((v) => v.id === id)?.nickname

  const push = (r) => out.push(r)
  const dated = ({ kind, vehicle, title, date, pref, tab }) => {
    if (!date || pref === false) return
    const d = daysUntil(date)
    if (d > WINDOW_DAYS) return
    push({ id: `${kind}:${vehicle.id}`, kind, vehicleId: vehicle.id, vehicleName: vehicle.nickname, title, dueDate: date,
      daysLeft: d, severity: severityOf(d), detail: `${formatDate(date)} · ${relativeDays(d)}`, link: `/vehicles/${vehicle.id}?tab=${tab}` })
  }

  for (const v of vehicles) {
    dated({ kind: 'insurance', vehicle: v, title: 'Insurance expires', date: v.insurance_expiry, pref: n.insurance, tab: 'overview' })
    dated({ kind: 'puc', vehicle: v, title: 'PUC expires', date: v.puc_expiry, pref: n.puc, tab: 'overview' })
    dated({ kind: 'warranty', vehicle: v, title: 'Warranty expires', date: v.warranty_expiry, pref: n.warranty, tab: 'overview' })

    if (n.service !== false) {
      const last = latestService(services.filter((s) => s.vehicle_id === v.id))
      if (last) {
        dated({ kind: 'service', vehicle: v, title: 'Service due', date: last.next_service_date, pref: true, tab: 'service' })
        if (last.next_service_odometer_km != null) {
          const left = last.next_service_odometer_km - v.odometer_km
          if (left <= 500) push({
            id: `service-km:${v.id}`, kind: 'service', vehicleId: v.id, vehicleName: v.nickname, title: 'Service due by distance',
            dueDate: null, daysLeft: null, severity: left <= 0 ? 'overdue' : 'soon',
            detail: left <= 0 ? `Due at ${formatDistance(last.next_service_odometer_km, unit)}, now ${formatDistance(v.odometer_km, unit)}`
              : `${formatDistance(left, unit)} to go (due at ${formatDistance(last.next_service_odometer_km, unit)})`,
            link: `/vehicles/${v.id}?tab=service`,
          })
        }
      }
    }
  }

  if (n.service !== false) {
    for (const t of tasks) {
      if (!['pending', 'in_progress'].includes(t.status)) continue
      const v = vehicles.find((x) => x.id === t.vehicle_id)
      if (!v) continue
      if (t.due_date) {
        const d = daysUntil(t.due_date)
        if (d <= WINDOW_DAYS) push({ id: `task:${t.id}`, kind: 'maintenance', vehicleId: v.id, vehicleName: v.nickname, title: t.title,
          dueDate: t.due_date, daysLeft: d, severity: severityOf(d), detail: `${formatDate(t.due_date)} · ${relativeDays(d)}`, link: `/vehicles/${v.id}?tab=maintenance` })
      } else if (t.due_odometer_km != null && v.odometer_km >= t.due_odometer_km) {
        push({ id: `task-km:${t.id}`, kind: 'maintenance', vehicleId: v.id, vehicleName: v.nickname, title: t.title, dueDate: null, daysLeft: null,
          severity: 'overdue', detail: `Due at ${formatDistance(t.due_odometer_km, unit)}`, link: `/vehicles/${v.id}?tab=maintenance` })
      }
    }
  }

  for (const r of reminders) {
    if (r.status !== 'active') continue
    const d = daysUntil(r.due_date)
    push({ id: `custom:${r.id}`, kind: 'custom', customId: r.id, vehicleId: r.vehicle_id, vehicleName: r.vehicle_id ? vname(r.vehicle_id) : null,
      title: r.title, dueDate: r.due_date, daysLeft: d, severity: severityOf(d), detail: `${formatDate(r.due_date)} · ${relativeDays(d)}`, notes: r.notes,
      link: r.vehicle_id ? `/vehicles/${r.vehicle_id}` : '/notifications' })
  }

  return out.sort((a, b) => (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999))
}
