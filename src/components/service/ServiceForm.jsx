import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { useFormat } from '@/hooks/useFormat'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormFooter } from '@/components/ui/Modal'
import { FileField, FormError } from '@/components/common/Bits'
import { SERVICE_TYPES } from '@/lib/constants'
import { cleanText, fromKm, parseDistanceInput, todayISO } from '@/lib/format'
import { partsTotal } from '@/services/garage'
import { INVOICE_RULES, validateFile } from '@/lib/storage'

const partInput = 'h-10 min-w-0 rounded-ctl border border-line bg-surface px-3 text-sm'

export function ServiceForm({ record, vehicleId, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const { unit, money, currency } = useFormat()
  const initialVehicle = record?.vehicle_id ?? vehicleId ?? (vehicles.length === 1 ? vehicles[0].id : '')
  const startOdo = record?.odometer_km ?? vehicles.find((v) => v.id === initialVehicle)?.odometer_km
  const [file, setFile] = useState(null)
  const [removeInvoice, setRemoveInvoice] = useState(false)

  const form = useForm({
    vehicle_id: initialVehicle,
    service_date: record?.service_date ?? todayISO(),
    odometer: startOdo != null ? String(fromKm(startOdo, unit)) : '',
    service_type: record?.service_type ?? 'routine',
    service_center: record?.service_center ?? '',
    labour_cost: record ? String(record.labour_cost) : '',
    parts: (record?.parts ?? []).map((p) => ({ name: p.name, qty: String(p.qty), cost: String(p.cost) })),
    notes: record?.notes ?? '',
    next_service_date: record?.next_service_date ?? '',
    next_odometer: record?.next_service_odometer_km != null ? String(fromKm(record.next_service_odometer_km, unit)) : '',
  })
  const { values: v, set, errors, setValues } = form
  const fileError = file ? validateFile(file, INVOICE_RULES) : null

  const cleanParts = v.parts.filter((p) => p.name.trim() || p.qty || p.cost).map((p) => ({ name: p.name.trim(), qty: Number(p.qty || 1), cost: Number(p.cost || 0) }))
  const total = Number(v.labour_cost || 0) + partsTotal(cleanParts)
  const setPart = (i, key, value) => setValues((s) => ({ ...s, parts: s.parts.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) }))

  const validate = (x) => {
    const e = {}
    if (!x.vehicle_id) e.vehicle_id = 'Choose a vehicle.'
    if (!x.service_date) e.service_date = 'Enter the service date.'
    else if (x.service_date > todayISO()) e.service_date = "The service date can't be in the future."
    if (x.odometer === '' || !Number.isFinite(Number(x.odometer)) || Number(x.odometer) < 0) e.odometer = 'Enter the odometer reading.'
    if (x.labour_cost !== '' && !(Number(x.labour_cost) >= 0)) e.labour_cost = 'Labour cost must be 0 or more.'
    if (x.parts.some((p) => (p.qty || p.cost) && !p.name.trim())) e.parts = 'Give each part a name.'
    else if (x.parts.some((p) => (p.qty !== '' && !(Number(p.qty) > 0)) || (p.cost !== '' && !(Number(p.cost) >= 0)))) e.parts = 'Part quantity must be above 0 and cost 0 or more.'
    if (x.next_service_date && x.service_date && x.next_service_date < x.service_date) e.next_service_date = 'Must be on or after the service date.'
    if (x.next_odometer !== '' && Number(x.next_odometer) <= Number(x.odometer)) e.next_odometer = 'Must be higher than the current reading.'
    if (fileError) e.file = fileError
    return e
  }

  const save = async (x) => {
    const vehicle = vehicles.find((veh) => veh.id === x.vehicle_id)
    const values = {
      vehicle_id: x.vehicle_id,
      service_date: x.service_date,
      odometer_km: parseDistanceInput(x.odometer, unit, record?.odometer_km),
      service_type: x.service_type,
      service_center: cleanText(x.service_center),
      labour_cost: Number(x.labour_cost || 0),
      parts: cleanParts,
      notes: cleanText(x.notes),
      next_service_date: x.next_service_date || null,
      next_service_odometer_km: x.next_odometer === '' ? null : parseDistanceInput(x.next_odometer, unit, record?.next_service_odometer_km),
    }
    await actions.saveService({ id: record?.id, values, invoiceFile: file, removeInvoice, oldInvoicePath: record?.invoice_path }, vehicle)
    onDone()
  }

  return (
    <form onSubmit={form.handle(validate, save)} noValidate>
      <FormError>{form.submitError}</FormError>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!vehicleId && (
          <div className="sm:col-span-2">
            <Select label="Vehicle" value={v.vehicle_id} onChange={(e) => {
              const veh = vehicles.find((x) => x.id === e.target.value)
              setValues((s) => ({ ...s, vehicle_id: e.target.value, odometer: !record && veh ? String(fromKm(veh.odometer_km, unit)) : s.odometer }))
            }}>
              <option value="">Select a vehicle</option>
              {vehicles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
            </Select>
            {errors.vehicle_id && <p className="mt-1.5 text-sm text-danger">{errors.vehicle_id}</p>}
          </div>
        )}
        <Input label="Service date" type="date" max={todayISO()} value={v.service_date} onChange={set('service_date')} error={errors.service_date} />
        <Input label={`Odometer (${unit})`} type="number" inputMode="numeric" min="0" value={v.odometer} onChange={set('odometer')} error={errors.odometer}
          hint={!errors.odometer ? "Also updates the vehicle's odometer if higher." : undefined} />
        <Select label="Type" value={v.service_type} onChange={set('service_type')}>
          {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input label="Service center" value={v.service_center} onChange={set('service_center')} maxLength={120} />
        <Input label={`Labour cost (${currency})`} type="number" inputMode="decimal" min="0" step="0.01" value={v.labour_cost} onChange={set('labour_cost')} error={errors.labour_cost} className="sm:col-span-2" />
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Parts</legend>
        <div className="space-y-2">
          {v.parts.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_4rem_5.5rem_2.25rem] gap-2">
              <input aria-label={`Part ${i + 1} name`} placeholder="Part name" value={p.name} onChange={(e) => setPart(i, 'name', e.target.value)} maxLength={80} className={partInput} />
              <input aria-label={`Part ${i + 1} quantity`} placeholder="Qty" type="number" min="1" value={p.qty} onChange={(e) => setPart(i, 'qty', e.target.value)} className={partInput} />
              <input aria-label={`Part ${i + 1} unit cost`} placeholder="Unit cost" type="number" min="0" step="0.01" value={p.cost} onChange={(e) => setPart(i, 'cost', e.target.value)} className={partInput} />
              <button type="button" aria-label={`Remove part ${i + 1}`} onClick={() => setValues((s) => ({ ...s, parts: s.parts.filter((_, idx) => idx !== i) }))}
                className="flex h-10 items-center justify-center rounded-ctl text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {errors.parts && <p className="mt-1.5 text-sm text-danger">{errors.parts}</p>}
        {v.parts.length < 30 && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setValues((s) => ({ ...s, parts: [...s.parts, { name: '', qty: '1', cost: '' }] }))}><Plus className="h-4 w-4" />Add part</Button>
        )}
      </fieldset>

      <div className="mt-4 flex items-center justify-between rounded-ctl bg-surface-2 px-4 py-3">
        <span className="text-sm text-muted">Total (labour + parts)</span>
        <span className="font-display text-lg font-semibold">{money(total)}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Next service date" type="date" min={v.service_date} value={v.next_service_date} onChange={set('next_service_date')} error={errors.next_service_date} />
        <Input label={`Next service at (${unit})`} type="number" inputMode="numeric" min="0" value={v.next_odometer} onChange={set('next_odometer')} error={errors.next_odometer} />
        <Textarea label="Notes" value={v.notes} onChange={set('notes')} maxLength={2000} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <FileField label="Invoice (optional)" accept={INVOICE_RULES.types.join(',')} hint={INVOICE_RULES.hint} file={file} onPick={setFile}
            existingName={record?.invoice_path} removed={removeInvoice} onRemoveExisting={() => setRemoveInvoice(true)} error={errors.file} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={record ? 'Save changes' : 'Add service'} />
    </form>
  )
}
