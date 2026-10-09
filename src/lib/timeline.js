import { toLocalISO } from './format'

/** Merges everything that happened to a vehicle into one newest-first list. */
export function buildTimeline(vehicle, { services, tasks, issues }) {
  const events = []
  const day = (ts) => toLocalISO(new Date(ts))

  if (vehicle.purchase_date) events.push({ id: `buy:${vehicle.id}`, date: vehicle.purchase_date, kind: 'purchase', title: 'Vehicle purchased' })
  events.push({ id: `added:${vehicle.id}`, date: day(vehicle.created_at), kind: 'added', title: 'Added to AutoCare 360' })

  for (const s of services) events.push({ id: `svc:${s.id}`, date: s.service_date, kind: 'service', title: s.service_type === 'repair' ? 'Repair' : s.service_type === 'inspection' ? 'Inspection' : 'Service',
    detail: s.service_center || undefined, amount: s.total_cost, odometer: s.odometer_km })
  for (const t of tasks) if (t.status === 'completed' && t.completed_at) events.push({ id: `task:${t.id}`, date: day(t.completed_at), kind: 'task', title: `Completed: ${t.title}` })
  for (const i of issues) {
    events.push({ id: `issue:${i.id}`, date: i.reported_at, kind: 'issue', title: `Issue reported: ${i.title}`, severity: i.severity })
    if (i.status === 'resolved' && i.resolved_at) events.push({ id: `fix:${i.id}`, date: day(i.resolved_at), kind: 'resolved', title: `Issue resolved: ${i.title}` })
  }
  return events.sort((a, b) => b.date.localeCompare(a.date))
}
