import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

export const Input = forwardRef(function Input({ label, error, hint, className, id, ...rest }, ref) {
  const auto = useId()
  const inputId = id || auto
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <input
        ref={ref} id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy}
        className={cn(
          'h-10 w-full rounded-ctl border bg-surface px-3 text-sm placeholder:text-muted/70 disabled:opacity-60',
          error ? 'border-danger' : 'border-line hover:border-muted/50',
        )}
        {...rest}
      />
      {error ? <p id={`${inputId}-err`} className="mt-1.5 text-sm text-danger">{error}</p>
        : hint ? <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  )
})

export function Select({ label, id, className, children, ...rest }) {
  const auto = useId()
  const selectId = id || auto
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <select id={selectId} className="h-10 w-full rounded-ctl border border-line bg-surface px-3 text-sm hover:border-muted/50" {...rest}>
        {children}
      </select>
    </div>
  )
}

export function Textarea({ label, error, hint, className, id, ...rest }) {
  const auto = useId()
  const areaId = id || auto
  return (
    <div className={className}>
      {label && <label htmlFor={areaId} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <textarea id={areaId} rows={3} aria-invalid={Boolean(error)}
        className={cn('w-full rounded-ctl border bg-surface px-3 py-2 text-sm placeholder:text-muted/70', error ? 'border-danger' : 'border-line hover:border-muted/50')} {...rest} />
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  )
}
