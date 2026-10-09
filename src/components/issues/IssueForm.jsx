import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FormFooter } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Feedback'
import { FormError } from '@/components/common/Bits'
import { ISSUE_SEVERITIES } from '@/lib/constants'
import { cleanText, todayISO } from '@/lib/format'

export function IssueForm({ issue, vehicleId, defaults, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const form = useForm({
    vehicle_id: issue?.vehicle_id ?? vehicleId ?? defaults?.vehicle_id ?? (vehicles.length === 1 ? vehicles[0].id : ''),
    title: issue?.title ?? defaults?.title ?? '',
    description: issue?.description ?? defaults?.description ?? '',
    severity: issue?.severity ?? defaults?.severity ?? 'medium',
    status: issue?.status ?? 'open',
    reported_at: issue?.reported_at ?? todayISO(),
  })
  const { values: v, set, errors } = form

  const validate = (x) => {
    const e = {}
    if (!x.vehicle_id) e.vehicle_id = 'Choose a vehicle.'
    if (!x.title.trim()) e.title = 'Describe the issue in a few words.'
    if (!x.reported_at) e.reported_at = 'Enter the date you noticed it.'
    else if (x.reported_at > todayISO()) e.reported_at = "The date can't be in the future."
    return e
  }
  const save = async (x) => {
    await actions.saveIssue({ id: issue?.id, existing: issue, values: {
      vehicle_id: x.vehicle_id, title: x.title.trim(), description: cleanText(x.description),
      severity: x.severity, status: x.status, reported_at: x.reported_at,
    } })
    onDone()
  }

  return (
    <form onSubmit={form.handle(validate, save)} noValidate>
      <FormError>{form.submitError}</FormError>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!vehicleId && (
          <div className="sm:col-span-2">
            <Select label="Vehicle" value={v.vehicle_id} onChange={set('vehicle_id')}>
              <option value="">Select a vehicle</option>
              {vehicles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
            </Select>
            {errors.vehicle_id && <p className="mt-1.5 text-sm text-danger">{errors.vehicle_id}</p>}
          </div>
        )}
        <Input label="Issue" value={v.title} onChange={set('title')} error={errors.title} maxLength={120} placeholder="e.g. Squealing noise when braking" className="sm:col-span-2" />
        <Select label="Severity" value={v.severity} onChange={set('severity')}>
          {ISSUE_SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select label="Status" value={v.status} onChange={set('status')}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </Select>
        <Input label="Date noticed" type="date" max={todayISO()} value={v.reported_at} onChange={set('reported_at')} error={errors.reported_at} />
        <Textarea label="Details" value={v.description} onChange={set('description')} maxLength={2000} className="sm:col-span-2"
          hint="When it happens, how often, anything that changed recently." />
      </div>
      {(v.severity === 'high' || v.severity === 'critical') && (
        <div className="mt-4"><Alert tone="info">For brakes, steering, tyres, fuel leaks or warning lights, have the vehicle inspected by a qualified mechanic before driving it.</Alert></div>
      )}
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={issue ? 'Save changes' : 'Add issue'} />
    </form>
  )
}
