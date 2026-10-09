import { Car } from 'lucide-react'
import { useSignedUrl } from '@/lib/storage'
import { cn } from '@/lib/cn'

export function VehicleImage({ path, className, iconSize = 'h-8 w-8' }) {
  const url = useSignedUrl('vehicle-images', path)
  return url
    ? <img src={url} alt="" loading="lazy" decoding="async" className={cn('object-cover', className)} />
    : <div className={cn('flex items-center justify-center bg-surface-2 text-muted', className)} aria-hidden><Car className={iconSize} /></div>
}

const ringColor = { good: 'text-ok', attention: 'text-warn', action: 'text-danger' }

/** Circular gauge, 0–100. The number and label carry the meaning, not the colour alone. */
export function HealthRing({ score, level, size = 64, stroke = 7 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Health score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className={cn('stroke-current transition-all', ringColor[level])} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-semibold" style={{ fontSize: size * 0.3 }}>{score}</span>
    </div>
  )
}
