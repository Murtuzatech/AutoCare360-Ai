import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { Card } from '@/components/ui/Card'
import { Badge, Segmented } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { IconActions } from '@/components/common/Bits'
import { ISSUE_SEVERITIES, labelOf } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { IssueForm } from './IssueForm'

const tone = { low: 'neutral', medium: 'warn', high: 'warn', critical: 'warn' }

export default function IssueSection({ vehicleId }) {
  const { vehicles, issues, actions } = useGarage()
  const toast = useToast()
  const [view, setView] = useState('open')
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const scoped = vehicleId ? issues.filter((i) => i.vehicle_id === vehicleId) : issues
  const list = scoped.filter((i) => view === 'all' || i.status === view)

  const toggle = async (issue) => {
    try { await actions.setIssueStatus(issue, issue.status === 'open' ? 'resolved' : 'open') }
    catch (err) { toast.error(err.message) }
  }
  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteIssue(deleting.id); toast.success('Issue deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  if (!vehicles.length) {
    return <Card><EmptyState icon={AlertTriangle} title="Add a vehicle first" action={<Link to="/vehicles/new" className={buttonStyles()}>Add vehicle</Link>} /></Card>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Issue filter" value={view} onChange={setView}
          options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]} />
        <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Report issue</Button>
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={CheckCircle2} title={scoped.length ? 'Nothing in this view' : 'No issues reported'}
          description={scoped.length ? 'Try another filter.' : 'Note anything that feels off, like a noise, a leak or a warning light, so it gets tracked until it is fixed.'}
          action={scoped.length ? null : <Button onClick={() => setForm({})}>Report an issue</Button>} /></Card>
      ) : (
        <ul className="space-y-3">
          {list.map((i) => (
            <li key={i.id}>
              <Card>
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${i.status === 'resolved' ? 'text-muted line-through' : ''}`}>{i.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                      <Badge tone={tone[i.severity]}>{labelOf(ISSUE_SEVERITIES, i.severity)}</Badge>
                      {!vehicleId && <span>{vehicles.find((v) => v.id === i.vehicle_id)?.nickname}</span>}
                      <span>Noticed {formatDate(i.reported_at)}</span>
                      {i.status === 'resolved' && i.resolved_at && <span>· Resolved {formatDate(i.resolved_at)}</span>}
                    </div>
                    {i.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{i.description}</p>}
                    {i.status === 'open' && (i.severity === 'high' || i.severity === 'critical') && (
                      <p className="mt-2 text-sm text-warn">Have this inspected by a qualified mechanic.</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                    <Button variant="secondary" size="sm" onClick={() => toggle(i)}>{i.status === 'open' ? 'Mark resolved' : 'Reopen'}</Button>
                    <IconActions label={i.title} onEdit={() => setForm({ issue: i })} onDelete={() => setDeleting(i)} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.issue ? 'Edit issue' : 'Report an issue'}>
        {form && <IssueForm issue={form.issue} vehicleId={vehicleId} onCancel={() => setForm(null)}
          onDone={() => { toast.success(form.issue ? 'Issue saved' : 'Issue reported'); setForm(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete issue?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={`"${deleting?.title ?? ''}" will be permanently deleted.`} />
    </div>
  )
}
