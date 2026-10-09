import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export const Spinner = ({ className }) => <Loader2 className={cn('h-5 w-5 animate-spin text-muted', className)} aria-label="Loading" />

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-ctl bg-surface-2', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-ink/5 to-transparent" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon className="h-6 w-6" /></div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="h-6 w-6" /></div>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function Alert({ tone = 'danger', children }) {
  const tones = { danger: 'border-danger/30 bg-danger/10 text-danger', ok: 'border-ok/30 bg-ok/10 text-ok', info: 'border-line bg-surface-2 text-ink' }
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-ctl border px-3.5 py-2.5 text-sm', tones[tone])}>{children}</div>
}

export function FullScreenLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-bg"><Spinner className="h-7 w-7" /></div>
}
