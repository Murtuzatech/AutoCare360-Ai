import { useState } from 'react'
import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FormFooter } from '@/components/ui/Modal'
import { FileField, FormError } from '@/components/common/Bits'
import { DOCUMENT_CATEGORIES } from '@/lib/constants'
import { cleanText } from '@/lib/format'
import { DOCUMENT_RULES, validateFile } from '@/lib/storage'

const stem = (name) => name.replace(/\.[^.]+$/, '').slice(0, 120)

export function DocumentForm({ doc, vehicleId, onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const [file, setFile] = useState(null)
  const form = useForm({
    title: doc?.title ?? '', category: doc?.category ?? 'other', vehicle_id: doc?.vehicle_id ?? vehicleId ?? '', notes: doc?.notes ?? '',
  })
  const { values: v, set, setValues, errors } = form

  const pick = (f) => {
    setFile(f)
    if (f && !v.title.trim()) setValues((s) => ({ ...s, title: stem(f.name) }))
  }
  const validate = (x) => {
    const e = {}
    if (!doc && !file) e.file = 'Choose a file to upload.'
    else if (file && validateFile(file, DOCUMENT_RULES)) e.file = validateFile(file, DOCUMENT_RULES)
    if (!x.title.trim()) e.title = 'Give the document a title.'
    return e
  }
  const save = async (x) => {
    const values = { title: x.title.trim(), category: x.category, vehicle_id: x.vehicle_id || null, notes: cleanText(x.notes) }
    if (doc) await actions.updateDocument(doc.id, values)
    else await actions.uploadDocument({ file, values })
    onDone()
  }

  return (
    <form onSubmit={form.handle(validate, save)} noValidate>
      <FormError>{form.submitError}</FormError>
      <div className="space-y-4">
        {!doc && <FileField label="File" accept={DOCUMENT_RULES.types.join(',')} hint={DOCUMENT_RULES.hint} file={file} onPick={pick} error={errors.file} />}
        <Input label="Title" value={v.title} onChange={set('title')} error={errors.title} maxLength={120} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Category" value={v.category} onChange={set('category')}>
            {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select label="Vehicle" value={v.vehicle_id} onChange={set('vehicle_id')}>
            <option value="">Not linked to a vehicle</option>
            {vehicles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
          </Select>
        </div>
        <Textarea label="Notes" value={v.notes} onChange={set('notes')} maxLength={1000} />
      </div>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel={doc ? 'Save changes' : 'Upload'} />
    </form>
  )
}
