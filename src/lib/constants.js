export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' }, { value: 'cng', label: 'CNG' },
  { value: 'lpg', label: 'LPG' }, { value: 'electric', label: 'Electric' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'other', label: 'Other' },
]
export const TRANSMISSIONS = [
  { value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }, { value: 'cvt', label: 'CVT' },
  { value: 'dct', label: 'DCT' }, { value: 'amt', label: 'AMT' }, { value: 'other', label: 'Other' },
]
export const SERVICE_TYPES = [
  { value: 'routine', label: 'Routine service' }, { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' }, { value: 'other', label: 'Other' },
]
export const TASK_CATEGORIES = [
  { value: 'engine', label: 'Engine' }, { value: 'brakes', label: 'Brakes' }, { value: 'tyres', label: 'Tyres' },
  { value: 'battery', label: 'Battery' }, { value: 'fluids', label: 'Fluids' }, { value: 'ac', label: 'AC' },
  { value: 'electrical', label: 'Electrical' }, { value: 'suspension', label: 'Suspension' },
  { value: 'transmission', label: 'Transmission' }, { value: 'general', label: 'General maintenance' },
]
export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }, { value: 'skipped', label: 'Skipped' },
]
export const ISSUE_SEVERITIES = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
]
export const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? value ?? '—'

export const EXPENSE_CATEGORIES = [
  { value: 'fuel', label: 'Fuel', color: '#d98324' },
  { value: 'service', label: 'Service', color: '#2f8f9d' },
  { value: 'repairs', label: 'Repairs', color: '#c9504f' },
  { value: 'parts', label: 'Parts', color: '#7a6bc4' },
  { value: 'insurance', label: 'Insurance', color: '#3f7fd0' },
  { value: 'taxes', label: 'Taxes', color: '#8a8f98' },
  { value: 'accessories', label: 'Accessories', color: '#c46aa0' },
  { value: 'other', label: 'Other', color: '#6aa56a' },
]
export const DOCUMENT_CATEGORIES = [
  { value: 'insurance', label: 'Insurance' }, { value: 'puc', label: 'PUC' }, { value: 'invoice', label: 'Service invoice' },
  { value: 'purchase', label: 'Purchase' }, { value: 'warranty', label: 'Warranty' }, { value: 'manual', label: 'Manual' }, { value: 'other', label: 'Other' },
]
export const ANALYSIS_TYPES = [
  { value: 'warning_light', label: 'Warning light', hint: 'A photo of a dashboard warning light or message' },
  { value: 'damage', label: 'Damage', hint: 'Dents, scratches, cracks or accident damage' },
  { value: 'component', label: 'Component', hint: 'A part, leak, wear or something under the bonnet' },
  { value: 'document', label: 'Document', hint: 'Insurance, registration or other paperwork' },
  { value: 'invoice', label: 'Invoice', hint: 'A service or repair invoice' },
  { value: 'general', label: 'General problem', hint: 'Anything else you want to record' },
]
