import { useMemo, useState } from 'react'
import { Download, FileBarChart, Sparkles } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useFormat } from '@/hooks/useFormat'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Controls'
import { REPORT_TYPES } from '@/lib/reports/models'
import { buildReportFromGarage } from '@/lib/reports/fromGarage'
import { callAi } from '@/lib/ai'
import { useAuth } from '@/contexts/AuthContext'
import { toLocalISO } from '@/lib/format'
import { periodStart } from '@/lib/expenses'
import { cn } from '@/lib/cn'

function Preview({ model }) {
  return (
    <div className="space-y-5">
      <div className="rounded-ctl bg-brand px-4 py-3 text-brand-ink">
        <p className="font-display text-lg font-semibold">{model.title}</p>
        <p className="text-sm opacity-85">{model.subtitle}</p>
      </div>
      {model.sections.map((s, i) => (
        <section key={i}>
          {s.type === 'note' ? <p className="text-xs italic text-muted">{s.text}</p> : (
            <>
              <h3 className="mb-2 text-sm font-semibold">{s.heading}</h3>
              {s.type === 'text' && <p className="text-sm text-muted">{s.text}</p>}
              {s.type === 'kv' && <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_1fr] sm:gap-x-6">{s.rows.flatMap(([k, v]) => [<dt key={`k${k}`} className="text-muted">{k}</dt>, <dd key={`v${k}`} className="font-medium">{v}</dd>])}</dl>}
              {s.type === 'table' && (
                <div className="overflow-x-auto rounded-ctl border border-line">
                  <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-surface-2 text-muted"><tr>{s.columns.map((c, ci) => <th key={c} className={cn('px-3 py-2 font-medium', s.align?.[ci] === 'right' && 'text-right')}>{c}</th>)}</tr></thead>
                    <tbody className="divide-y divide-line">
                      {s.rows.slice(0, 6).map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className={cn('px-3 py-2', s.align?.[ci] === 'right' && 'text-right')}>{c}</td>)}</tr>)}
                    </tbody>
                  </table>
                  {s.rows.length > 6 && <p className="border-t border-line px-3 py-2 text-xs text-muted">+ {s.rows.length - 6} more rows in the PDF</p>}
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  )
}

export default function ReportBuilder({ vehicleId }) {
  const garage = useGarage()
  const { vehicles } = garage
  const { profile } = useAuth()
  const ai = profile.preferences.ai
  const { unit, currency } = useFormat()
  const toast = useToast()
  const [type, setType] = useState('summary')
  const [vid, setVid] = useState(vehicleId ?? vehicles[0]?.id ?? '')
  const [preset, setPreset] = useState('all')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [includeService, setIncludeService] = useState(true)
  const [busy, setBusy] = useState(false)
  const [aiState, setAiState] = useState({ key: '', text: '', loading: false, error: '' })

  const meta = REPORT_TYPES.find((r) => r.value === type)
  const selectedVid = vehicleId ?? vid
  const vehicle = vehicles.find((v) => v.id === selectedVid) ?? null
  const range = preset === 'custom' ? { from: custom.from || null, to: custom.to || null }
    : preset === 'all' ? {} : { from: periodStart(preset), to: toLocalISO(new Date()) }
  const rangeError = range.from && range.to && range.from > range.to ? 'The start date must be before the end date.' : ''
  const blocked = (meta.needsVehicle && !vehicle) || Boolean(rangeError)

  const aiKey = `${type}:${selectedVid}`
  const aiText = aiState.key === aiKey ? aiState.text : ''
  const model = useMemo(() => {
    if (blocked) return null
    const m = buildReportFromGarage({ type, vehicleId: vehicle?.id ?? null, garage, unit, currency, range, includeService })
    if (aiText) m.sections.unshift({ type: 'text', heading: 'AI-generated summary (review before sharing)', text: aiText })
    return m
  }, [type, vehicle, garage, preset, custom, includeService, unit, currency, blocked, aiText])  

  const canAi = Boolean(vehicle) && type !== 'expense' && ai.enabled && ai.useVehicleContext
  const generateSummary = async () => {
    setAiState({ key: aiKey, text: '', loading: true, error: '' })
    try {
      const { summary } = await callAi({ action: 'summary', vehicle_id: vehicle.id, report_type: type })
      setAiState({ key: aiKey, text: summary, loading: false, error: '' })
    } catch (err) { setAiState({ key: aiKey, text: '', loading: false, error: err.message }) }
  }

  const download = async () => {
    setBusy(true)
    try { const { downloadReport } = await import('@/lib/reports/pdf'); downloadReport(model) }
    catch { toast.error('Could not create the PDF. Please try again.') }
    finally { setBusy(false) }
  }

  if (!vehicles.length && type !== 'expense') {
    return <Card><EmptyState icon={FileBarChart} title="Add a vehicle to generate reports" description="Reports are built from your vehicles' records." /></Card>
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Report type" />
          <div role="radiogroup" aria-label="Report type" className="space-y-1 p-2">
            {REPORT_TYPES.map((r) => (
              <button key={r.value} role="radio" aria-checked={type === r.value} onClick={() => setType(r.value)}
                className={cn('w-full rounded-ctl px-3 py-2.5 text-left', type === r.value ? 'bg-brand/10' : 'hover:bg-surface-2')}>
                <span className={cn('block text-sm font-medium', type === r.value && 'text-brand')}>{r.label}</span>
                <span className="block text-xs text-muted">{r.description}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Options" />
          <CardBody className="space-y-4">
            {!vehicleId && (
              <Select label="Vehicle" value={vid} onChange={(e) => setVid(e.target.value)}>
                {meta.allVehicles && <option value="">All vehicles</option>}
                {!meta.allVehicles && !vid && <option value="">Select a vehicle</option>}
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
              </Select>
            )}
            {meta.range && (
              <>
                <Select label="Period" value={preset} onChange={(e) => setPreset(e.target.value)}>
                  <option value="all">All time</option><option value="12m">Last 12 months</option><option value="ytd">This year</option><option value="custom">Custom range</option>
                </Select>
                {preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="From" type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                    <Input label="To" type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                  </div>
                )}
                {rangeError && <p className="text-sm text-danger">{rangeError}</p>}
              </>
            )}
            {type === 'expense' && <Toggle label="Include service records" checked={includeService} onChange={setIncludeService} />}
            {type !== 'expense' && (
              <div className="border-t border-line pt-4">
                <Button variant="secondary" size="sm" onClick={generateSummary} loading={aiState.loading && aiState.key === aiKey} disabled={!canAi}>
                  <Sparkles className="h-4 w-4" />{aiText ? 'Regenerate AI summary' : 'Add AI summary'}
                </Button>
                <p className="mt-2 text-xs text-muted">
                  {!ai.enabled || !ai.useVehicleContext ? 'Turn on AI features and vehicle-data sharing in Settings to use this.'
                    : !vehicle ? 'Choose a vehicle first.' : 'Writes a short summary from your records and sends them to Google Gemini. Always review it before sharing.'}
                </p>
                {aiState.error && aiState.key === aiKey && <p className="mt-2 text-sm text-danger">{aiState.error}</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader title="Preview" description="The PDF contains the full report." action={<Button onClick={download} loading={busy} disabled={blocked}><Download className="h-4 w-4" />Download PDF</Button>} />
        <CardBody>{model ? <Preview model={model} /> : <EmptyState title="Choose a vehicle" description="Select a vehicle to preview this report." className="py-8" />}</CardBody>
      </Card>
    </div>
  )
}
