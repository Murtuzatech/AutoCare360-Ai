import { Suspense, lazy, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CircleAlert, CircleHelp, Gauge, Pencil, Trash2, TriangleAlert } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { useReminders } from '@/hooks/useReminders'
import { useVehicleData } from '@/hooks/useVehicleData'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { ConfirmDialog, FormFooter, Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Fact } from '@/components/common/Bits'
import { HealthRing, VehicleImage } from '@/components/vehicles/VehicleVisuals'
import { Timeline } from '@/components/vehicles/Timeline'
import ServiceSection from '@/components/service/ServiceSection'
import TaskSection from '@/components/service/TaskSection'
import IssueSection from '@/components/issues/IssueSection'
import DocumentsSection from '@/components/documents/DocumentsSection'
import ReportBuilder from '@/components/reports/ReportBuilder'

const ExpensesView = lazy(() => import('@/components/expenses/ExpensesView'))
import { FUEL_TYPES, TRANSMISSIONS, labelOf } from '@/lib/constants'
import { daysUntil, fromKm, formatDate, relativeDays, toKm } from '@/lib/format'
import { healthMeta } from '@/lib/health'
import { buildTimeline } from '@/lib/timeline'

const statusIcon = { good: [CheckCircle2, 'text-ok'], warn: [TriangleAlert, 'text-warn'], bad: [CircleAlert, 'text-danger'], unknown: [CircleHelp, 'text-muted'] }

export default function VehicleDetail() {
  const { id } = useParams()
  const { loading } = useGarage()
  const data = useVehicleData(id)
  if (loading) return <Skeleton className="h-96" />
  if (!data.vehicle) {
    return <Card><EmptyState title="Vehicle not found" description="It may have been deleted." action={<Link to="/vehicles" className={buttonStyles()}>Back to vehicles</Link>} /></Card>
  }
  return <Detail {...data} />
}

