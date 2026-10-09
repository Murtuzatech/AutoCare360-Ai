import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus, ShoppingBag, Wrench } from 'lucide-react'
import { useFormat } from '@/hooks/useFormat'
import { formatDate, formatMonth } from '@/lib/format'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'

const icons = { purchase: ShoppingBag, added: Plus, service: Wrench, task: ClipboardCheck, issue: AlertTriangle, resolved: CheckCircle2 }
const tones = { issue: 'text-warn bg-warn/10', resolved: 'text-ok bg-ok/10', service: 'text-brand bg-brand/10', task: 'text-brand bg-brand/10' }

export function Timeline({ events, limit, vehicleNames }) {
  const { money, dist } = useFormat()
  const shown = limit ? events.slice(0, limit) : events
  if (!shown.length) return <Card><EmptyState title="No activity yet" description="Services, completed tasks and issues will appear here as you record them." /></Card>

  let lastMonth = ''
  return (
    <ol className="space-y-1">
      {shown.map((e) => {
        const month = formatMonth(e.date)
        const header = !limit && month !== lastMonth
        lastMonth = month
        const Icon = icons[e.kind] ?? Plus
        return (
          <li key={e.id}>
            {header && <p className="mb-2 mt-4 text-sm font-semibold text-muted first:mt-0">{month}</p>}
            <div className="flex gap-3 rounded-ctl py-2">
              <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted', tones[e.kind])}><Icon className="h-4 w-4" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-sm text-muted">
                  {[formatDate(e.date), vehicleNames?.[e.vehicleId], e.detail, e.odometer != null && dist(e.odometer)].filter(Boolean).join(' · ')}
                </p>
              </div>
              {e.amount != null && <span className="text-sm font-medium">{money(e.amount)}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
