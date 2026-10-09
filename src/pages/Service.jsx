import { useSearchParams } from 'react-router-dom'
import { useGarage } from '@/contexts/GarageContext'
import { PageHeader } from '@/components/ui/Controls'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Feedback'
import ServiceSection from '@/components/service/ServiceSection'
import TaskSection from '@/components/service/TaskSection'

export default function Service() {
  const { loading, tasks, services } = useGarage()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'maintenance' ? 'maintenance' : 'service'
  const openNew = params.get('new')
  const clearNew = () => { const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }) }
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length

  return (
    <>
      <PageHeader title="Service & Maintenance" description="Service history and upcoming work across your vehicles." />
      <Tabs label="Service sections" value={tab} onChange={(t) => setParams(t === 'service' ? {} : { tab: t })}
        tabs={[{ value: 'service', label: 'Service history', count: services.length }, { value: 'maintenance', label: 'Maintenance tasks', count: openTasks }]} />
      <div className="mt-6">
        {loading ? <Skeleton className="h-64" />
          : tab === 'service' ? <ServiceSection startOpen={openNew === 'service'} onOpened={clearNew} />
          : <TaskSection startOpen={openNew === 'task'} onOpened={clearNew} />}
      </div>
    </>
  )
}