function Detail({ vehicle, services, tasks, issues, health }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { actions, documents, expenses } = useGarage()
  const { dist, unit, money } = useFormat()
  const { reminders } = useReminders()
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [odoOpen, setOdoOpen] = useState(false)

  const tab = params.get('tab') || 'overview'
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })
  const openIssues = issues.filter((i) => i.status === 'open').length
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const meta = healthMeta[health.level]

  const tabs = [
    { value: 'overview', label: 'Overview' }, { value: 'health', label: 'Health' },
    { value: 'service', label: 'Service', count: services.length }, { value: 'maintenance', label: 'Maintenance', count: openTasks },
    { value: 'issues', label: 'Issues', count: openIssues }, { value: 'timeline', label: 'Timeline' },
    { value: 'expenses', label: 'Expenses', count: expenses.filter((e) => e.vehicle_id === vehicle.id).length }, { value: 'documents', label: 'Documents', count: documents.filter((d) => d.vehicle_id === vehicle.id).length }, { value: 'reports', label: 'Reports' },
  ]

  const remove = async () => {
    setBusy(true)
    try { await actions.deleteVehicle(vehicle); toast.success('Vehicle deleted'); navigate('/vehicles', { replace: true }) }
    catch (err) { toast.error(err.message); setBusy(false) }
  }

  const mine = reminders.filter((r) => r.vehicleId === vehicle.id).slice(0, 5)

  return (
    <>
      <Link to="/vehicles" className="mb-3 inline-flex items-center gap-1.5 py-2 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />My Vehicles</Link>

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <VehicleImage path={vehicle.image_path} className="h-44 w-full sm:h-auto sm:w-56" iconSize="h-12 w-12" />
          <div className="flex flex-1 flex-col justify-between gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold">{vehicle.nickname}</h1>
                <p className="text-muted">{[vehicle.manufacturing_year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(' ')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {vehicle.registration_number && <Badge>{vehicle.registration_number}</Badge>}
                  <Badge tone={meta.tone === 'danger' ? 'warn' : meta.tone}>{meta.label}</Badge>
                </div>
              </div>
              <HealthRing score={health.score} level={health.level} size={64} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOdoOpen(true)}><Gauge className="h-4 w-4" />{dist(vehicle.odometer_km)}</Button>
              <Link to={`/vehicles/${vehicle.id}/edit`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}><Pencil className="h-4 w-4" />Edit</Link>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(true)} className="hover:!text-danger"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Vehicle sections" />
      <div className="mt-6" role="tabpanel">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Details" />
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Fact label="Fuel" value={labelOf(FUEL_TYPES, vehicle.fuel_type)} />
                  <Fact label="Transmission" value={vehicle.transmission && labelOf(TRANSMISSIONS, vehicle.transmission)} />
                  <Fact label="Odometer" value={dist(vehicle.odometer_km)} />
                  <Fact label="Purchased" value={vehicle.purchase_date && formatDate(vehicle.purchase_date)} />
                  <Fact label="Purchase price" value={vehicle.purchase_price != null && money(vehicle.purchase_price)} />
                  <Fact label="VIN / chassis" value={vehicle.vin} />
                </dl>
                {vehicle.notes && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-sm text-muted">{vehicle.notes}</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Coming up" />
              {mine.length === 0
                ? <p className="px-5 py-6 text-sm text-muted">Nothing due in the next 90 days.</p>
                : <ul className="divide-y divide-line">{mine.map((r) => (
                    <li key={r.id}><Link to={r.link} className="block px-5 py-3 hover:bg-surface-2">
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className={`text-sm ${r.severity === 'overdue' ? 'text-danger' : 'text-muted'}`}>{r.detail}</p></Link></li>))}</ul>}
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader title="Insurance, PUC & warranty" />
              <CardBody>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {[['Insurance', vehicle.insurance_expiry, [vehicle.insurance_provider, vehicle.insurance_policy_number].filter(Boolean).join(' · ')],
                    ['PUC', vehicle.puc_expiry, ''],
                    ['Warranty', vehicle.warranty_expiry, vehicle.warranty_provider]].map(([label, date, extra]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted">{label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{date ? `Expires ${formatDate(date)}` : 'Not recorded'}</dd>
                      {date && <dd className={`text-sm ${daysUntil(date) < 0 ? 'text-danger' : daysUntil(date) <= 30 ? 'text-warn' : 'text-muted'}`}>{relativeDays(daysUntil(date)).replace('overdue', 'ago')}</dd>}
                      {extra && <dd className="text-sm text-muted">{extra}</dd>}
                    </div>))}
                </dl>
                {vehicle.warranty_notes && <p className="mt-4 text-sm text-muted">{vehicle.warranty_notes}</p>}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'health' && (
          <Card>
            <CardHeader title={`Health score: ${health.score}/100`} description={`${meta.label}. Based only on the records you've entered. It's not an inspection or diagnosis.`} />
            <ul className="divide-y divide-line">
              {health.factors.map((f) => {
                const [Icon, color] = statusIcon[f.status]
                return (
                  <li key={f.id} className="flex items-start gap-3 px-5 py-4">
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{f.label}</p><p className="text-sm text-muted">{f.detail}</p></div>
                    {f.penalty > 0 && <span className="text-sm text-muted">−{f.penalty}</span>}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {tab === 'service' && <ServiceSection vehicleId={vehicle.id} />}
        {tab === 'maintenance' && <TaskSection vehicleId={vehicle.id} />}
        {tab === 'issues' && <IssueSection vehicleId={vehicle.id} />}
        {tab === 'timeline' && <Card><CardBody><Timeline events={buildTimeline(vehicle, { services, tasks, issues })} /></CardBody></Card>}
        {tab === 'expenses' && <Suspense fallback={<Skeleton className="h-64" />}><ExpensesView vehicleId={vehicle.id} /></Suspense>}
        {tab === 'documents' && <DocumentsSection vehicleId={vehicle.id} />}
        {tab === 'reports' && <ReportBuilder vehicleId={vehicle.id} />}
      </div>

      <OdometerModal open={odoOpen} onClose={() => setOdoOpen(false)} vehicle={vehicle} unit={unit} />
      <ConfirmDialog open={deleting} busy={busy} title={`Delete ${vehicle.nickname}?`} onCancel={() => setDeleting(false)} onConfirm={remove}
        message={`This permanently deletes the vehicle with its ${services.length} service record${services.length === 1 ? '' : 's'}, ${tasks.length} task${tasks.length === 1 ? '' : 's'}, ${issues.length} issue${issues.length === 1 ? '' : 's'}, plus its expenses, documents, analyzer submissions, photo and invoices. This can't be undone.`} />
    </>
  )
}

function OdometerModal({ open, onClose, vehicle, unit }) {
  const { actions } = useGarage()
  const toast = useToast()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = fromKm(vehicle.odometer_km, unit)

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(value)
    if (value === '' || !Number.isFinite(n)) return setError('Enter the new reading.')
    if (n < current) return setError(`Must be at least the current reading (${current.toLocaleString()} ${unit}). To correct a mistake, use Edit.`)
    setBusy(true); setError('')
    try { await actions.updateOdometer(vehicle.id, n === current ? vehicle.odometer_km : toKm(n, unit)); toast.success('Odometer updated'); setValue(''); onClose() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Update odometer">
      <form onSubmit={submit} noValidate>
        <Input label={`Current reading (${unit})`} type="number" inputMode="numeric" min={current} value={value} onChange={(e) => { setValue(e.target.value); setError('') }}
          error={error} hint={`Last recorded: ${current.toLocaleString()} ${unit}`} />
        <FormFooter onCancel={onClose} busy={busy} submitLabel="Update" />
      </form>
    </Modal>
  )
}
