import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CalendarClock, Check, Plus } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useReminders } from '@/hooks/useReminders'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, PageHeader } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { IconActions } from '@/components/common/Bits'
import { ReminderForm } from '@/components/reminders/ReminderForm'
import { formatDate } from '@/lib/format'

const GROUPS = [
  { key: 'overdue', title: 'Overdue', tone: 'text-danger' },
  { key: 'soon', title: 'Due within 30 days', tone: 'text-warn' },
  { key: 'upcoming', title: 'Later (next 90 days)', tone: 'text-muted' },
]

export default function Notifications() {
  const { loading, reminders: custom, actions } = useGarage()
  const { reminders } = useReminders()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const done = custom.filter((r) => r.status === 'done')

  const markDone = async (customId) => {
    try { await actions.setReminderStatus(customId, 'done'); toast.success('Reminder completed') } catch (err) { toast.error(err.message) }
  }
  const reopen = async (id) => {
    try { await actions.setReminderStatus(id, 'active') } catch (err) { toast.error(err.message) }
  }
  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteReminder(deleting.id); toast.success('Reminder deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const editCustom = (r) => setForm({ reminder: custom.find((c) => c.id === r.customId) })

  return (
    <>
      <PageHeader title="Notifications" description="Service, insurance, PUC and warranty dates, plus your own reminders."
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Add reminder</Button>} />

      {loading ? <Skeleton className="h-48" /> : reminders.length === 0 ? (
        <Card><EmptyState icon={Bell} title="You're all caught up" description="Nothing is due in the next 90 days. Reminders appear automatically from your vehicles' insurance, PUC, warranty and service dates."
          action={<div className="flex gap-2"><Button onClick={() => setForm({})}>Add reminder</Button><Link to="/settings" className={buttonStyles({ variant: 'secondary' })}>Notification settings</Link></div>} /></Card>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const items = reminders.filter((r) => r.severity === g.key)
            if (!items.length) return null
            return (
              <Card key={g.key}>
                <CardHeader title={<span className={g.tone}>{g.title}</span>} description={`${items.length} item${items.length > 1 ? 's' : ''}`} />
                <ul className="divide-y divide-line">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                      <CalendarClock className={`h-5 w-5 shrink-0 ${g.tone}`} aria-hidden />
                      <Link to={r.link} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.title}</p>
                        <p className="truncate text-sm text-muted">{[r.vehicleName, r.detail].filter(Boolean).join(' · ')}</p>
                      </Link>
                      {r.kind === 'custom' ? (
                        <div className="flex items-center gap-1">
                          <Button variant="secondary" size="sm" onClick={() => markDone(r.customId)}><Check className="h-4 w-4" />Done</Button>
                          <IconActions label={r.title} onEdit={() => editCustom(r)} onDelete={() => setDeleting({ id: r.customId, title: r.title })} />
                        </div>
                      ) : <Badge>{r.kind === 'maintenance' ? 'Task' : r.kind}</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      {done.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Completed reminders" />
          <ul className="divide-y divide-line">
            {done.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden />
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-muted line-through">{r.title}</p><p className="text-xs text-muted">{formatDate(r.due_date)}</p></div>
                <Button variant="ghost" size="sm" onClick={() => reopen(r.id)}>Reopen</Button>
                <IconActions label={r.title} onDelete={() => setDeleting({ id: r.id, title: r.title })} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.reminder ? 'Edit reminder' : 'Add reminder'}>
        {form && <ReminderForm reminder={form.reminder} onCancel={() => setForm(null)} onDone={() => { toast.success(form.reminder ? 'Reminder saved' : 'Reminder added'); setForm(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete reminder?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} message={`"${deleting?.title ?? ''}" will be permanently deleted.`} />
    </>
  )
}
