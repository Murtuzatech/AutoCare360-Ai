import { daysUntil, formatDate, formatDistance, relativeDays } from './format'

export const latestService = (services) =>
  [...services].sort((a, b) => b.service_date.localeCompare(a.service_date) || b.created_at.localeCompare(a.created_at))[0] ?? null

const ISSUE_PENALTY = { critical: 30, high: 20, medium: 10, low: 3 }
export const taskIsOverdue = (task, vehicle) =>
  ['pending', 'in_progress'].includes(task.status) &&
  ((task.due_date && daysUntil(task.due_date) < 0) ||
   (task.due_odometer_km != null && vehicle && vehicle.odometer_km >= task.due_odometer_km))

/**
 * Transparent, rules-based health score computed ONLY from records the user has entered.
 * It is not an inspection and says so wherever it is shown.
 */
export function computeHealth(vehicle, { services, tasks, issues }, unit = 'km') {
  const factors = []
  let score = 100
  const add = (id, label, status, detail, penalty = 0) => { factors.push({ id, label, status, detail, penalty }); score -= penalty }

  const dated = (id, label, expiry, badPenalty, warnPenalty) => {
    if (!expiry) return add(id, label, 'unknown', 'Expiry date not recorded')
    const d = daysUntil(expiry)
    if (d < 0) add(id, label, 'bad', `Expired ${-d} day${d === -1 ? '' : 's'} ago (${formatDate(expiry)})`, badPenalty)
    else if (d <= 30) add(id, label, 'warn', `Expires ${relativeDays(d)} (${formatDate(expiry)})`, warnPenalty)
    else add(id, label, 'good', `Valid until ${formatDate(expiry)}`)
  }
  dated('insurance', 'Insurance', vehicle.insurance_expiry, 25, 5)
  dated('puc', 'PUC certificate', vehicle.puc_expiry, 15, 3)

  const last = latestService(services)
  if (!last) add('service', 'Service', 'unknown', 'No service recorded yet')
  else {
    const dateDue = last.next_service_date ? daysUntil(last.next_service_date) : null
    const kmLeft = last.next_service_odometer_km != null ? last.next_service_odometer_km - vehicle.odometer_km : null
    if ((dateDue != null && dateDue < 0) || (kmLeft != null && kmLeft <= 0)) {
      const why = dateDue != null && dateDue < 0 ? `due ${formatDate(last.next_service_date)}` : `due at ${formatDistance(last.next_service_odometer_km, unit)}`
      add('service', 'Service', 'bad', `Next service overdue (${why})`, 15)
    } else if ((dateDue != null && dateDue <= 14) || (kmLeft != null && kmLeft <= 500)) {
      add('service', 'Service', 'warn', 'Next service is coming up soon', 3)
    } else if (dateDue == null && kmLeft == null) add('service', 'Service', 'unknown', `Last serviced ${formatDate(last.service_date)}; no next service set`)
    else add('service', 'Service', 'good', `Last serviced ${formatDate(last.service_date)}`)
  }

  const overdue = tasks.filter((t) => taskIsOverdue(t, vehicle))
  if (overdue.length) add('tasks', 'Maintenance tasks', 'bad', `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, Math.min(15, overdue.length * 5))
  else add('tasks', 'Maintenance tasks', 'good', 'No overdue tasks')

  const open = issues.filter((i) => i.status === 'open')
  if (open.length) {
    const penalty = Math.min(60, open.reduce((s, i) => s + ISSUE_PENALTY[i.severity], 0))
    const serious = open.some((i) => i.severity === 'high' || i.severity === 'critical')
    add('issues', 'Open issues', serious ? 'bad' : 'warn', `${open.length} open issue${open.length > 1 ? 's' : ''}`, penalty)
  } else add('issues', 'Open issues', 'good', 'No open issues')

  score = Math.max(0, score)
  const level = score >= 85 ? 'good' : score >= 60 ? 'attention' : 'action'
  return { score, level, factors }
}

export const healthMeta = {
  good: { label: 'Good', tone: 'ok' },
  attention: { label: 'Needs attention', tone: 'warn' },
  action: { label: 'Action needed', tone: 'danger' },
}
