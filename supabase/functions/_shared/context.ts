// Builds the owner's data context for the model. Reads go through the USER-scoped client, so
// Row Level Security guarantees only that user's rows are ever returned.

type Db = any // supabase-js client

const clip = (v: unknown, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const dash = (v: unknown) => (v == null || v === '' ? '-' : String(v))

export interface ContextSummary { vehicle: string | null; vehicles: number; services: number; openIssues: number; openTasks: number }
export interface BuiltContext { text: string; summary: ContextSummary; vehicleIds: string[] }

export async function buildContext(db: Db, opts: { vehicleId?: string | null; today: string }): Promise<BuiltContext> {
  const yearAgo = new Date(opts.today); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const from = yearAgo.toISOString().slice(0, 10)

  const [v, s, t, i, e, r] = await Promise.all([
    db.from('vehicles').select('id,nickname,make,model,variant,manufacturing_year,fuel_type,transmission,odometer_km,insurance_expiry,puc_expiry,warranty_expiry,notes').order('created_at'),
    db.from('service_records').select('vehicle_id,service_date,odometer_km,service_type,service_center,total_cost,notes,next_service_date,next_service_odometer_km').order('service_date', { ascending: false }).limit(200),
    db.from('maintenance_tasks').select('vehicle_id,title,category,status,due_date,due_odometer_km,completed_at').order('created_at', { ascending: false }).limit(200),
    db.from('vehicle_issues').select('vehicle_id,title,description,severity,status,reported_at').order('created_at', { ascending: false }).limit(100),
    db.from('expenses').select('vehicle_id,expense_date,category,amount').gte('expense_date', from).limit(1000),
    db.from('reminders').select('vehicle_id,title,due_date,status').eq('status', 'active').limit(50),
  ])
  for (const q of [v, s, t, i, e, r]) if (q.error) throw new Error(q.error.message)

  const vehicles: any[] = v.data ?? []
  const services: any[] = s.data ?? []
  const tasks: any[] = t.data ?? []
  const issues: any[] = i.data ?? []
  const expenses: any[] = e.data ?? []
  const reminders: any[] = r.data ?? []
  const open = (x: any) => x.status === 'pending' || x.status === 'in_progress'
  const selected = vehicles.find((x) => x.id === opts.vehicleId) ?? null

  const out: string[] = [`TODAY: ${opts.today}`, `VEHICLES (${vehicles.length}):`]
  if (!vehicles.length) out.push('- none recorded')
  for (const x of vehicles) {
    const last = services.find((y) => y.vehicle_id === x.id)
    out.push(`- id=${x.id} | "${clip(x.nickname, 60)}" | ${dash(x.manufacturing_year)} ${clip(x.make, 40)} ${clip(x.model, 40)} ${clip(x.variant, 40)}`.trimEnd()
      + ` | ${x.fuel_type}${x.transmission ? `, ${x.transmission}` : ''} | odometer ${x.odometer_km} km`
      + ` | insurance expires ${dash(x.insurance_expiry)} | PUC expires ${dash(x.puc_expiry)} | warranty expires ${dash(x.warranty_expiry)}`
      + ` | open issues ${issues.filter((y) => y.vehicle_id === x.id && y.status === 'open').length}`
      + ` | open tasks ${tasks.filter((y) => y.vehicle_id === x.id && open(y)).length}`
      + ` | last service ${last ? `${last.service_date} at ${last.odometer_km} km` : 'none'}`)
  }

  if (selected) {
    out.push('', `SELECTED VEHICLE (the user is asking about this one): "${clip(selected.nickname, 60)}" id=${selected.id}`)
    if (selected.notes) out.push(`Owner notes: ${clip(selected.notes, 400)}`)
    const sv = services.filter((x) => x.vehicle_id === selected.id).slice(0, 10)
    out.push(`Recent services (${sv.length} shown, newest first):`)
    for (const x of sv) out.push(`- ${x.service_date} | ${x.service_type} | ${x.odometer_km} km | ${clip(x.service_center, 60) || 'no center recorded'} | cost ${x.total_cost}${x.next_service_date || x.next_service_odometer_km != null ? ` | next due ${dash(x.next_service_date)} / ${dash(x.next_service_odometer_km)} km` : ''}${x.notes ? ` | notes: ${clip(x.notes, 160)}` : ''}`)
    if (!sv.length) out.push('- none recorded')
    const is = issues.filter((x) => x.vehicle_id === selected.id).slice(0, 10)
    out.push('Issues (open first):')
    for (const x of [...is].sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1))) out.push(`- [${x.status}] ${x.severity} | ${clip(x.title, 100)} | reported ${x.reported_at}${x.description ? ` | ${clip(x.description, 200)}` : ''}`)
    if (!is.length) out.push('- none recorded')
    const tk = tasks.filter((x) => x.vehicle_id === selected.id).slice(0, 12)
    out.push('Maintenance tasks:')
    for (const x of tk) out.push(`- [${x.status}] ${x.category} | ${clip(x.title, 100)} | due ${dash(x.due_date)}${x.due_odometer_km != null ? ` or ${x.due_odometer_km} km` : ''}`)
    if (!tk.length) out.push('- none recorded')
  }

  const scoped = selected ? expenses.filter((x) => x.vehicle_id === selected.id) : expenses
  const byCat: Record<string, number> = {}
  for (const x of scoped) byCat[x.category] = (byCat[x.category] ?? 0) + Number(x.amount)
  const svcSpend = services.filter((x) => x.service_date >= from && (!selected || x.vehicle_id === selected.id)).reduce((a, x) => a + Number(x.total_cost), 0)
  out.push('', `SPENDING, last 12 months${selected ? ' (selected vehicle)' : ''}: manual expenses by category: ${Object.entries(byCat).map(([k, n]) => `${k} ${Math.round(n * 100) / 100}`).join(', ') || 'none'}; service-record costs: ${Math.round(svcSpend * 100) / 100}`)
  if (reminders.length) out.push('', 'ACTIVE REMINDERS:', ...reminders.slice(0, 10).map((x) => `- ${x.due_date} | ${clip(x.title, 100)}`))

  const countFor = (list: any[], f: (x: any) => boolean) => list.filter((x) => (!selected || x.vehicle_id === selected.id) && f(x)).length
  return {
    text: `<records>\n${out.join('\n')}\n</records>`,
    vehicleIds: vehicles.map((x) => x.id),
    summary: {
      vehicle: selected ? clip(selected.nickname, 60) : null,
      vehicles: vehicles.length,
      services: countFor(services, () => true),
      openIssues: countFor(issues, (x) => x.status === 'open'),
      openTasks: countFor(tasks, open),
    },
  }
}
