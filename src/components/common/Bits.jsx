import { useRef } from 'react'
import { FileText, Paperclip, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { getSignedUrl } from '@/lib/storage'

export function IconActions({ onEdit, onDelete, label }) {
  const btn = 'flex h-9 w-9 items-center justify-center rounded-ctl text-muted hover:bg-surface-2 hover:text-ink'
  return (
    <div className="flex shrink-0 items-center">
      {onEdit && <button onClick={onEdit} className={btn} aria-label={`Edit ${label}`}><Pencil className="h-4 w-4" /></button>}
      {onDelete && <button onClick={onDelete} className={`${btn} hover:!text-danger`} aria-label={`Delete ${label}`}><Trash2 className="h-4 w-4" /></button>}
    </div>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div className="rounded-ctl border border-line bg-surface px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value || '—'}</dd>
    </div>
  )
}

/** File picker for a single optional attachment (image or invoice). */
export function FileField({ label, hint, accept, file, onPick, existingName, onRemoveExisting, removed, error }) {
  const ref = useRef(null)
  const showExisting = existingName && !removed && !file
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <input ref={ref} type="file" accept={accept} className="sr-only" aria-label={label}
        onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = '' }} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => ref.current?.click()}><Paperclip className="h-4 w-4" />{file || showExisting ? 'Replace file' : 'Choose file'}</Button>
        {file && <span className="flex min-w-0 items-center gap-1.5 text-sm"><FileText className="h-4 w-4 shrink-0 text-muted" /><span className="truncate">{file.name}</span>
          <button type="button" onClick={() => onPick(null)} aria-label="Remove selected file" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></span>}
        {showExisting && <span className="flex items-center gap-1.5 text-sm text-muted"><FileText className="h-4 w-4" />Current file attached
          <button type="button" onClick={onRemoveExisting} className="text-danger hover:underline">Remove</button></span>}
      </div>
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  )
}

export async function openPrivateFile(bucket, path, onError) {
  const win = window.open('', '_blank')
  try {
    const url = await getSignedUrl(bucket, path)
    if (win) win.location.href = url
    else window.location.href = url
  } catch {
    win?.close()
    onError?.('Could not open the file.')
  }
}

export const FormError = ({ children }) => (children ? <div className="mb-4"><Alert>{children}</Alert></div> : null)
