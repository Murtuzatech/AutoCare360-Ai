import { useMemo } from 'react'
import { useGarage } from '@/contexts/GarageContext'
import { useAuth } from '@/contexts/AuthContext'
import { computeHealth } from '@/lib/health'

/** Records + computed health for one vehicle. */
export function useVehicleData(vehicleId) {
  const garage = useGarage()
  const { profile } = useAuth()
  const unit = profile.preferences.units.distance
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId) ?? null
  return useMemo(() => {
    if (!vehicle) return { vehicle: null }
    const scoped = {
      services: garage.services.filter((s) => s.vehicle_id === vehicleId),
      tasks: garage.tasks.filter((t) => t.vehicle_id === vehicleId),
      issues: garage.issues.filter((i) => i.vehicle_id === vehicleId),
    }
    return { vehicle, ...scoped, health: computeHealth(vehicle, scoped, unit) }
  }, [vehicle, garage.services, garage.tasks, garage.issues, vehicleId, unit])
}
