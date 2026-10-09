import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Receipt } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Controls'
import { Tabs } from '@/components/ui/Tabs'
import { IconActions, Stat, openPrivateFile } from '@/components/common/Bits'
import { EXPENSE_CATEGORIES, labelOf } from '@/lib/constants'
import { buildLedger, byCategory, byVehicle, filterLedger, monthlySeries, periodStart, total } from '@/lib/expenses'
import { formatDate } from '@/lib/format'
import { ExpenseForm } from './ExpenseForm'
import { CategoryChart, MonthlyChart, VehicleChart } from './Charts'

const PERIODS = [['3m', 'Last 3 months'], ['12m', 'Last 12 months'], ['ytd', 'This year'], ['all', 'All time']]

export default function ExpensesView({ vehicleId, startOpen, onOpened }) {
  const { vehicles, expenses, services, actions } = useGarage()
  const { money } = useFormat()
  const toast = useToast()
  const [tab, setTab] = useState('analytics')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [period, setPeriod] = useState('12m')
  const [includeService, setIncludeService] = useState(true)
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (startOpen && vehicles.length) { setForm({}); onOpened?.() } }, [startOpen, vehicles.length])  

  const scope = vehicleId ?? (vehicleFilter === 'all' ? null : vehicleFilter)
  const from = periodStart(period)
  const entries = useMemo(
    () => filterLedger(buildLedger(expenses, services, includeService), { vehicleId: scope, from }),
    [expenses, services, includeService, scope, from],
  )
  const months = useMemo(() => monthlySeries(entries, from), [entries, from])
  const cats = useMemo(() => byCategory(entries), [entries])
  const perVehicle = useMemo(() => byVehicle(entries, vehicles), [entries, vehicles])
  const sum = total(entries)
  const catTotal = (c) => cats.find((x) => x.category === c)?.amount ?? 0
  const nameOf = (id) => vehicles.find((v) => v.id === id)?.nickname ?? ''

  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteExpense(deleting); toast.success('Expense deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  if (!vehicles.length) {
    return <Card><EmptyState icon={Receipt} title="Add a vehicle first" description="Expenses are tracked per vehicle."
      action={<Link to="/vehicles/new" className={buttonStyles()}>Add vehicle</Link>} /></Card>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {!vehicleId && vehicles.length > 1 && (
            <Select label="Vehicle" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="w-full sm:w-52">
              <option value="all">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
            </Select>
          )}
          <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full sm:w-48">
            {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Add expense</Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total spent" value={money(sum)} sub={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`} />
        <Stat label="Monthly average" value={money(months.length ? sum / months.length : 0)} />
        <Stat label="Service" value={money(catTotal('service'))} />
        <Stat label="Repairs" value={money(catTotal('repairs'))} />
      </div>
      <div className="mb-2 rounded-ctl border border-line bg-surface px-4">
        <Toggle label="Include service records" description="Costs logged under Service & Maintenance count as service or repair spending." checked={includeService} onChange={setIncludeService} />
      </div>

      <Tabs label="Expense views" value={tab} onChange={setTab} tabs={[{ value: 'analytics', label: 'Analytics' }, { value: 'transactions', label: 'Transactions', count: entries.length }]} />
      <div className="mt-5">
        {entries.length === 0 ? (
          <Card><EmptyState icon={Receipt} title="No spending in this view" description="Add an expense, or log a service with a cost, to see analytics here."
            action={<Button onClick={() => setForm({})}>Add expense</Button>} /></Card>
        ) : tab === 'analytics' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2"><CardHeader title="Monthly spending" description="Bars show each month; the dashed line is a 3-month moving average." />
              <CardBody><MonthlyChart data={months} money={money} /></CardBody></Card>
            <Card><CardHeader title="By category" /><CardBody><CategoryChart data={cats} money={money} /></CardBody></Card>
            {!scope && perVehicle.length > 1
              ? <Card><CardHeader title="By vehicle" /><CardBody><VehicleChart data={perVehicle} money={money} /></CardBody></Card>
              : <Card><CardHeader title="Highest month" /><CardBody>
                  {(() => { const top = [...months].sort((a, b) => b.total - a.total)[0]; return top ? <><p className="font-display text-2xl font-semibold">{money(top.total)}</p><p className="text-sm text-muted">{new Date(`${top.key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></> : null })()}
                </CardBody></Card>}
          </div>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{labelOf(EXPENSE_CATEGORIES, e.category)}</span>
                      {e.source === 'service' && <Badge tone="brand">Service record</Badge>}
                      {e.receiptPath && <FileText className="h-4 w-4 text-muted" aria-label="Receipt attached" />}
                    </div>
                    <p className="truncate text-sm text-muted">{[formatDate(e.date), !vehicleId && nameOf(e.vehicleId), e.description].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="font-display font-semibold">{money(e.amount)}</span>
                  {e.source === 'expense' ? (
                    <div className="flex items-center">
                      {e.receiptPath && <Button variant="ghost" size="sm" onClick={() => openPrivateFile('expense-receipts', e.receiptPath, toast.error)}>Receipt</Button>}
                      <IconActions label="expense" onEdit={() => setForm({ expense: e.raw })} onDelete={() => setDeleting(e.raw)} />
                    </div>
                  ) : <Link to={`/vehicles/${e.vehicleId}?tab=service`} className="text-sm text-brand hover:underline">View</Link>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.expense ? 'Edit expense' : 'Add expense'}>
        {form && <ExpenseForm expense={form.expense} vehicleId={vehicleId ?? (vehicleFilter !== 'all' ? vehicleFilter : undefined)} onCancel={() => setForm(null)}
          onDone={() => { toast.success(form.expense ? 'Expense saved' : 'Expense added'); setForm(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete expense?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={`This permanently deletes the ${deleting ? labelOf(EXPENSE_CATEGORIES, deleting.category).toLowerCase() : ''} expense${deleting?.receipt_path ? ' and its receipt' : ''}.`} />
    </div>
  )
}
