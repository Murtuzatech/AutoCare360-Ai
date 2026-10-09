import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  closeRef.current = onClose
  useFocusTrap(panel, open)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() } }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open])

  if (!open) return null
  const width = size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/50" onClick={() => closeRef.current()} aria-hidden />
      <div ref={panel} tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full animate-[pop-in_.18s_ease-out] flex-col rounded-t-card border border-line bg-surface shadow-pop outline-none sm:rounded-card ${width}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button onClick={() => closeRef.current()} aria-label="Close dialog" className="flex h-9 w-9 items-center justify-center rounded-ctl text-muted hover:bg-surface-2"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export function FormFooter({ onCancel, busy, submitLabel = 'Save', disabled }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex justify-end gap-2 border-t border-line bg-surface px-5 py-4">
      <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button type="submit" loading={busy} disabled={disabled}>{submitLabel}</Button>
    </div>
  )
}
