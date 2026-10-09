import { supabase } from '@/lib/supabase'
import { ANALYSIS_RULES, DOCUMENT_RULES, IMAGE_RULES, INVOICE_RULES, RECEIPT_RULES, removeFiles, uploadFile } from '@/lib/storage'

const IMAGES = 'vehicle-images'
const INVOICES = 'service-invoices'
const RECEIPTS = 'expense-receipts'
const DOCS = 'vehicle-documents'
const ANALYSES = 'analysis-uploads'

export function friendly(error, context) {
  const code = error?.code
  if (code === '23505' && context === 'vehicle') return 'A vehicle with this registration number already exists.'
  if (code === '23514') return 'One of the values is outside the allowed range. Check the form and try again.'
  if (code === '23503') return 'The linked vehicle no longer exists. Refresh and try again.'
  if (code === '42P01' || code === 'PGRST205') return 'Database tables are missing. Run migrations 002 and 003 in Supabase.'
  if (code === '54000') return error.message
  if (code === '42501') return "You don't have permission to do that."
  return error?.message || 'Something went wrong. Please try again.'
}

async function run(query, context) {
  const { data, error } = await query
  if (error) throw new Error(friendly(error, context))
  return data
}

// ── Vehicles ─────────────────────────────────────────────
export async function saveVehicle(userId, { id, values, imageFile, removeImage, oldImagePath }) {
  let image_path = oldImagePath ?? null
  if (imageFile) image_path = await uploadFile(IMAGES, userId, imageFile, IMAGE_RULES)
  else if (removeImage) image_path = null

  const row = { ...values, image_path }
  const query = id
    ? supabase.from('vehicles').update(row).eq('id', id).select().single()
    : supabase.from('vehicles').insert({ ...row, user_id: userId }).select().single()
  let saved
  try { saved = await run(query, 'vehicle') }
  catch (err) { if (imageFile) await removeFiles(IMAGES, [image_path]); throw err }

  if ((imageFile || removeImage) && oldImagePath) await removeFiles(IMAGES, [oldImagePath])
  return saved
}

export async function updateOdometer(vehicleId, odometer_km) {
  return run(supabase.from('vehicles').update({ odometer_km }).eq('id', vehicleId).select().single(), 'vehicle')
}

export async function appendVehicleNote(vehicle, note) {
  const stamp = new Date().toISOString().slice(0, 10)
  const next = [vehicle.notes, `${stamp}: ${note}`].filter(Boolean).join('\n')
  if (next.length > 2000) throw new Error('This vehicle\'s notes are full (2000 characters). Edit the vehicle to make room.')
  return run(supabase.from('vehicles').update({ notes: next }).eq('id', vehicle.id).select().single(), 'vehicle')
}

export async function deleteVehicle(vehicle, data) {
  await run(supabase.from('vehicles').delete().eq('id', vehicle.id))
  // Rows cascade in the database; remove the files they pointed at.
  const mine = (list) => list.filter((x) => x.vehicle_id === vehicle.id)
  await removeFiles(IMAGES, [vehicle.image_path])
  await removeFiles(INVOICES, mine(data.services).map((s) => s.invoice_path))
  await removeFiles(RECEIPTS, mine(data.expenses).map((e) => e.receipt_path))
  await removeFiles(DOCS, mine(data.documents).map((d) => d.file_path))
  await removeFiles(ANALYSES, mine(data.analyses).flatMap((a) => a.files.map((f) => f.path)))
}

// ── Service records ──────────────────────────────────────
export const partsTotal = (parts) => (parts || []).reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.cost) || 0), 0)

export async function saveService(userId, { id, values, invoiceFile, removeInvoice, oldInvoicePath }) {
  let invoice_path = oldInvoicePath ?? null
  if (invoiceFile) invoice_path = await uploadFile(INVOICES, userId, invoiceFile, INVOICE_RULES)
  else if (removeInvoice) invoice_path = null

  const total_cost = Math.round((Number(values.labour_cost || 0) + partsTotal(values.parts)) * 100) / 100
  const row = { ...values, total_cost, invoice_path }
  const query = id
    ? supabase.from('service_records').update(row).eq('id', id).select().single()
    : supabase.from('service_records').insert({ ...row, user_id: userId }).select().single()
  let saved
  try { saved = await run(query) }
  catch (err) { if (invoiceFile) await removeFiles(INVOICES, [invoice_path]); throw err }

  if ((invoiceFile || removeInvoice) && oldInvoicePath) await removeFiles(INVOICES, [oldInvoicePath])
  return saved
}

