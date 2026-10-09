// Deterministic safety screen. It runs on the user's words BEFORE the model and does not depend on
// the model behaving well: matches raise a banner in the UI and force safety-first guidance.
export interface SafetyResult { critical: boolean; categories: { id: string; label: string }[] }

const RULES: { id: string; label: string; re: RegExp }[] = [
  { id: 'brakes', label: 'Brake failure',
    re: /\b(brakes?|braking)\b[^.!?\n]{0,60}\b(fail(?:ed|ing|ure|s)?|gone|not working|stopped working|no pressure|(?:went|goes|going) to the floor|won'?t stop|not stopping)\b|\b(can'?t|cannot|unable to) (?:stop|brake)\b/i },
  { id: 'steering', label: 'Steering problem',
    re: /\bsteering\b[^.!?\n]{0,60}\b(lock(?:ed|ing|s)?|failed|failure|not responding|jammed|stuck)\b|\blost (?:steering|control)\b/i },
  { id: 'fire', label: 'Smoke or fire',
    re: /\b(on fire|caught fire|catching fire|flames?|smoke (?:from|coming)|smoking (?:engine|bonnet|hood)|burning smell|smells? (?:of )?burning|electrical fire)\b/i },
  { id: 'fuel', label: 'Fuel leak',
    re: /\b(fuel|petrol|diesel|gasoline)\b[^.!?\n]{0,40}\b(leak(?:ing|s)?|dripping|pouring)\b|\bsmell(?:s)? (?:of )?(?:petrol|fuel|diesel|gasoline)\b/i },
  { id: 'overheat', label: 'Severe overheating',
    re: /\b(steam)\b[^.!?\n]{0,40}\b(bonnet|hood|engine|radiator)\b|\bengine\b[^.!?\n]{0,30}\b(overheat(?:ing|ed)|boiling)\b|\bcoolant\b[^.!?\n]{0,30}\b(boiling|steaming)\b/i },
  { id: 'tyre', label: 'Tyre failure',
    re: /\b(tyre|tire)\b[^.!?\n]{0,40}\b(blow(?:n)?[ -]?out|burst|bulge|bulging|shredded|delaminat\w+)\b|\bblow[ -]?out\b/i },
  { id: 'fumes', label: 'Exhaust fumes in cabin',
    re: /\bexhaust (?:fumes?|smell)\b[^.!?\n]{0,40}\b(cabin|inside|interior)\b|\bcarbon monoxide\b/i },
  { id: 'ev_battery', label: 'Battery hazard',
    re: /\b(?:hv|high[- ]?voltage|traction|ev)? ?battery\b[^.!?\n]{0,40}\b(swelling|swollen|thermal runaway|hissing|smoking|on fire)\b/i },
]

export function detectSafety(text: string): SafetyResult {
  const categories = RULES.filter((r) => r.re.test(text)).map(({ id, label }) => ({ id, label }))
  return { critical: categories.length > 0, categories }
}
