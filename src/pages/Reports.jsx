import { useGarage } from '@/contexts/GarageContext'
import { PageHeader } from '@/components/ui/Controls'
import { Skeleton } from '@/components/ui/Feedback'
import ReportBuilder from '@/components/reports/ReportBuilder'

export default function Reports() {
  const { loading } = useGarage()
  return (
    <>
      <PageHeader title="Reports" description="Professional PDF summaries of your vehicle records." />
      {loading ? <Skeleton className="h-64" /> : <ReportBuilder />}
    </>
  )
}
