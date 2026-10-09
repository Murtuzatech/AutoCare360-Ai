import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, FileImage, FileText, FolderOpen, Plus, Search } from 'lucide-react'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Controls'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { IconActions, openPrivateFile } from '@/components/common/Bits'
import { DOCUMENT_CATEGORIES, labelOf } from '@/lib/constants'
import { formatDate, formatFileSize, toLocalISO } from '@/lib/format'
import { getDownloadUrl, getSignedUrl } from '@/lib/storage'
import { DocumentForm } from './DocumentForm'

const isImage = (type) => type?.startsWith('image/')
const typeFromName = (name = '') => (/\.(jpe?g)$/i.test(name) ? 'image/jpeg' : /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : /\.pdf$/i.test(name) ? 'application/pdf' : '')

export default function DocumentsSection({ vehicleId, startOpen, onOpened }) {
  const { vehicles, documents, services, actions } = useGarage()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => { if (startOpen) { setForm({}); onOpened?.() } }, [startOpen])  

  const nameOf = (id) => vehicles.find((v) => v.id === id)?.nickname
  const scope = vehicleId ?? (vehicleFilter === 'all' ? null : vehicleFilter)

  // Service invoices attached to service records show up here too (managed from the service record).
  const items = useMemo(() => {
    const own = documents.map((d) => ({ ...d, bucket: 'vehicle-documents', virtual: false }))
    const invoices = services.filter((s) => s.invoice_path).map((s) => ({
      id: `inv:${s.id}`, virtual: true, bucket: 'service-invoices', file_path: s.invoice_path, vehicle_id: s.vehicle_id,
      title: `Service invoice, ${formatDate(s.service_date)}`, category: 'invoice', file_name: 'invoice', mime_type: typeFromName(s.invoice_path),
      size_bytes: null, notes: s.service_center, created_at: s.created_at,
    }))
    return [...own, ...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [documents, services])

  const list = items.filter((d) => {
    if (scope && d.vehicle_id !== scope) return false
    if (category !== 'all' && d.category !== category) return false
    const q = query.trim().toLowerCase()
    return !q || [d.title, d.file_name, d.notes, labelOf(DOCUMENT_CATEGORIES, d.category), nameOf(d.vehicle_id)].some((t) => t?.toLowerCase().includes(q))
  })

  const view = async (d) => {
    if (isImage(d.mime_type)) {
      try { setPreview({ title: d.title, url: await getSignedUrl(d.bucket, d.file_path) }) } catch { toast.error('Could not open the file.') }
    } else openPrivateFile(d.bucket, d.file_path, toast.error)
  }
  const download = async (d) => {
    try {
      const url = await getDownloadUrl(d.bucket, d.file_path, d.virtual ? `${d.title}${d.file_path.match(/\.[^.]+$/)?.[0] ?? ''}` : d.file_name)
      Object.assign(document.createElement('a'), { href: url }).click()
    } catch { toast.error('Could not download the file.') }
  }
  const confirmDelete = async () => {
    setBusy(true)
    try { await actions.deleteDocument(deleting); toast.success('Document deleted'); setDeleting(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="doc-search" className="sr-only">Search documents</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="doc-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents"
            className="h-10 w-full rounded-ctl border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted/70" />
        </div>
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-40">
          <option value="all">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        {!vehicleId && vehicles.length > 1 && (
          <Select aria-label="Vehicle" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="w-44">
            <option value="all">All vehicles</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
          </Select>
        )}
        <div className="flex-1" />
        <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />Upload</Button>
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon={FolderOpen} title={items.length ? 'No documents match' : 'No documents yet'}
          description={items.length ? 'Try a different search or filter.' : 'Keep insurance, PUC certificates, invoices and manuals together and find them in seconds.'}
          action={items.length ? null : <Button onClick={() => setForm({})}>Upload a document</Button>} /></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((d) => {
              const Icon = isImage(d.mime_type) ? FileImage : FileText
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-surface-2 text-muted"><Icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
                      <Badge>{labelOf(DOCUMENT_CATEGORIES, d.category)}</Badge>
                      {!vehicleId && d.vehicle_id && <span>{nameOf(d.vehicle_id)}</span>}
                      <span>{formatDate(toLocalISO(new Date(d.created_at)))}</span>
                      {d.size_bytes != null && <span>{formatFileSize(d.size_bytes)}</span>}
                      {d.virtual && <Link to={`/vehicles/${d.vehicle_id}?tab=service`} className="text-brand hover:underline">From service record</Link>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button onClick={() => view(d)} aria-label={`View ${d.title}`} className="flex h-8 w-8 items-center justify-center rounded-ctl text-muted hover:bg-surface-2 hover:text-ink"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => download(d)} aria-label={`Download ${d.title}`} className="flex h-8 w-8 items-center justify-center rounded-ctl text-muted hover:bg-surface-2 hover:text-ink"><Download className="h-4 w-4" /></button>
                    {!d.virtual && <IconActions label={d.title} onEdit={() => setForm({ doc: d })} onDelete={() => setDeleting(d)} />}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.doc ? 'Edit document' : 'Upload document'}>
        {form && <DocumentForm doc={form.doc} vehicleId={vehicleId} onCancel={() => setForm(null)}
          onDone={() => { toast.success(form.doc ? 'Document saved' : 'Document uploaded'); setForm(null) }} />}
      </Modal>
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.title ?? ''} size="lg">
        {preview && <img src={preview.url} alt={preview.title} className="mx-auto max-h-[70vh] rounded-ctl object-contain" />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete document?" busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={`"${deleting?.title ?? ''}" and its file will be permanently deleted.`} />
    </div>
  )
}
