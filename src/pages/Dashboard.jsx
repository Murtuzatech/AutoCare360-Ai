import { Link } from 'react-router-dom'
import { AlertTriangle, Car, CalendarClock, FileBarChart, FileText, FolderOpen, Plus, Receipt, ScanSearch, Sparkles, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGarage } from '@/contexts/GarageContext'
import { useFormat } from '@/hooks/useFormat'
import { useReminders } from '@/hooks/useReminders'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, PageHeader } from '@/components/ui/Controls'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { buttonStyles } from '@/components/ui/Button'
import { Stat } from '@/components/common/Bits'
import { InsightsCard } from '@/components/InsightsCard'
import { VehicleCard } from '@/components/vehicles/VehicleCard'
import { Timeline } from '@/components/vehicles/Timeline'
import { buildTimeline } from '@/lib/timeline'
import { computeHealth } from '@/lib/health'
import { formatDate, toLocalISO } from '@/lib/format'
import { buildLedger, filterLedger, total } from '@/lib/expenses'
import { labelOf, ISSUE_SEVERITIES, EXPENSE_CATEGORIES, DOCUMENT_CATEGORIES } from '@/lib/constants'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

const quick = [
  { label: 'Add vehicle', icon: Car, to: '/vehicles/new' },
  { label: 'Add service', icon: Wrench, to: '/service?new=service' },
  { label: 'Add task', icon: Plus, to: '/service?tab=maintenance&new=task' },
  { label: 'Add expense', icon: Receipt, to: '/expenses?new=1' },
  { label: 'Upload document', icon: FolderOpen, to: '/documents?new=1' },
  { label: 'Analyze problem', icon: ScanSearch, to: '/analyzer' },
  { label: 'Generate report', icon: FileBarChart, to: '/reports' },
  { label: 'Ask AI', icon: Sparkles, to: '/assistant' },
]

export default function Dashboard() {
  const { profile } = useAuth()
  const garage = useGarage()
  const { vehicles, services, tasks, issues, expenses, documents, loading } = garage
  const { money, unit } = useFormat()
  const { reminders } = useReminders()
  const first = (profile.full_name || '').trim().split(/\s+/)[0]

  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const ledger = buildLedger(expenses, services, true)
  const spend12 = total(filterLedger(ledger, { from: toLocalISO(yearAgo) }))
  const openIssues = issues.filter((i) => i.status === 'open')
  const attention = vehicles.filter((v) => computeHealth(v, {
    services: services.filter((s) => s.vehicle_id === v.id), tasks: tasks.filter((t) => t.vehicle_id === v.id), issues: issues.filter((i) => i.vehicle_id === v.id),
  }, unit).level !== 'good').length

  const nameOf = Object.fromEntries(vehicles.map((v) => [v.id, v.nickname]))
  const activity = vehicles.flatMap((v) => buildTimeline(v, {
    services: services.filter((s) => s.vehicle_id === v.id), tasks: tasks.filter((t) => t.vehicle_id === v.id), issues: issues.filter((i) => i.vehicle_id === v.id),
  }).filter((e) => e.kind !== 'added').map((e) => ({ ...e, id: `${v.id}:${e.id}`, vehicleId: v.id }))).sort((a, b) => b.date.localeCompare(a.date))

  if (loading) {
    return <><PageHeader title={first ? `${greeting()}, ${first}` : greeting()} /><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></>
  }

  return (
    <>
      <PageHeader title={first ? `${greeting()}, ${first}` : greeting()}
        description={vehicles.length ? 'Here is where your vehicles stand today.' : 'Add your first vehicle to start tracking its health, service and reminders.'} />

      {vehicles.length === 0 ? (
        <Card><EmptyState icon={Car} title="No vehicles yet" description="Add a vehicle to unlock health tracking, service history and reminders."
          action={<Link to="/vehicles/new" className={buttonStyles()}>Add your first vehicle</Link>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Vehicles" value={vehicles.length} sub={attention ? `${attention} need${attention > 1 ? '' : 's'} attention` : 'All in good shape'} />
            <Stat label="Open issues" value={openIssues.length} />
            <Stat label="Due or overdue" value={reminders.filter((r) => r.severity !== 'upcoming').length} />
            <Stat label="Spending, 12 mo" value={money(spend12)} />
          </div>

          <section className="mt-6" aria-label="Vehicles">
            <h2 className="mb-3 text-lg font-semibold">Your vehicles</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map((v) => <VehicleCard key={v.id} vehicleId={v.id} />)}</div>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InsightsCard />
            <Card>
              <CardHeader title="Reminders" action={<Link to="/notifications" className="inline-block py-1.5 text-sm text-brand hover:underline">View all</Link>} />
              {reminders.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Nothing due in the next 90 days.</p> : (
                <ul className="divide-y divide-line">
                  {reminders.slice(0, 5).map((r) => (
                    <li key={r.id}><Link to={r.link} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <CalendarClock className={`h-5 w-5 shrink-0 ${r.severity === 'overdue' ? 'text-danger' : r.severity === 'soon' ? 'text-warn' : 'text-muted'}`} aria-hidden />
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{r.title}</p><p className="truncate text-sm text-muted">{[r.vehicleName, r.detail].filter(Boolean).join(' · ')}</p></div>
                    </Link></li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Open issues" />
              {openIssues.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No open issues.</p> : (
                <ul className="divide-y divide-line">
                  {openIssues.slice(0, 5).map((i) => (
                    <li key={i.id}><Link to={`/vehicles/${i.vehicle_id}?tab=issues`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-warn" aria-hidden />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.title}</p><p className="truncate text-sm text-muted">{nameOf[i.vehicle_id]} · Noticed {formatDate(i.reported_at)}</p></div>
                      <Badge tone="warn">{labelOf(ISSUE_SEVERITIES, i.severity)}</Badge>
                    </Link></li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent activity" />
              <CardBody><Timeline events={activity} limit={6} vehicleNames={nameOf} /></CardBody>
            </Card>

            <Card>
              <CardHeader title="Quick actions" />
              <CardBody className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {quick.map(({ label, icon: Icon, to }) => (
                  <Link key={label} to={to} className="flex flex-col items-start gap-2 rounded-ctl border border-line p-3 text-sm font-medium hover:border-brand/50 hover:bg-surface-2">
                    <Icon className="h-4 w-4 text-brand" aria-hidden />{label}</Link>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent expenses" action={<Link to="/expenses" className="inline-block py-1.5 text-sm text-brand hover:underline">View all</Link>} />
              {ledger.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No expenses yet.</p> : (
                <ul className="divide-y divide-line">
                  {ledger.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                      <Receipt className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{labelOf(EXPENSE_CATEGORIES, e.category)}</p><p className="truncate text-sm text-muted">{[nameOf[e.vehicleId], formatDate(e.date)].filter(Boolean).join(' · ')}</p></div>
                      <span className="text-sm font-medium">{money(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent documents" action={<Link to="/documents" className="inline-block py-1.5 text-sm text-brand hover:underline">View all</Link>} />
              {documents.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No documents yet.</p> : (
                <ul className="divide-y divide-line">
                  {documents.slice(0, 5).map((d) => (
                    <li key={d.id}><Link to="/documents" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <FileText className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.title}</p><p className="truncate text-sm text-muted">{labelOf(DOCUMENT_CATEGORIES, d.category)}{d.vehicle_id ? ` · ${nameOf[d.vehicle_id]}` : ''}</p></div>
                    </Link></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  )
}
