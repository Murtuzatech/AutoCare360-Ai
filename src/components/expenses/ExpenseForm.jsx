import { useState } from 'react'
import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { useFormat } from '@/hooks/useFormat'
import { Input, Select } from '@/components/ui/Input'
import { FormFooter } from '@/components/ui/Modal'
import { FileField, FormError } from '@/components/common/Bits'
import { EXPENSE_CATEGORIES } from '@/lib/constants'
import { cleanText, todayISO } from '@/lib/format'
import { RECEIPT_RULES, validateFile } from '@/lib/storage'

export function ExpenseForm({ expense, vehicleId, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const { currency } = useFormat()
  const [file, setFile] = useState(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const form = useForm({
    vehicle_id: expense?.vehicle_id ?? vehicleId ?? (vehicles.length === 1 ? vehicles[0].id : ''),
    expense_date: expense?.expense_date ?? todayISO(),
    category: expense?.category ?? 'fuel',
    amount: expense ? String(expense.amount) : '',
    description: expense?.description ?? '',
  })
  const { values: v, set, errors } = form

  const validate = (x) => {
    const e = {}
    if (!x.vehicle_id) e.vehicle_id = 'Choose a vehicle.'
    if (!x.expense_date) e.expense_date = 'Enter the date.'
    else if (x.expense_date > todayISO()) e.expense_date = "The date can't be in the future."
    if (x.amount === '' || !(Number(x.amount) > 0)) e.amount = 'Enter an amount above 0.'
    else if (Number(x.amount) >= 1e10) e.amount = 'That amount is too large.'
    const problem = file ? validateFile(file, RECEIPT_RULES) : null
    if (problem) e.file = problem
    return e
  }
  const save = async (x) => {
    await actions.saveExpense({
      id: expense?.id, receiptFile: file, removeReceipt, oldReceiptPath: expense?.receipt_path,
      values: { vehicle_id: x.vehicle_id, expense_date: x.expense_date, category: x.category, amount: Math.round(Number(x.amount) * 100) / 100, description: cleanText(x.description) },
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
        <Input label="Date" type="date" max={todayISO()} value={v.expense_date} onChange={set('expense_date')} error={errors.expense_date} />
        <Select label="Category" value={v.category} onChange={set('category')}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Input label={`Amount (${currency})`} type="number" inputMode="decimal" min="0" step="0.01" value={v.amount} onChange={set('amount')} error={errors.amount} className="sm:col-span-2" />
        <Input label="Description" value={v.description} onChange={set('description')} maxLength={200} className="sm:col-span-2" placeholder="e.g. Full tank at Shell" />
        <div className="sm:col-span-2">
          <FileField label="Receipt (optional)" accept={RECEIPT_RULES.types.join(',')} hint={RECEIPT_RULES.hint} file={file} onPick={setFile}
            existingName={expense?.receipt_path} removed={removeReceipt} onRemoveExisting={() => setRemoveReceipt(true)} error={errors.file} />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">Service costs already recorded under Service &amp; Maintenance are included in your analytics automatically, so you don't need to add them here.</p>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={expense ? 'Save changes' : 'Add expense'} />
    </form>
  )
}
