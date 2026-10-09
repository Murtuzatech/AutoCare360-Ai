import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { callAi } from '@/lib/ai'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Controls'
import { Button } from '@/components/ui/Button'

const KEY = 'autocare-insights'
const read = () => { try { const v = JSON.parse(sessionStorage.getItem(KEY)); return v?.date === new Date().toDateString() ? v.insights : null } catch { return null } }

/** On-demand only: nothing is sent to the AI until the user asks, and results are never fabricated. */
export function InsightsCard() {
  const { profile } = useAuth()
  const ai = profile.preferences.ai
  const [insights, setInsights] = useState(read)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true); setError('')
    try {
      const { insights: list } = await callAi({ action: 'insights' })
      setInsights(list)
      try { sessionStorage.setItem(KEY, JSON.stringify({ date: new Date().toDateString(), insights: list })) } catch { /* ignore */ }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const usable = ai.enabled && ai.useVehicleContext

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="AI insights" description="Observations drawn only from your own records."
        action={<Button variant="secondary" size="sm" onClick={run} loading={busy} disabled={!usable}><Sparkles className="h-4 w-4" />{insights ? 'Refresh' : 'Generate insights'}</Button>} />
      <div className="px-5 py-4">
        {!usable && <p className="text-sm text-muted">Turn on AI features and vehicle-data sharing in <Link to="/settings" className="text-brand hover:underline">Settings</Link> to use insights.</p>}
        {usable && error && <p className="text-sm text-danger" role="alert">{error}</p>}
        {usable && !error && !insights && <p className="text-sm text-muted">Press Generate to have the AI review your vehicles. This sends your records to Google Gemini.</p>}
        {usable && insights && insights.length === 0 && <p className="text-sm text-muted">Not enough data for useful insights yet. Add service records, dates and expenses and try again.</p>}
        {usable && insights?.length > 0 && (
          <ul className="space-y-3">
            {insights.map((i, n) => (
              <li key={n} className="flex gap-3"><Lightbulb className={`mt-0.5 h-5 w-5 shrink-0 ${i.priority === 'high' ? 'text-warn' : 'text-brand'}`} aria-hidden />
                <div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-sm font-medium">{i.title}{i.priority === 'high' && <Badge tone="warn">Priority</Badge>}</p>
                  <p className="text-sm text-muted">{i.detail}</p></div></li>
            ))}
          </ul>
        )}
        {usable && insights?.length > 0 && <p className="mt-3 text-xs text-muted">AI-generated from your records. It can make mistakes, so check anything important.</p>}
      </div>
    </Card>
  )
}
