import { useSearchParams } from 'react-router-dom'
import { useGarage } from '@/contexts/GarageContext'
import { PageHeader } from '@/components/ui/Controls'
import { Skeleton } from '@/components/ui/Feedback'
import ExpensesView from '@/components/expenses/ExpensesView'

export default function Expenses() {
  const { loading } = useGarage()
  const [params, setParams] = useSearchParams()
  return (
    <>
      <PageHeader title="Expenses" description="Fuel, service, repairs and everything else your vehicles cost." />
      {loading ? <Skeleton className="h-64" /> : (
        <ExpensesView startOpen={params.get('new') === '1'} onOpened={() => setParams({}, { replace: true })} />
      )}
    </>
  )
}
