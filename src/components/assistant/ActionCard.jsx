import { useState } from 'react'
import { AlertTriangle, BellPlus, Check, ClipboardList, FileBarChart, StickyNote } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Controls'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/service/TaskForm'
import { IssueForm } from '@/components/issues/IssueForm'
import { ReminderForm } from '@/components/reminders/ReminderForm'
import { buildReportFromGarage } from '@/lib/reports/fromGarage'
import { REPORT_TYPES } from '@/lib/reports/models'
import { ISSUE_SEVERITIES, TASK_CATEGORIES, labelOf } from '@/lib/constants'
import { formatDate } from '@/lib/format'

const META = {
  maintenance_task: { icon: ClipboardList, title: 'Suggested maintenance task', cta: 'Review & add' },
  issue: { icon: AlertTriangle, title: 'Suggested issue to log', cta: 'Review & add' },
  reminder: { icon: BellPlus, title: 'Suggested reminder', cta: 'Review & add' },
  vehicle_note: { icon: StickyNote, title: 'Suggested vehicle note', cta: 'Add note' },
  report: { icon: FileBarChart, title: 'Suggested report', cta: 'Generate PDF' },
}

/** The assistant only PROPOSES. Nothing is written until the user confirms here, and writes use the same validated forms as the rest of the app. */
export function ActionCard({ action, onStatus, readOnly }) {
  const garage = useGarage()
  const toast = useToast()
  const { unit, currency } = useFormat()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const a = action.args
  const meta = META[action.type]
  if (!meta) return null
  const vehicle = garage.vehicles.find((v) => v.id === a.vehicle_id)
  const vehicleMissing = action.type !== 'reminder' && action.type !== 'report' && !vehicle
  const done = action.status === 'confirmed'
  const dismissed = action.status === 'dismissed'
  const Icon = meta.icon

  const lines = {
    maintenance_task: [a.title, [labelOf(TASK_CATEGORIES, a.category), a.due_date && `due ${formatDate(a.due_date)}`].filter(Boolean).join(' · '), a.notes],
    issue: [a.title, `Severity: ${labelOf(ISSUE_SEVERITIES, a.severity)}`, a.description],
    reminder: [a.title, `Date: ${formatDate(a.due_date)}`, a.notes],
    vehicle_note: [a.note],
    report: [REPORT_TYPES.find((r) => r.value === a.report_type)?.label ?? a.report_type],
  }[action.type].filter(Boolean)

  const confirmed = () => { setOpen(false); onStatus?.('confirmed'); toast.success('Done') }

  const runDirect = async () => {
    setBusy(true)
    try {
      if (action.type === 'vehicle_note') { await garage.actions.appendVehicleNote(vehicle, a.note); confirmed() }
      else {
        const model = buildReportFromGarage({ type: a.report_type, vehicleId: a.vehicle_id, garage, unit, currency })
        const { downloadReport } = await import('@/lib/reports/pdf')
        downloadReport(model); onStatus?.('confirmed')
      }
    } catch (err) { toast.error(err.message || 'That did not work. Please try again.') } finally { setBusy(false); setOpen(false) }
  }

  return (
    <div className={`rounded-card border p-4 ${done ? 'border-ok/40 bg-ok/5' : 'border-brand/30 bg-brand/5'} ${dismissed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon className="h-4 w-4" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{meta.title}</p>
            {done && <Badge tone="ok">Done</Badge>}
            {dismissed && <Badge>Dismissed</Badge>}
          </div>
          {vehicle && <p className="text-xs text-muted">For {vehicle.nickname}</p>}
          <div className="mt-1.5 space-y-0.5 text-sm">{lines.map((l, i) => <p key={i} className={i === 0 ? 'font-medium' : 'text-muted'}>{l}</p>)}</div>
          {vehicleMissing && <p className="mt-2 text-xs text-danger">This vehicle no longer exists.</p>}
          {action.status === 'proposed' && !readOnly && !vehicleMissing && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setOpen(true)} loading={busy}>{meta.cta}</Button>
              <Button size="sm" variant="ghost" onClick={() => onStatus?.('dismissed')}>Dismiss</Button>
            </div>
          )}
        </div>
        {done && <Check className="h-5 w-5 shrink-0 text-ok" aria-hidden />}
      </div>

      {action.type === 'maintenance_task' && (
        <Modal open={open} onClose={() => setOpen(false)} title="Add maintenance task">
          <TaskForm vehicleId={a.vehicle_id} defaults={a} onCancel={() => setOpen(false)} onDone={confirmed} />
        </Modal>)}
      {action.type === 'issue' && (
        <Modal open={open} onClose={() => setOpen(false)} title="Log issue">
          <IssueForm vehicleId={a.vehicle_id} defaults={a} onCancel={() => setOpen(false)} onDone={confirmed} />
        </Modal>)}
      {action.type === 'reminder' && (
        <Modal open={open} onClose={() => setOpen(false)} title="Add reminder">
          <ReminderForm defaults={a} onCancel={() => setOpen(false)} onDone={confirmed} />
        </Modal>)}
      {action.type === 'vehicle_note' && (
        <ConfirmDialog open={open} title="Add note to vehicle?" confirmLabel="Add note" busy={busy} onCancel={() => setOpen(false)} onConfirm={runDirect}
          message={`"${a.note}" will be appended to ${vehicle?.nickname ?? 'the vehicle'}'s notes.`} />)}
      {action.type === 'report' && (
        <ConfirmDialog open={open} title="Generate report?" confirmLabel="Generate PDF" busy={busy} onCancel={() => setOpen(false)} onConfirm={runDirect}
          message="A PDF will be created from your current records and downloaded to this device." />)}
    </div>
  )
}
