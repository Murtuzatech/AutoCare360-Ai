import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, FileText, Plus, Wrench } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { IconActions, Stat, openPrivateFile } from '@/components/common/Bits'
import { labelOf, SERVICE_TYPES } from '@/lib/constants'
import { formatDate, daysUntil, toLocalISO } from '@/lib/format'
import { ServiceForm } from './ServiceForm'

export default function ServiceSection({ vehicleId, startOpen, onOpened }) {
  const { vehicles, services, actions } = useGarage()
  const { money, dist } = useFormat()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(null) // { record? }
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (startOpen && vehicles.length) { setForm({}); onOpened?.() } }, [startOpen, vehicles.length])  

  const scope = vehicleId ?? (filter === 'all' ? null : filter)
  const list = useMemo(() => (scope ? services.filter((s) => s.vehicle_id === scope) : services), [services, scope])
  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const spend12 = list.filter((s) => s.service_date >= toLocalISO(yearAgo)).reduce((a, s) => a + Number(s.total_cost), 0)
  const vname = (id) => vehicles.find((v) => v.id === id)?.nickname ?? 'Unknown vehicle'

  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteService(deleting); toast.success('Service record deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  if (!vehicles.length) {
    return <Card><EmptyState icon={Wrench} title="Add a vehicle first" description="Service records belong to a vehicle."
      action={<Link to="/vehicles/new" className={buttonStyles()}>Add vehicle</Link>} /></Card>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {!vehicleId && vehicles.length > 1
          ? <Select label="Vehicle" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:w-60">
              <option value="all">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
            </Select>
          : <div />}
        <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Add service</Button>
      </div>

      {list.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Records" value={list.length} />
          <Stat label="Last 12 months" value={money(spend12)} />
          <Stat label="Last service" value={formatDate(list[0].service_date)} />
        </div>
      )}

      {list.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="No service records yet" description="Log your first service to start building this vehicle's history and next-service reminders."
          action={<Button onClick={() => setForm({})}>Add service</Button>} /></Card>
      ) : (
        <ul className="space-y-3">
          {list.map((s) => {
            const open = expanded === s.id
            const nextDays = s.next_service_date ? daysUntil(s.next_service_date) : null
            return (
              <li key={s.id}>
                <Card>
                  <div className="flex items-start gap-3 p-4">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded(open ? null : s.id)} aria-expanded={open}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatDate(s.service_date)}</span>
                        <Badge tone={s.service_type === 'repair' ? 'warn' : 'neutral'}>{labelOf(SERVICE_TYPES, s.service_type)}</Badge>
                        {s.invoice_path && <FileText className="h-4 w-4 text-muted" aria-label="Invoice attached" />}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">
                        {[!vehicleId && vname(s.vehicle_id), s.service_center, dist(s.odometer_km)].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-semibold">{money(s.total_cost)}</span>
                      <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                    </div>
                  </div>
                  {open && (
                    <div className="space-y-3 border-t border-line px-4 py-4 text-sm">
                      <div className="flex justify-between text-muted"><span>Labour</span><span className="text-ink">{money(s.labour_cost)}</span></div>
                      {s.parts.length > 0 && (
                        <div>
                          <p className="mb-1 font-medium">Parts</p>
                          <ul className="space-y-1 text-muted">
                            {s.parts.map((p, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{p.qty} × {p.name}</span><span className="text-ink">{money(p.qty * p.cost)}</span></li>)}
                          </ul>
                        </div>
                      )}
                      {s.notes && <p className="whitespace-pre-wrap text-muted">{s.notes}</p>}
                      {(s.next_service_date || s.next_service_odometer_km != null) && (
                        <p className="text-muted">Next service: {[s.next_service_date && `${formatDate(s.next_service_date)}${nextDays < 0 ? ' (overdue)' : ''}`, s.next_service_odometer_km != null && `at ${dist(s.next_service_odometer_km)}`].filter(Boolean).join(' · ')}</p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {s.invoice_path
                          ? <Button variant="secondary" size="sm" onClick={() => openPrivateFile('service-invoices', s.invoice_path, toast.error)}><FileText className="h-4 w-4" />View invoice</Button>
                          : <span />}
                        <IconActions label="service record" onEdit={() => setForm({ record: s })} onDelete={() => setDeleting(s)} />
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.record ? 'Edit service record' : 'Add service record'} size="lg">
        {form && <ServiceForm record={form.record} vehicleId={vehicleId ?? (filter !== 'all' ? filter : undefined)} onCancel={() => setForm(null)}
          onDone={() => { toast.success(form.record ? 'Service record saved' : 'Service record added'); setForm(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete service record?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={`This permanently deletes the ${deleting ? formatDate(deleting.service_date) : ''} record${deleting?.invoice_path ? ' and its invoice' : ''}. This can't be undone.`} />
    </div>
  )
}
