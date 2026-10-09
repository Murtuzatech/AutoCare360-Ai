import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { Card } from '@/components/ui/Card'
import { Badge, Segmented } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { IconActions } from '@/components/common/Bits'
import { labelOf, TASK_CATEGORIES, TASK_STATUSES } from '@/lib/constants'
import { daysUntil, formatDate, relativeDays } from '@/lib/format'
import { taskIsOverdue } from '@/lib/health'
import { TaskForm } from './TaskForm'

export default function TaskSection({ vehicleId, startOpen, onOpened }) {
  const { vehicles, tasks, actions } = useGarage()
  const { dist } = useFormat()
  const toast = useToast()
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [view, setView] = useState('open')
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (startOpen && vehicles.length) { setForm({}); onOpened?.() } }, [startOpen, vehicles.length])  

  const scope = vehicleId ?? (vehicleFilter === 'all' ? null : vehicleFilter)
  const scoped = scope ? tasks.filter((t) => t.vehicle_id === scope) : tasks
  const isOpen = (t) => t.status === 'pending' || t.status === 'in_progress'
  const list = scoped.filter((t) => (view === 'open' ? isOpen(t) : view === 'closed' ? !isOpen(t) : true))
  const vehicleOf = (id) => vehicles.find((v) => v.id === id)

  const changeStatus = async (task, status) => {
    try { await actions.setTaskStatus(task, status) } catch (err) { toast.error(err.message) }
  }
  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteTask(deleting.id); toast.success('Task deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  if (!vehicles.length) {
    return <Card><EmptyState icon={ClipboardList} title="Add a vehicle first" description="Maintenance tasks belong to a vehicle."
      action={<Link to="/vehicles/new" className={buttonStyles()}>Add vehicle</Link>} /></Card>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {!vehicleId && vehicles.length > 1 && (
            <Select label="Vehicle" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="w-full sm:w-56">
              <option value="all">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
            </Select>
          )}
          <Segmented label="Task filter" value={view} onChange={setView}
            options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
        </div>
        <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Add task</Button>
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title={scoped.length ? 'No tasks in this view' : 'No maintenance tasks yet'}
          description={scoped.length ? 'Try another filter.' : 'Track upcoming work like brake checks, tyre rotation or battery replacement.'}
          action={scoped.length ? null : <Button onClick={() => setForm({})}>Add task</Button>} /></Card>
      ) : (
        <ul className="space-y-3">
          {list.map((t) => {
            const v = vehicleOf(t.vehicle_id)
            const overdue = taskIsOverdue(t, v)
            const d = t.due_date ? daysUntil(t.due_date) : null
            return (
              <li key={t.id}>
                <Card className={overdue ? 'border-danger/40' : ''}>
                  <div className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${t.status === 'completed' || t.status === 'skipped' ? 'text-muted line-through' : ''}`}>{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                        <Badge>{labelOf(TASK_CATEGORIES, t.category)}</Badge>
                        {!vehicleId && v && <span>{v.nickname}</span>}
                        {t.due_date && <span className={overdue && d < 0 ? 'font-medium text-danger' : ''}>Due {formatDate(t.due_date)} ({relativeDays(d)})</span>}
                        {t.due_odometer_km != null && <span className={overdue && !(d < 0) ? 'font-medium text-danger' : ''}>at {dist(t.due_odometer_km)}</span>}
                      </div>
                      {t.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{t.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => changeStatus(t, e.target.value)}
                        className="h-8 rounded-ctl border border-line bg-surface px-2 text-sm">
                        {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <IconActions label={t.title} onEdit={() => setForm({ task: t })} onDelete={() => setDeleting(t)} />
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.task ? 'Edit task' : 'Add maintenance task'}>
        {form && <TaskForm task={form.task} vehicleId={vehicleId ?? (vehicleFilter !== 'all' ? vehicleFilter : undefined)} onCancel={() => setForm(null)}
          onDone={() => { toast.success(form.task ? 'Task saved' : 'Task added'); setForm(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete task?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={`"${deleting?.title ?? ''}" will be permanently deleted.`} />
    </div>
  )
}
