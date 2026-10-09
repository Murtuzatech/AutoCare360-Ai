import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'
import { formatDate, toLocalISO } from '@/lib/format'

export function ConversationList({ conversations, loading, activeId, onOpen, onNew, onDelete }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3"><Button className="w-full" onClick={onNew}><Plus className="h-4 w-4" />New conversation</Button></div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? <div className="space-y-2 p-1"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
          : conversations.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">Your conversations will appear here.</p>
          : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button onClick={() => onOpen(c.id)} aria-current={c.id === activeId}
                    className={cn('flex w-full items-start gap-2.5 rounded-ctl px-3 py-2.5 pr-10 text-left', c.id === activeId ? 'bg-brand/10' : 'hover:bg-surface-2')}>
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="block text-xs text-muted">{formatDate(toLocalISO(new Date(c.updated_at)))}</span></span>
                  </button>
                  <button onClick={() => onDelete(c)} aria-label={`Delete conversation ${c.title}`}
                    className="absolute right-1.5 top-2 flex h-8 w-8 items-center justify-center rounded-ctl text-muted opacity-100 hover:bg-surface-2 hover:text-danger sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}