export async function deleteService(record) {
  await run(supabase.from('service_records').delete().eq('id', record.id))
  await removeFiles(INVOICES, [record.invoice_path])
}

// ── Maintenance tasks ────────────────────────────────────
export async function saveTask(userId, { id, values, existing }) {
  const completed_at = values.status === 'completed' ? existing?.completed_at ?? new Date().toISOString() : null
  const row = { ...values, completed_at }
  return run(id
    ? supabase.from('maintenance_tasks').update(row).eq('id', id).select().single()
    : supabase.from('maintenance_tasks').insert({ ...row, user_id: userId }).select().single())
}

export const setTaskStatus = (task, status) =>
  run(supabase.from('maintenance_tasks').update({
    status, completed_at: status === 'completed' ? task.completed_at ?? new Date().toISOString() : null,
  }).eq('id', task.id).select().single())

// ── Issues ───────────────────────────────────────────────
export async function saveIssue(userId, { id, values, existing }) {
  const resolved_at = values.status === 'resolved' ? existing?.resolved_at ?? new Date().toISOString() : null
  const row = { ...values, resolved_at }
  return run(id
    ? supabase.from('vehicle_issues').update(row).eq('id', id).select().single()
    : supabase.from('vehicle_issues').insert({ ...row, user_id: userId }).select().single())
}

export const setIssueStatus = (issue, status) =>
  run(supabase.from('vehicle_issues').update({
    status, resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', issue.id).select().single())

// ── Reminders ────────────────────────────────────────────
export const saveReminder = (userId, { id, values }) =>
  run(id
    ? supabase.from('reminders').update(values).eq('id', id).select().single()
    : supabase.from('reminders').insert({ ...values, user_id: userId }).select().single())

export const setReminderStatus = (id, status) => run(supabase.from('reminders').update({ status }).eq('id', id).select().single())

// ── Generic delete ───────────────────────────────────────
export const deleteRow = (table, id) => run(supabase.from(table).delete().eq('id', id))

// ── Expenses ─────────────────────────────────────────────
export async function saveExpense(userId, { id, values, receiptFile, removeReceipt, oldReceiptPath }) {
  let receipt_path = oldReceiptPath ?? null
  if (receiptFile) receipt_path = await uploadFile(RECEIPTS, userId, receiptFile, RECEIPT_RULES)
  else if (removeReceipt) receipt_path = null
  const row = { ...values, receipt_path }
  const query = id
    ? supabase.from('expenses').update(row).eq('id', id).select().single()
    : supabase.from('expenses').insert({ ...row, user_id: userId }).select().single()
  let saved
  try { saved = await run(query) } catch (err) { if (receiptFile) await removeFiles(RECEIPTS, [receipt_path]); throw err }
  if ((receiptFile || removeReceipt) && oldReceiptPath) await removeFiles(RECEIPTS, [oldReceiptPath])
  return saved
}

export async function deleteExpense(expense) {
  await run(supabase.from('expenses').delete().eq('id', expense.id))
  await removeFiles(RECEIPTS, [expense.receipt_path])
}

// ── Documents ────────────────────────────────────────────
export async function uploadDocument(userId, { file, values }) {
  const file_path = await uploadFile(DOCS, userId, file, DOCUMENT_RULES)
  try {
    return await run(supabase.from('vehicle_documents').insert({
      ...values, user_id: userId, file_path, file_name: file.name.slice(0, 255), mime_type: file.type, size_bytes: file.size,
    }).select().single())
  } catch (err) { await removeFiles(DOCS, [file_path]); throw err }
}

export const updateDocument = (id, values) => run(supabase.from('vehicle_documents').update(values).eq('id', id).select().single())

export async function deleteDocument(doc) {
  await run(supabase.from('vehicle_documents').delete().eq('id', doc.id))
  await removeFiles(DOCS, [doc.file_path])
}

// ── Analyzer submissions ─────────────────────────────────
export async function createAnalysis(userId, { values, files }) {
  const uploaded = []
  try {
    for (const f of files) {
      const path = await uploadFile(ANALYSES, userId, f, ANALYSIS_RULES)
      uploaded.push({ path, name: f.name.slice(0, 255), type: f.type, size: f.size })
    }
    return await run(supabase.from('analyses').insert({ ...values, user_id: userId, files: uploaded }).select().single())
  } catch (err) {
    await removeFiles(ANALYSES, uploaded.map((u) => u.path))
    throw err
  }
}

export async function deleteAnalysis(analysis) {
  await run(supabase.from('analyses').delete().eq('id', analysis.id))
  await removeFiles(ANALYSES, analysis.files.map((f) => f.path))
}
