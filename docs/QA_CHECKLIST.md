# Manual release checklist

Automated checks (`npm run check`, `npm run test:sql`) cover logic, every route, key flows and RLS. This list is for what only a person with a real project can confirm.

## Environment
- [ ] `setup_all.sql` ran; `verify.sql` shows no table without RLS, 6 private buckets, 8 row-limit triggers
- [ ] Auth: Site URL and Redirect URLs set; Confirm email on
- [ ] Vercel env vars set; deployed site loads over HTTPS
- [ ] Edge Function deployed; `GEMINI_API_KEY` set; `ALLOWED_ORIGIN` set

## Accounts
- [ ] Sign up, confirm email, sign in, sign out
- [ ] Forgot password email arrives and the link works
- [ ] Change password; delete a throwaway account (confirm its files are gone in Storage)
- [ ] Second account cannot see the first account's data or files

## Core
- [ ] Add a vehicle with photo; edit; delete (data and files disappear)
- [ ] Add a service with parts and invoice; odometer updates; open invoice
- [ ] Add task, change status; log and resolve an issue
- [ ] Add expenses with a receipt; charts and transactions update; toggle "include service records"
- [ ] Upload, preview, download and delete documents; search works
- [ ] Reports: preview and download all five PDFs
- [ ] Reminders appear for near insurance/PUC dates; bell badge matches; custom reminder can be completed

## AI
- [ ] Chat streams; context chip names the right vehicle; copy, regenerate, stop, clear, delete all work
- [ ] "My brakes failed" shows the safety notice immediately
- [ ] An action card opens a prefilled form and nothing is saved until you submit
- [ ] Analyzer: run on a photo; result shows urgency, confidence, limits; create issue from it
- [ ] Turning off "Let AI use my vehicle data" makes chat answer generally and disables insights
- [ ] Turning off AI disables chat and analysis

## Devices
- [ ] Phone (portrait), tablet, laptop; light and dark theme
- [ ] Keyboard only: skip link, menu drawer, modals (Tab stays inside, Esc closes), tabs (arrow keys)
- [ ] Screen reader spot-check of dashboard, a form with errors, and the chat
