import { cn } from '@/lib/cn'

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4 py-3', disabled && 'cursor-not-allowed opacity-50')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg
        after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  )
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-ctl bg-surface-2 p-1">
      {options.map((o, i) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value} tabIndex={value === o.value ? 0 : -1} onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
            if (!step) return
            e.preventDefault()
            const next = options[(i + step + options.length) % options.length]
            onChange(next.value)
            e.currentTarget.parentElement.querySelectorAll('[role=radio]')[(i + step + options.length) % options.length]?.focus()
          }}
          className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {o.icon && <o.icon className="h-4 w-4" aria-hidden />}{o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = { neutral: 'bg-surface-2 text-muted', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn', brand: 'bg-brand/10 text-brand' }
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function Avatar({ src, name, size = 36, className }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
  return src ? (
    <img src={src} alt="" style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-semibold text-brand', className)} aria-hidden>
      {initials}
    </span>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
