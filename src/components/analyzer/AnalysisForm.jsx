import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useForm } from '@/hooks/useForm'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormFooter } from '@/components/ui/Modal'
import { FormError } from '@/components/common/Bits'
import { ANALYSIS_TYPES } from '@/lib/constants'
import { cleanText } from '@/lib/format'
import { ANALYSIS_RULES, validateFile } from '@/lib/storage'
import { cn } from '@/lib/cn'

export function AnalysisForm({ onDone, onCancel }) {
  const { vehicles, actions } = useGarage()
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const form = useForm({ analysis_type: 'warning_light', title: '', vehicle_id: vehicles.length === 1 ? vehicles[0].id : '', description: '' })
  const { values: v, set, errors } = form
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files])
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews])

  const addFiles = (list) => {
    const next = [...files]
    for (const f of Array.from(list)) {
      const problem = validateFile(f, ANALYSIS_RULES)
      if (problem) { setFileError(`${f.name}: ${problem}`); continue }
      if (next.length >= ANALYSIS_RULES.maxFiles) { setFileError(`You can add up to ${ANALYSIS_RULES.maxFiles} files.`); break }
      next.push(f); setFileError('')
    }
    setFiles(next)
  }

  const validate = (x) => {
    const e = {}
    if (!x.title.trim()) e.title = 'Give this a short title.'
    if (!files.length) e.files = 'Add at least one photo or PDF.'
    return e
  }
  const save = async (x) => {
    await actions.createAnalysis({ files, values: { analysis_type: x.analysis_type, title: x.title.trim(), vehicle_id: x.vehicle_id || null, description: cleanText(x.description) } })
    onDone()
  }

  return (
    <form onSubmit={form.handle(validate, save)} noValidate>
      <FormError>{form.submitError}</FormError>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What are you uploading?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ANALYSIS_TYPES.map((t) => (
            <label key={t.value} className={cn('cursor-pointer rounded-ctl border p-3 text-sm', v.analysis_type === t.value ? 'border-brand bg-brand/5' : 'border-line hover:bg-surface-2')}>
              <input type="radio" name="analysis_type" value={t.value} checked={v.analysis_type === t.value} onChange={set('analysis_type')} className="sr-only" />
              <span className="block font-medium">{t.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 space-y-4">
        <Input label="Title" value={v.title} onChange={set('title')} error={errors.title} maxLength={120} placeholder="e.g. Red battery light after cold start" />
        <Select label="Vehicle (optional)" value={v.vehicle_id} onChange={set('vehicle_id')}>
          <option value="">Not linked to a vehicle</option>
          {vehicles.map((x) => <option key={x.id} value={x.id}>{x.nickname}</option>)}
        </Select>
        <Textarea label="What's happening?" value={v.description} onChange={set('description')} maxLength={2000} rows={4}
          hint="When it started, when it happens, anything that changed recently." />
        <div>
          <p className="mb-1.5 text-sm font-medium">Photos or PDFs</p>
          <input id="analysis-files" type="file" multiple accept={ANALYSIS_RULES.types.join(',')} className="sr-only" aria-label="Choose files"
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          <Button variant="secondary" size="sm" disabled={files.length >= ANALYSIS_RULES.maxFiles} onClick={() => document.getElementById('analysis-files').click()}>Choose files</Button>
          <p className="mt-1.5 text-sm text-muted">{ANALYSIS_RULES.hint}. Up to {ANALYSIS_RULES.maxFiles} files.</p>
          {(errors.files || fileError) && <p className="mt-1.5 text-sm text-danger">{errors.files || fileError}</p>}
          {files.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="relative overflow-hidden rounded-ctl border border-line">
                  {previews[i] ? <img src={previews[i]} alt="" className="h-24 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-surface-2 text-sm text-muted">PDF</div>}
                  <p className="truncate px-2 py-1 text-xs">{f.name}</p>
                  <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} aria-label={`Remove ${f.name}`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <FormFooter onCancel={onCancel} busy={form.busy} submitLabel="Save submission" />
    </form>
  )
}
