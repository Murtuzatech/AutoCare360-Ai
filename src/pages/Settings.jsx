import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGarage } from '@/contexts/GarageContext'
import { callAi } from '@/lib/ai'
import { fetchAll } from '@/lib/db'
import { Modal } from '@/components/ui/Modal'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader, Segmented } from '@/components/ui/Controls'
import { Toggle } from '@/components/ui/Controls'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'

export default function Settings() {
  const { profile, user, updatePreferences, updatePassword, signOut } = useAuth()
  const { preference, setTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const garage = useGarage()
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const prefs = profile.preferences
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState('')

  const save = async (patch) => {
    try { await updatePreferences(patch) }
    catch (err) { toast.error(err.message || 'Could not save setting') }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwError(''); setPwBusy(true)
    const { error } = await updatePassword(pw.next)
    setPwBusy(false)
    if (error) { setPwError(error.message); return }
    setPw({ next: '', confirm: '' })
    toast.success('Password updated')
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const [conversations, messages] = await Promise.all([fetchAll('conversations'), fetchAll('messages', { ascending: true })])
      const { vehicles, services, tasks, issues, reminders, expenses, documents, analyses } = garage
      const payload = {
        exported_at: new Date().toISOString(), account: { id: user.id, email: user.email }, profile,
        vehicles, service_records: services, maintenance_tasks: tasks, vehicle_issues: issues, reminders, expenses,
        documents: documents.map(({ file_path: _path, ...d }) => d), // metadata only; files stay in your private storage
        analyzer_submissions: analyses.map(({ files, ...a }) => ({ ...a, files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })) })),
        conversations: conversations.data ?? [], messages: messages.data ?? [],
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'autocare360-data.json' })
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch { toast.error('Could not export your data. Please try again.') }
    finally { setExporting(false) }
  }

  const deleteAccount = async () => {
    setDeleting(true); setDeleteError('')
    try {
      await callAi({ action: 'delete_account', confirm: 'DELETE' })
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) { setDeleteError(err.message); setDeleting(false) }
  }

  const n = prefs.notifications
  const ai = prefs.ai

  return (
    <>
      <PageHeader title="Settings" description="Appearance, reminders, AI and account." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Appearance" description="Saved on this device." />
          <CardBody>
            <Segmented label="Theme" value={preference} onChange={setTheme}
              options={[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="Choose which reminders appear in Notifications and the bell." />
          <CardBody className="divide-y divide-line py-2">
            <Toggle label="Service due" checked={n.service} onChange={(v) => save({ notifications: { service: v } })} />
            <Toggle label="Insurance expiry" checked={n.insurance} onChange={(v) => save({ notifications: { insurance: v } })} />
            <Toggle label="PUC expiry" checked={n.puc} onChange={(v) => save({ notifications: { puc: v } })} />
            <Toggle label="Warranty expiry" checked={n.warranty} onChange={(v) => save({ notifications: { warranty: v } })} />
            <Toggle label="Email reminders" description="Emailed reminders aren't available yet. This only saves your preference." checked={n.email} onChange={(v) => save({ notifications: { email: v } })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI preferences" description="Controls the AI Assistant, Analyzer, insights and report summaries." />
          <CardBody className="space-y-2">
            <Toggle label="Enable AI features" checked={ai.enabled} onChange={(v) => save({ ai: { enabled: v } })} />
            <Select label="Response style" value={ai.style} disabled={!ai.enabled} onChange={(e) => save({ ai: { style: e.target.value } })}>
              <option value="concise">Concise</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Privacy" />
          <CardBody>
            <Toggle label="Let AI use my vehicle data" description="When on, the AI can read your vehicles, services, issues and spending to give relevant answers. Relevant records are sent to Google Gemini to produce each answer. The AI never changes anything without your confirmation."
              checked={ai.useVehicleContext} disabled={!ai.enabled} onChange={(v) => save({ ai: { useVehicleContext: v } })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <CardBody>
            <form onSubmit={changePassword} className="space-y-4">
              {pwError && <Alert>{pwError}</Alert>}
              <Input label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                error={pw.next && pw.next.length < 8 ? 'Use at least 8 characters.' : ''} />
              <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                error={pw.confirm && pw.next !== pw.confirm ? 'Passwords do not match.' : ''} />
              <Button type="submit" loading={pwBusy} disabled={pw.next.length < 8 || pw.next !== pw.confirm}>Update password</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Data & account" />
          <CardBody className="space-y-5">
            <div>
              <p className="text-sm font-medium">Export your data</p>
              <p className="mt-0.5 text-sm text-muted">Download everything in your account as JSON: profile, vehicles, services, tasks, issues, reminders, expenses, document details and AI conversations. Uploaded files are not included.</p>
              <Button variant="secondary" className="mt-3" onClick={exportData} loading={exporting}><Download className="h-4 w-4" />Export data</Button>
            </div>
            <div className="border-t border-line pt-5">
              <Button variant="secondary" onClick={async () => { await signOut(); navigate('/login') }}><LogOut className="h-4 w-4" />Sign out</Button>
            </div>
            <div className="border-t border-line pt-5">
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="mt-0.5 text-sm text-muted">Permanently deletes your account, all vehicles and records, uploaded files and AI conversations. This can't be undone.</p>
              <Button variant="danger" className="mt-3" onClick={() => { setConfirmText(''); setDeleteError(''); setDeleteOpen(true) }}><Trash2 className="h-4 w-4" />Delete my account</Button>
            </div>
          </CardBody>
        </Card>
      </div>
      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete your account?">
        <p className="text-sm text-muted">Everything will be erased immediately and permanently. Consider exporting your data first.</p>
        <div className="mt-4"><Input label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" /></div>
        {deleteError && <div className="mt-3"><Alert>{deleteError}</Alert></div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={deleteAccount} loading={deleting} disabled={confirmText !== 'DELETE'}>Delete everything</Button>
        </div>
      </Modal>
    </>
  )
}
