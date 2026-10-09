import { Link } from 'react-router-dom'
import { Car, Plus } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { PageHeader } from '@/components/ui/Controls'
import { Card } from '@/components/ui/Card'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { buttonStyles } from '@/components/ui/Button'
import { VehicleCard } from '@/components/vehicles/VehicleCard'

export default function Vehicles() {
  const { vehicles, loading } = useGarage()
  return (
    <>
      <PageHeader title="My Vehicles" description="Every vehicle you own, with its health, history and reminders."
        actions={<Link to="/vehicles/new" className={buttonStyles()}><Plus className="h-4 w-4" />Add vehicle</Link>} />
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : vehicles.length === 0 ? (
        <Card><EmptyState icon={Car} title="Add your first vehicle" description="Once a vehicle is added you can log services, track maintenance, and get reminders before insurance and PUC expire."
          action={<Link to="/vehicles/new" className={buttonStyles()}>Add vehicle</Link>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map((v) => <VehicleCard key={v.id} vehicleId={v.id} />)}</div>
      )}
    </>
  )
}
