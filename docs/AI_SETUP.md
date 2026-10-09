# AI setup (Phase 4)

The browser never sees the Gemini key. The app calls a Supabase Edge Function named `ai`, which holds the key as a server-side secret, reads the signed-in user's data through Row Level Security, and calls Gemini.

## 1. Run the SQL
Supabase → SQL Editor → run `supabase/setup_all.sql` (includes the AI tables from `004_ai.sql` and the hardening in `005_hardening.sql`). If you already ran 001–003, run `004_ai.sql` then `005_hardening.sql`.

## 2. Get a Gemini API key
Google AI Studio → https://aistudio.google.com/apikey → Create API key.
Use a paid-tier key if you want Google not to use prompts to improve its products (check Google's current Gemini API terms).

## 3. Deploy the function (from the project folder)
Replace `<ref>` with your project reference ID (Supabase → Project Settings → General → Reference ID).

```
npx supabase login
npx supabase secrets set GEMINI_API_KEY=PASTE_YOUR_KEY --project-ref <ref>
npx supabase functions deploy ai --project-ref <ref>
```
If the deploy asks for Docker, run it again with `--use-api`.

Optional secrets (same command style):
- `GEMINI_MODEL` model name (default `gemini-flash-latest`). Set it if Google retires that alias.
- `YOUTUBE_API_KEY` YouTube Data API v3 key for video suggestions (Google Cloud Console → enable "YouTube Data API v3" → create key). Without it, chat shows a "Search YouTube" link instead.
- `ALLOWED_ORIGIN` your site URL to restrict browser access.

## 4. Check it
Sign in → AI Assistant → ask "What can you help me with?". If you see "AI service isn't set up yet", the function is not deployed; if you see "rejected the request", check the key and model name (`npx supabase functions logs ai --project-ref <ref>`).

## Account deletion
The same function also handles **Settings → Delete account** (it needs the service role to remove files and the auth user). It works even if AI features are switched off, but needs the function deployed.

## Where things live
| Piece | Location | Runs |
|---|---|---|
| Gemini key | Supabase secret `GEMINI_API_KEY` | server only |
| Edge Function | `supabase/functions/ai/index.ts` | server |
| Provider abstraction | `supabase/functions/_shared/provider.ts`, `gemini.ts` | server |
| Safety screen, prompts, tools, context | `supabase/functions/_shared/*` | server |
| Chat UI, action cards | `src/components/assistant/`, `src/pages/Assistant.jsx` | browser |
