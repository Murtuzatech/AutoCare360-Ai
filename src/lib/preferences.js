export const DEFAULT_PREFERENCES = {
  units: { distance: 'km', currency: 'INR' },
  notifications: { service: true, insurance: true, puc: true, warranty: true, email: false },
  ai: { enabled: true, useVehicleContext: true, style: 'balanced' },
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

export function mergeDeep(base, patch) {
  const out = { ...base }
  for (const key of Object.keys(patch || {})) {
    out[key] = isObj(patch[key]) && isObj(base?.[key]) ? mergeDeep(base[key], patch[key]) : patch[key]
  }
  return out
}

export const withDefaults = (stored) => mergeDeep(DEFAULT_PREFERENCES, stored || {})
