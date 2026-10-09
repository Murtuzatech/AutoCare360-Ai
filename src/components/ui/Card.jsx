import { cn } from '@/lib/cn'

export function Card({ className, ...rest }) {
  return <section className={cn('rounded-card border border-line bg-surface', className)} {...rest} />
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export const CardBody = ({ className, ...rest }) => <div className={cn('p-5', className)} {...rest} />
