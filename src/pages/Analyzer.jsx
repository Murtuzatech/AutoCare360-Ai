import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, FileText, Info, Plus, ScanSearch, Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGarage } from '@/contexts/GarageContext'
import { callAi } from '@/lib/ai'
import { AnalysisResult } from '@/components/analyzer/AnalysisResult'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, PageHeader } from '@/components/ui/Controls'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { openPrivateFile } from '@/components/common/Bits'
import { IssueForm } from '@/components/issues/IssueForm'
import { AnalysisForm } from '@/components/analyzer/AnalysisForm'
import { ANALYSIS_TYPES, labelOf } from '@/lib/constants'
import { formatDate, toLocalISO } from '@/lib/format'
import { useSignedUrl } from '@/lib/storage'

function Thumb({ file }) {
  const url = useSignedUrl('analysis-uploads', file?.type?.startsWith('image/') ? file.path : null)
  return url ? <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-ctl object-cover" />
    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ctl bg-surface-2 text-muted"><FileText className="h-6 w-6" aria-hidden /></span>
}

export default function Analyzer() {
  const { loading, vehicles, analyses, actions, refresh } = useGarage()
  const { profile } = useAuth()
  const ai = profile.preferences.ai
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const toast = useToast()
  const [form, setForm] = useState(false)
  const [detail, setDetail] = useState(null)
  const [issueFrom, setIssueFrom] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteAnalysis(deleting); toast.success('Submission deleted'); setDeleting(null); setDetail(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const detailLive = detail && analyses.find((a) => a.id === detail.id)
  const runAnalysis = async (a) => {
    setRunning(true); setRunError('')
    try { await callAi({ action: 'analyze', analysis_id: a.id }) }
    catch (err) { setRunError(err.message) }
    finally { await refresh(['analyses']); setRunning(false) }
  }
  const nameOf = (id) => vehicles.find((v) => v.id === id)?.nickname

  return (
    <>
      <PageHeader title="Analyzer" description="Capture photos and documents about a problem and keep them with the right vehicle."
        actions={<Button onClick={() => setForm(true)}><Plus className="h-4 w-4" />New submission</Button>} />

      <Card className="mb-6">
        <CardHeader title="How the Analyzer works" action={<Badge tone="brand">AI-assisted</Badge>} />
        <CardBody className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 font-medium"><Info className="h-4 w-4 text-brand" aria-hidden />What it can do</p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Look at up to 5 photos or PDFs and your description</li>
              <li>Describe what is visible, suggest possible explanations and how urgent it may be</li>
              <li>Pull out legible details from invoices and documents</li>
              <li>Turn the result into a tracked issue you control</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4 text-warn" aria-hidden />What it cannot do</p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>It is not a diagnosis. Photos cannot show hidden or internal faults</li>
              <li>It can misread unclear, dark or cropped images, and it will say so</li>
              <li>For brakes, steering, tyres, fuel leaks, smoke or warning lights, get a professional inspection</li>
              <li>Analyzing sends your files and description to Google Gemini</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {loading ? <Skeleton className="h-48" /> : analyses.length === 0 ? (
        <Card><EmptyState icon={ScanSearch} title="No submissions yet" description="Upload a photo of a warning light, damage or an invoice to keep a record you can come back to."
          action={<Button onClick={() => setForm(true)}>New submission</Button>} /></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {analyses.map((a) => (
              <li key={a.id}>
                <button onClick={() => setDetail(a)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
                  <Thumb file={a.files[0]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-sm text-muted">{[labelOf(ANALYSIS_TYPES, a.analysis_type), nameOf(a.vehicle_id), formatDate(toLocalISO(new Date(a.created_at))), `${a.files.length} file${a.files.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Badge tone={a.status === "analyzed" ? "ok" : a.status === "failed" ? "warn" : "neutral"}>{a.status === "analyzed" ? "Analyzed" : a.status === "failed" ? "Analysis failed" : "Not analyzed"}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={form} onClose={() => setForm(false)} title="New submission" size="lg">
        {form && <AnalysisForm onCancel={() => setForm(false)} onDone={() => { toast.success('Submission saved'); setForm(false) }} />}
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title ?? ''} size="lg">
        {detail && (
          <div className="space-y-5">
            <p className="text-sm text-muted">{[labelOf(ANALYSIS_TYPES, detail.analysis_type), nameOf(detail.vehicle_id), formatDate(toLocalISO(new Date(detail.created_at)))].filter(Boolean).join(' · ')}</p>
            {detail.description && <p className="whitespace-pre-wrap text-sm">{detail.description}</p>}
            <div>
              <p className="mb-2 text-sm font-medium">Files</p>
              <ul className="space-y-2">
                {detail.files.map((f) => (
                  <li key={f.path} className="flex items-center gap-3 rounded-ctl border border-line p-2">
                    <Thumb file={f} />
                    <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                    <Button variant="secondary" size="sm" onClick={() => openPrivateFile('analysis-uploads', f.path, toast.error)}>Open</Button>
                  </li>
                ))}
              </ul>
            </div>
            {detailLive?.status === 'analyzed' && detailLive.result && <AnalysisResult result={detailLive.result} />}
            {runError && <p className="text-sm text-danger" role="alert">{runError}</p>}
            {detailLive?.status === 'failed' && !runError && <p className="text-sm text-danger" role="alert">The last analysis attempt failed. You can try again.</p>}
            {!ai.enabled
              ? <p className="rounded-ctl bg-surface-2 px-4 py-3 text-sm text-muted">AI features are turned off in Settings.</p>
              : <Button variant="secondary" onClick={() => runAnalysis(detail)} loading={running}><Sparkles className="h-4 w-4" />{detailLive?.status === 'analyzed' ? 'Run analysis again' : 'Analyze with AI'}</Button>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setDeleting(detail)} className="hover:!text-danger"><Trash2 className="h-4 w-4" />Delete</Button>
              {vehicles.length > 0
                ? <Button onClick={() => { setIssueFrom(detailLive?.result?.suggested_issue ? { ...detail, title: detailLive.result.suggested_issue.title, severity: detailLive.result.suggested_issue.severity, description: [detail.description, detailLive.result.summary].filter(Boolean).join('\n\n') } : detail); setDetail(null) }}>Create issue from this</Button>
                : <Link to="/vehicles/new" className="text-sm text-brand hover:underline">Add a vehicle to create an issue</Link>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(issueFrom)} onClose={() => setIssueFrom(null)} title="Create issue">
        {issueFrom && <IssueForm defaults={{ vehicle_id: issueFrom.vehicle_id ?? '', title: issueFrom.title, description: (issueFrom.description ?? '').slice(0, 2000), severity: issueFrom.severity }}
          onCancel={() => setIssueFrom(null)} onDone={() => { toast.success('Issue created'); setIssueFrom(null) }} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete submission?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message="The submission and its uploaded files will be permanently deleted." />
    </>
  )
}
