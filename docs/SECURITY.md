# Security model

## Principles
1. **No secrets in the browser.** Only the Supabase URL and anon key are shipped. The anon key is designed to be public; it grants nothing beyond what Row Level Security allows.
2. **The database is the security boundary.** Every table has RLS; the app's own checks are for usability, not protection.
3. **AI never writes your data.** It proposes; you confirm in the normal validated forms.

## Row Level Security (12 tables)
| Table | Browser can | Notes |
|---|---|---|
| `profiles` | read own; update `full_name`, `avatar_path`, `preferences` only | `email` is trigger-maintained; preferences capped at 16 kB |
| `vehicles`, `service_records`, `maintenance_tasks`, `vehicle_issues`, `reminders`, `expenses`, `vehicle_documents` | full CRUD on own rows | child rows use a composite FK `(vehicle_id, user_id)` so they cannot reference another user's vehicle |
| `analyses` | create/read/delete own; update title/description/vehicle | **cannot write `status` or `result`** (column grants), so AI output cannot be forged |
| `conversations`, `messages` | read/delete own; rename conversation; update a message's `actions` (confirmation state) | **cannot insert**, so assistant replies cannot be forged; created by the Edge Function |
| `ai_usage` | nothing | rate-limit table, RLS on with no policies |

Per-user row caps (migration 005) bound storage abuse: 50 vehicles, 5,000 services, 20,000 expenses, and similar limits elsewhere.

## Storage
Six **private** buckets (`avatars`, `vehicle-images`, `service-invoices`, `expense-receipts`, `vehicle-documents`, `analysis-uploads`). Objects live at `<user_id>/<file>` and policies require the first folder to equal `auth.uid()`. Bucket-level MIME and size limits are enforced by Supabase. Files are served through short-lived signed URLs.

## Edge Function (`ai`)
- Verifies the caller's JWT and builds a **user-scoped** client for all reads, so RLS applies. The service-role client is used only to store messages/results, verify rate limits, and delete an account.
- Enforces the user's *Enable AI* and *Let AI use my vehicle data* settings on the server.
- Per-user hourly limits per feature; input length caps; file size caps.
- Prompt-injection hygiene: user text is wrapped as data with an explicit instruction not to follow it; tool calls are validated against the user's real vehicle IDs; output is length-clamped and enum-checked; markdown images from model output are never rendered (blocks tracking-pixel exfiltration).
- A deterministic safety screen (brake/steering failure, fire/smoke, fuel leak, overheating, tyre blowout, fumes, battery hazard) runs on the user's message *before* the model and forces a safety notice regardless of model behaviour.
- Upstream errors are mapped to safe messages; keys are redacted from logs.

## Browser hardening (`vercel.json`)
Content-Security-Policy (self + Supabase + fonts + YouTube thumbnails; no inline scripts, no frames, no objects), `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, HSTS, restrictive Permissions-Policy. No `dangerouslySetInnerHTML` anywhere; markdown is rendered without raw HTML.

## What is NOT covered / your responsibilities
- Keep `ALLOWED_ORIGIN` set to your site in production.
- Turn **Confirm email** on and consider password-strength / CAPTCHA settings in Supabase Auth.
- Gemini API terms: free-tier keys may allow Google to use prompts to improve products; use a paid-tier key if that matters. Check Google's current terms.
- Back up your database (Supabase offers scheduled backups on paid plans).
- Review rate limits against your expected traffic.
