import { Logo } from '@/components/Logo'

function Gauge() {
  const len = 314
  return (
    <svg viewBox="0 0 240 150" className="w-full max-w-sm" aria-hidden>
      {Array.from({ length: 21 }).map((_, i) => {
        const a = Math.PI + (i / 20) * Math.PI
        const major = i % 5 === 0
        const r1 = major ? 100 : 106, r2 = 114
        return <line key={i} x1={120 + r1 * Math.cos(a)} y1={130 + r1 * Math.sin(a)} x2={120 + r2 * Math.cos(a)} y2={130 + r2 * Math.sin(a)}
          stroke="currentColor" strokeOpacity={major ? 0.7 : 0.3} strokeWidth={major ? 2 : 1} />
      })}
      <path d="M 30 130 A 90 90 0 0 1 210 130" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="10" strokeLinecap="round" />
      <path d="M 30 130 A 90 90 0 0 1 210 130" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={len} style={{ '--len': len, '--to': 62, animation: 'sweep 1.6s cubic-bezier(.2,.7,.2,1) both' }} />
      <circle cx="120" cy="130" r="6" fill="currentColor" />
    </svg>
  )
}

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid grid-cols-1 min-h-screen bg-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-brand p-12 text-brand-ink lg:flex">
        <Logo inverted />
        <div>
          <Gauge />
          <h2 className="mt-10 max-w-md text-4xl font-semibold leading-tight">Every service, invoice and reminder for your vehicles, in one place.</h2>
          <p className="mt-4 max-w-md opacity-80">Keep a complete record of each vehicle so nothing gets missed and nothing gets forgotten.</p>
        </div>
        <p className="text-sm opacity-70">AutoCare 360</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
