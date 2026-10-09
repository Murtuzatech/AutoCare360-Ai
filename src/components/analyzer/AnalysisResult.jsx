import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/Controls'
import { formatDate, toLocalISO } from '@/lib/format'

const URGENCY = {
  monitor: { label: 'Keep an eye on it', tone: 'ok', icon: CheckCircle2, box: 'border-ok/30 bg-ok/10' },
  service_soon: { label: 'Book a service soon', tone: 'warn', icon: Info, box: 'border-warn/30 bg-warn/10' },
  inspect_promptly: { label: 'Have it inspected promptly', tone: 'warn', icon: AlertTriangle, box: 'border-warn/40 bg-warn/10' },
  do_not_drive: { label: 'Do not drive until inspected', tone: 'warn', icon: AlertOctagon, box: 'border-danger/40 bg-danger/10' },
}
const likelihood = { high: 'More likely', medium: 'Possible', low: 'Less likely' }

/** Renders a stored AI analysis. Always shows confidence and limitations; never presents output as a diagnosis. */
export function AnalysisResult({ result }) {
  const u = URGENCY[result.urgency] ?? URGENCY.inspect_promptly
  const Icon = u.icon
  return (
    <div className="space-y-5 text-sm">
      <div className={`flex items-start gap-3 rounded-card border p-4 ${u.box}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-semibold">{u.label}</p><p className="text-muted">Confidence in this reading: {result.confidence}. This is guidance, not a diagnosis.</p></div>
      </div>

      <p>{result.summary}</p>

      {result.observations?.length > 0 && (
        <section><h3 className="mb-1.5 font-semibold">What the AI noticed</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted">{result.observations.map((o, i) => <li key={i}>{o}</li>)}</ul></section>
      )}
      {result.possible_causes?.length > 0 && (
        <section><h3 className="mb-1.5 font-semibold">Possible explanations</h3>
          <ul className="space-y-2">{result.possible_causes.map((c, i) => (
            <li key={i} className="rounded-ctl border border-line p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{c.cause}</span><Badge>{likelihood[c.likelihood]}</Badge></div>
              <p className="mt-1 text-muted">{c.reasoning}</p></li>))}</ul></section>
      )}
      {result.recommended_steps?.length > 0 && (
        <section><h3 className="mb-1.5 font-semibold">Suggested next steps</h3>
          <ol className="list-decimal space-y-1 pl-5 text-muted">{result.recommended_steps.map((o, i) => <li key={i}>{o}</li>)}</ol></section>
      )}
      {result.questions_to_ask_a_mechanic?.length > 0 && (
        <section><h3 className="mb-1.5 font-semibold">Questions to ask a mechanic</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted">{result.questions_to_ask_a_mechanic.map((o, i) => <li key={i}>{o}</li>)}</ul></section>
      )}

      <div className="rounded-ctl bg-surface-2 p-3 text-muted"><p className="mb-0.5 font-medium text-ink">Limits of this analysis</p>{result.limitations}</div>
      <p className="text-xs text-muted">Generated {formatDate(toLocalISO(new Date(result.generated_at)))} by AI ({result.model}). Photos cannot reveal hidden mechanical faults. Always confirm with a qualified mechanic.</p>
    </div>
  )
}
