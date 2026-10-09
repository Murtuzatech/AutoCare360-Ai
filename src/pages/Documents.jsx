import { useSearchParams } from 'react-router-dom'
import { useGarage } from '@/contexts/GarageContext'
import { PageHeader } from '@/components/ui/Controls'
import { Skeleton } from '@/components/ui/Feedback'
import DocumentsSection from '@/components/documents/DocumentsSection'

export default function Documents() {
  const { loading } = useGarage()
  const [params, setParams] = useSearchParams()
  return (
    <>
      <PageHeader title="Documents" description="Insurance, PUC, invoices, warranty papers and manuals, stored privately." />
      {loading ? <Skeleton className="h-64" /> : <DocumentsSection startOpen={params.get('new') === '1'} onOpened={() => setParams({}, { replace: true })} />}
    </>
  )
}
