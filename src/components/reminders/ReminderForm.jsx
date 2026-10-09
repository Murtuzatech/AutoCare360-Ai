import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FormFooter } from '@/components/ui/Modal'
import { FormError } from '@/components/common/Bits'
import { cleanText } from '@/lib/format'

export function ReminderForm({ reminder, defaults, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const form = useForm({
    title: reminder?.title ?? defaults?.title ?? '', due_date: reminder?.due_date ?? defaults?.due_date ?? '', vehicle_id: reminder?.vehicle_id ?? defaults?.vehicle_id ?? '', notes: reminder?.notes ?? defaults?.notes ?? '',
  })
  const { values: v, set, errors } = form
  const validate = (x) => {
    const e = {}
    if (!x.title.trim()) e.title = 'Give the reminder a title.'
    if (!x.due_date) e.due_date = 'Choose a date.'
    return e
  }
  const save = async (x) => {
    await actions.saveReminder({ id: reminder?.id, values: {
      title: x.title.trim(), due_date: x.due_date, vehicle_id: x.vehicle_id || null, notes: cleanText(x.notes),
      status: reminder?.status ?? 'active',
    } })
    onDone()
  }
  return (
    <form onSubmit={form.handle(validate, save)} noValidate>
      <FormError>{form.submitError}</FormError>
      <div className="space-y-4">
        <Input label="Reminder" value={v.title} onChange={set('title')} error={errors.title} maxLength={120} placeholder="e.g. Renew road tax" />
        <Input label="Date" type="date" value={v.due_date} onChange={set('due_date')} error={errors.due_date} />
        <Select label="Vehicle (optional)" value={v.vehicle_id} onChange={set('vehicle_id')}>
          <option value="">Not linked to a vehicle</option>
          {vehicles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
        </Select>
        <Textarea label="Notes" value={v.notes} onChange={set('notes')} maxLength={1000} />
      </div>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={reminder ? 'Save changes' : 'Add reminder'} />
    </form>
  )
}
