import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { useFormat } from '@/hooks/useFormat'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FormFooter } from '@/components/ui/Modal'
import { FormError } from '@/components/common/Bits'
import { TASK_CATEGORIES, TASK_STATUSES } from '@/lib/constants'
import { cleanText, fromKm, parseDistanceInput } from '@/lib/format'

export function TaskForm({ task, vehicleId, defaults, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const { unit } = useFormat()
  const form = useForm({
    vehicle_id: task?.vehicle_id ?? vehicleId ?? defaults?.vehicle_id ?? (vehicles.length === 1 ? vehicles[0].id : ''),
    title: task?.title ?? defaults?.title ?? '',
    category: task?.category ?? defaults?.category ?? 'general',
    status: task?.status ?? 'pending',
    due_date: task?.due_date ?? defaults?.due_date ?? '',
    due_odometer: task?.due_odometer_km != null ? String(fromKm(task.due_odometer_km, unit)) : '',
    notes: task?.notes ?? defaults?.notes ?? '',
  })
  const { values: v, set, errors } = form

  const validate = (x) => {
    const e = {}
    if (!x.vehicle_id) e.vehicle_id = 'Choose a vehicle.'
    if (!x.title.trim()) e.title = 'Give the task a title.'
    if (x.due_odometer !== '' && (!Number.isFinite(Number(x.due_odometer)) || Number(x.due_odometer) < 0)) e.due_odometer = 'Enter a valid reading.'
    return e
  }
  const save = async (x) => {
    await actions.saveTask({
      id: task?.id, existing: task,
      values: {
        vehicle_id: x.vehicle_id, title: x.title.trim(), category: x.category, status: x.status,
        due_date: x.due_date || null,
        due_odometer_km: x.due_odometer === '' ? null : parseDistanceInput(x.due_odometer, unit, task?.due_odometer_km),
        notes: cleanText(x.notes),
      },
    })
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
        <Input label="Task" value={v.title} onChange={set('title')} error={errors.title} maxLength={120} placeholder="e.g. Replace front brake pads" className="sm:col-span-2" />
        <Select label="Category" value={v.category} onChange={set('category')}>
          {TASK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Select label="Status" value={v.status} onChange={set('status')}>
          {TASK_STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Input label="Due date" type="date" value={v.due_date} onChange={set('due_date')} />
        <Input label={`Due at (${unit})`} type="number" inputMode="numeric" min="0" value={v.due_odometer} onChange={set('due_odometer')} error={errors.due_odometer} />
        <Textarea label="Notes" value={v.notes} onChange={set('notes')} maxLength={2000} className="sm:col-span-2" />
      </div>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={task ? 'Save changes' : 'Add task'} />
    </form>
  )
}
