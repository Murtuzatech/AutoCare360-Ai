import { useId, useRef } from 'react'
import { cn } from '@/lib/cn'

/** WAI-ARIA tabs: roving tabindex with Arrow / Home / End keys. Panels should use `tabPanelProps(id, value)`. */
export function Tabs({ tabs, value, onChange, label, idPrefix }) {
  const auto = useId()
  const prefix = idPrefix ?? auto
  const refs = useRef({})
  const move = (e, i) => {
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const next = tabs[(keys[e.key] + tabs.length) % tabs.length]
    onChange(next.value)
    refs.current[next.value]?.focus()
  }
  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="tablist" aria-label={label}>
      <div className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t, i) => (
          <button key={t.value} ref={(el) => { refs.current[t.value] = el }} role="tab" id={`${prefix}-tab-${t.value}`} aria-controls={`${prefix}-panel`}
            aria-selected={value === t.value} tabIndex={value === t.value ? 0 : -1} onClick={() => onChange(t.value)} onKeyDown={(e) => move(e, i)}
            className={cn('-mb-px flex h-11 items-center gap-2 border-b-2 px-3.5 text-sm font-medium transition-colors',
              value === t.value ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink')}>
            {t.label}
            {t.count > 0 && <span className="rounded-full bg-surface-2 px-1.5 text-xs text-muted">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
