import { Link } from 'react-router-dom'
import { Fuel, Gauge } from 'lucide-react'
import { Badge } from '@/components/ui/Controls'
import { useFormat } from '@/hooks/useFormat'
import { useVehicleData } from '@/hooks/useVehicleData'
import { healthMeta } from '@/lib/health'
import { labelOf, FUEL_TYPES } from '@/lib/constants'
import { VehicleImage, HealthRing } from './VehicleVisuals'

export function VehicleCard({ vehicleId }) {
  const { vehicle, health, issues } = useVehicleData(vehicleId)
  const { dist } = useFormat()
  if (!vehicle) return null
  const open = issues.filter((i) => i.status === 'open').length
  const meta = healthMeta[health.level]
  return (
    <Link to={`/vehicles/${vehicle.id}`} className="group block overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-brand/50">
      <VehicleImage path={vehicle.image_path} className="h-40 w-full" iconSize="h-10 w-10" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold group-hover:text-brand">{vehicle.nickname}</h3>
            <p className="truncate text-sm text-muted">{[vehicle.manufacturing_year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}</p>
          </div>
          <HealthRing score={health.score} level={health.level} size={52} stroke={6} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" />{dist(vehicle.odometer_km)}</span>
          <span className="flex items-center gap-1.5"><Fuel className="h-4 w-4" />{labelOf(FUEL_TYPES, vehicle.fuel_type)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={meta.tone === 'danger' ? 'warn' : meta.tone}>{meta.label}</Badge>
          {vehicle.registration_number && <Badge>{vehicle.registration_number}</Badge>}
          {open > 0 && <Badge tone="warn">{open} open issue{open > 1 ? 's' : ''}</Badge>}
        </div>
      </div>
    </Link>
  )
}
