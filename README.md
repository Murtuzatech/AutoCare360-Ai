# AutoCare 360

AI-powered vehicle health and service management. A **Vite + React** web app backed by **Supabase** (Postgres, Auth, Storage, Row Level Security) with **Google Gemini** behind a secure Edge Function.

## What it does
- **Vehicles**: multiple vehicles, photos, insurance / PUC / warranty dates, health score, timeline
- **Service & maintenance**: service records with parts, labour and invoices; maintenance tasks; issue tracking
- **Expenses & analytics**: eight categories, receipts, monthly trend, category and vehicle breakdowns
- **Documents**: private storage, search, preview, download
- **Reports**: five PDF reports (summary, health, service, maintenance, expenses), with optional AI summary
- **Reminders**: derived automatically from your records, plus your own
- **AI Assistant**: streaming chat that uses your real records, proposes actions you confirm, suggests learning videos
- **Analyzer**: AI-assisted reading of photos and documents, always with confidence and limits stated
- **Privacy**: per-user data isolation, AI on/off and data-sharing switches, full JSON export, account deletion

## Quick start
```bash
npm install
cp .env.example .env        # then fill in the two Supabase values
npm run dev                 # http://localhost:5173
```
Prerequisites: Node 18.18+ and a free Supabase project.

## Setup in four steps

**1. Database.** Supabase → SQL Editor → paste all of `supabase/setup_all.sql` → Run. (It is the five files in `supabase/migrations/` joined in order; either way works.) Then run `supabase/verify.sql` to confirm.

**2. Auth settings.** Supabase → Authentication → URL Configuration: set *Site URL* to your app URL and add `http://localhost:5173/**` and your production URL under *Redirect URLs*. For quick local testing you can turn off *Confirm email*; turn it back on for production.

**3. Environment.** Fill `.env` (see `.env.example`).

**4. AI (optional but recommended).** Follow `docs/AI_SETUP.md`: get a Gemini key, then deploy the `ai` Edge Function with three commands. Without it the rest of the app works; AI screens show a clear "not set up" message.

## Environment variables and secrets
| Name | Where | Visibility | Required |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` / Vercel | public | yes |
| `VITE_SUPABASE_ANON_KEY` | `.env` / Vercel | public (RLS-protected) | yes |
| `GEMINI_API_KEY` | Supabase secret | **server only** | for AI |
| `GEMINI_MODEL` | Supabase secret | server only | no (default `gemini-flash-latest`) |
| `YOUTUBE_API_KEY` | Supabase secret | server only | no (video suggestions) |
| `ALLOWED_ORIGIN` | Supabase secret | server only | no (recommended: your site URL) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the Edge Function automatically by Supabase. They are never in this repository.

## Deploy to Vercel
1. Push this folder to a Git repository and import it in Vercel (framework: **Vite**; build `npm run build`; output `dist`).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under *Settings → Environment Variables* (all environments), then deploy.
3. In Supabase add your Vercel URL to *Redirect URLs* and set it as *Site URL*.
4. Optionally restrict the Edge Function: `npx supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app --project-ref <ref>`.

`vercel.json` already provides the SPA fallback, long-lived caching for hashed assets, and security headers including a strict Content-Security-Policy. If you use a custom Supabase domain, add it to `connect-src` and `img-src` in that file.

## Scripts
| Command | Does |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` / `preview` | production build / serve it locally |
| `npm run lint` | ESLint |
| `npm test` | 60 tests: logic, PDF reports, Edge Function modules, AI client, every route and key flows |
| `npm run test:sql` | runs all migrations on a real Postgres engine and attacks the RLS rules |
| `npm run check` | lint + tests + build |

## Project structure
```
src/
  contexts/    Auth, Theme, Toast, Garage (all vehicle data, loaded once and paged)
  services/    every database/storage write
  lib/         health score, reminders, timeline, expenses ledger, reports (models + PDF), AI client
  hooks/       forms, chat, focus trap, page titles, reminders
  components/  ui kit, layout shell, vehicles, service, expenses, documents, analyzer, assistant, reports
  pages/       one file per route (loaded on demand)
supabase/
  migrations/  001–005   setup_all.sql   verify.sql
  functions/   ai/ (router)   _shared/ (provider, gemini, safety, prompts, tools, context, analysis)
tests/         unit, full-app flows, SQL/RLS suite
docs/          AI_SETUP.md  SECURITY.md  QA_CHECKLIST.md
```

## How the pieces fit
- The browser talks to Supabase directly for data. **Row Level Security** on every table means a user can only ever read or write their own rows; composite foreign keys also stop a record pointing at another user's vehicle.
- The browser talks to the `ai` Edge Function for anything involving Gemini. The function verifies the user's session, reads their data *through their own permissions*, enforces their AI preferences and rate limits, calls Gemini with a server-side key, and stores results. It never edits vehicle data: it only **proposes** actions, which appear as cards the user must confirm.
- The provider is abstracted (`supabase/functions/_shared/provider.ts`); adding another model means implementing one interface.

See `docs/SECURITY.md` for the full security model and `docs/QA_CHECKLIST.md` for a manual release checklist.

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Connect Supabase to continue" screen | `.env` missing or dev server not restarted |
| "Database tables are missing" | run `supabase/setup_all.sql` |
| Email links go to the wrong place | fix *Site URL* / *Redirect URLs* in Supabase Auth |
| "AI service isn't set up yet" | deploy the Edge Function (`docs/AI_SETUP.md`) |
| "rejected the request" from AI | check `GEMINI_API_KEY` / `GEMINI_MODEL`; `npx supabase functions logs ai --project-ref <ref>` |
| Uploads fail | confirm the migrations created the six storage buckets (`verify.sql`) |
