import { Check, Copy, Database, RefreshCw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { LogoMark } from '@/components/Logo'
import { Alert } from '@/components/ui/Feedback'
import { useToast } from '@/contexts/ToastContext'
import Markdown from './Markdown'
import { ActionCard } from './ActionCard'
import { Resources } from './Resources'

function ContextChips({ meta }) {
  const c = meta?.context
  if (!c) return null
  const parts = [c.vehicle ?? (c.vehicles ? `${c.vehicles} vehicle${c.vehicles > 1 ? 's' : ''}` : null),
    c.services ? `${c.services} service${c.services > 1 ? 's' : ''}` : null, c.openIssues ? `${c.openIssues} open issue${c.openIssues > 1 ? 's' : ''}` : null,
    c.openTasks ? `${c.openTasks} open task${c.openTasks > 1 ? 's' : ''}` : null].filter(Boolean)
  return parts.length ? <p className="flex items-center gap-1.5 text-xs text-muted"><Database className="h-3.5 w-3.5" aria-hidden />Used your records: {parts.join(' · ')}</p> : null
}

export function MessageBubble({ message, streaming, isLast, canRegenerate, onRegenerate, onActionStatus, busy }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-card rounded-br-md bg-brand px-4 py-2.5 text-[15px] text-brand-ink sm:max-w-[75%]">{message.content}</div>
      </div>
    )
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { toast.error('Could not copy to the clipboard.') }
  }
  const safety = message.meta?.safety ?? []

  return (
    <div className="flex gap-3">
      <LogoMark size={28} />
      <div className="min-w-0 flex-1">
        {safety.length > 0 && (
          <div className="mb-3"><Alert><span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />Possible safety concern: {safety.map((s) => s.label).join(', ')}</span></Alert></div>
        )}
        {message.content ? <Markdown>{message.content}</Markdown> : streaming ? (
          <span className="flex gap-1 py-2" aria-label="Assistant is thinking">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
        ) : null}
        {message.actions?.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {message.actions.map((a) => <ActionCard key={a.id} action={a} readOnly={streaming} onStatus={(s) => onActionStatus?.(message.id, a.id, s)} />)}
          </div>
        )}
        <Resources data={message.meta?.resources} />
        {!streaming && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <ContextChips meta={message.meta} />
            <div className="flex items-center gap-1">
              <button onClick={copy} className="flex h-7 items-center gap-1 rounded-ctl px-2 text-xs text-muted hover:bg-surface-2 hover:text-ink" aria-label="Copy response">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}
              </button>
              {isLast && canRegenerate && (
                <button onClick={onRegenerate} disabled={busy} className="flex h-7 items-center gap-1 rounded-ctl px-2 text-xs text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50" aria-label="Regenerate response">
                  <RefreshCw className="h-3.5 w-3.5" />Regenerate
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
