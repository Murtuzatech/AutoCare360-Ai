import type { ToolDeclaration } from './provider.ts'

export const TASK_CATEGORIES = ['engine', 'brakes', 'tyres', 'battery', 'fluids', 'ac', 'electrical', 'suspension', 'transmission', 'general']
export const SEVERITIES = ['low', 'medium', 'high', 'critical']
export const REPORT_TYPES = ['summary', 'health', 'service', 'maintenance', 'expense']

const vehicleId = { type: 'string', description: 'The id of the vehicle, copied exactly from the records.' }

// These are PROPOSALS. The server never writes user data; the app shows each one as a card the user must confirm.
export const TOOLS: ToolDeclaration[] = [
  { name: 'propose_maintenance_task', description: 'Propose adding a maintenance task to a vehicle. Use when you recommend a concrete inspection or job.',
    parameters: { type: 'object', required: ['vehicle_id', 'title', 'category'], properties: {
      vehicle_id: vehicleId, title: { type: 'string', description: 'Short task title, max 120 characters.' },
      category: { type: 'string', enum: TASK_CATEGORIES }, due_date: { type: 'string', description: 'Optional date YYYY-MM-DD.' },
      notes: { type: 'string', description: 'Optional short notes.' } } } },
  { name: 'propose_issue', description: 'Propose logging a vehicle issue the user has described (noise, leak, warning light, etc.).',
    parameters: { type: 'object', required: ['vehicle_id', 'title', 'severity'], properties: {
      vehicle_id: vehicleId, title: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string', enum: SEVERITIES } } } },
  { name: 'propose_reminder', description: 'Propose a dated reminder.',
    parameters: { type: 'object', required: ['title', 'due_date'], properties: {
      title: { type: 'string' }, due_date: { type: 'string', description: 'YYYY-MM-DD' }, vehicle_id: vehicleId, notes: { type: 'string' } } } },
  { name: 'propose_vehicle_note', description: 'Propose appending a short note to a vehicle record.',
    parameters: { type: 'object', required: ['vehicle_id', 'note'], properties: { vehicle_id: vehicleId, note: { type: 'string' } } } },
  { name: 'propose_report', description: 'Offer to generate a PDF report for the user.',
    parameters: { type: 'object', required: ['report_type'], properties: { report_type: { type: 'string', enum: REPORT_TYPES }, vehicle_id: vehicleId } } },
  { name: 'suggest_learning', description: 'Suggest educational videos or guides about a topic the user is dealing with. Use sparingly, only when learning material would genuinely help.',
    parameters: { type: 'object', required: ['topic'], properties: { topic: { type: 'string', description: 'A short search phrase, e.g. "how to check brake pads".' } } } },
]

const clip = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

export interface Proposal { type: 'maintenance_task' | 'issue' | 'reminder' | 'vehicle_note' | 'report'; args: Record<string, unknown> }

/** Validates a model-produced tool call against the user's real vehicles. Returns null if unusable. */
export function validateProposal(name: string, raw: Record<string, unknown>, vehicleIds: string[]): Proposal | null {
  const vid = typeof raw.vehicle_id === 'string' && vehicleIds.includes(raw.vehicle_id) ? raw.vehicle_id : null
  switch (name) {
    case 'propose_maintenance_task': {
      const title = clip(raw.title, 120)
      if (!vid || !title) return null
      const category = TASK_CATEGORIES.includes(String(raw.category)) ? String(raw.category) : 'general'
      return { type: 'maintenance_task', args: { vehicle_id: vid, title, category, due_date: isDate(raw.due_date) ? raw.due_date : null, notes: clip(raw.notes, 500) || null } }
    }
    case 'propose_issue': {
      const title = clip(raw.title, 120)
      if (!vid || !title) return null
      const severity = SEVERITIES.includes(String(raw.severity)) ? String(raw.severity) : 'medium'
      return { type: 'issue', args: { vehicle_id: vid, title, description: clip(raw.description, 1000) || null, severity } }
    }
    case 'propose_reminder': {
      const title = clip(raw.title, 120)
      if (!title || !isDate(raw.due_date)) return null
      return { type: 'reminder', args: { title, due_date: raw.due_date, vehicle_id: vid, notes: clip(raw.notes, 500) || null } }
    }
    case 'propose_vehicle_note': {
      const note = clip(raw.note, 500)
      if (!vid || !note) return null
      return { type: 'vehicle_note', args: { vehicle_id: vid, note } }
    }
    case 'propose_report': {
      if (!REPORT_TYPES.includes(String(raw.report_type))) return null
      const needsVehicle = String(raw.report_type) !== 'expense'
      if (needsVehicle && !vid) return null
      return { type: 'report', args: { report_type: raw.report_type, vehicle_id: vid } }
    }
    default: return null
  }
}
