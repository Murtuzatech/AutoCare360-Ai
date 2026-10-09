export function LogoMark({ size = 32, inverted = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" className={inverted ? 'fill-brand-ink' : 'fill-brand'} />
      <path d="M8 21a8 8 0 1 1 16 0" fill="none" className={inverted ? 'stroke-brand' : 'stroke-brand-ink'} strokeWidth="3" strokeLinecap="round" />
      <path d="M16 21l4-6" className={inverted ? 'stroke-brand' : 'stroke-brand-ink'} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className = '', inverted = false }) {
  return (
    <span className={`flex items-center gap-2.5 whitespace-nowrap ${className}`}>
      <LogoMark inverted={inverted} />
      <span className={`font-display text-lg font-semibold tracking-tight ${inverted ? 'text-brand-ink' : ''}`}>AutoCare 360</span>
    </span>
  )
}
