-- AutoCare 360 · COMPLETE database setup (migrations 001–005 in order).
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- It is simply the five files in supabase/migrations/ joined together.

-- ════════════════════════════════════════════════════════════
-- FILE: migrations/001_foundation.sql
-- ════════════════════════════════════════════════════════════
-- AutoCare 360 · Migration 001 · Foundation
-- Safe to re-run.

-- ── Shared helper: keep updated_at current ───────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles (1:1 with auth.users) ───────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  email        text,
  avatar_path  text,
  preferences  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 100)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy on purpose: rows are removed when the auth user is deleted.

-- ── Auto-create a profile on signup ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for users created before this migration
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ── Storage: private avatars bucket ──────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live at avatars/<user_id>/<filename>; users can only touch their own folder.
drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Verify (should return 1 row each) ────────────────────────────────
-- select count(*) from information_schema.tables where table_name = 'profiles';
-- select id from storage.buckets where id = 'avatars';

-- ════════════════════════════════════════════════════════════
-- FILE: migrations/002_vehicles_service.sql
-- ════════════════════════════════════════════════════════════
-- AutoCare 360 · Migration 002 · Vehicles, service, maintenance, issues, reminders
-- Run AFTER 001_foundation.sql. Safe to re-run.

-- ═════════════════════════ TABLES ═════════════════════════

create table if not exists public.vehicles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  nickname                text not null check (char_length(nickname) between 1 and 60),
  make                    text not null check (char_length(make) between 1 and 60),
  model                   text not null check (char_length(model) between 1 and 60),
  variant                 text check (variant is null or char_length(variant) <= 60),
  manufacturing_year      integer check (manufacturing_year between 1950 and 2100),
  registration_number     text check (registration_number is null or char_length(registration_number) <= 20),
  fuel_type               text not null check (fuel_type in ('petrol','diesel','cng','lpg','electric','hybrid','other')),
  transmission            text check (transmission is null or transmission in ('manual','automatic','cvt','dct','amt','other')),
  odometer_km             integer not null default 0 check (odometer_km >= 0),
  purchase_date           date,
  purchase_price          numeric(12,2) check (purchase_price is null or purchase_price >= 0),
  image_path              text,
  vin                     text check (vin is null or char_length(vin) <= 32),
  insurance_provider      text check (insurance_provider is null or char_length(insurance_provider) <= 100),
  insurance_policy_number text check (insurance_policy_number is null or char_length(insurance_policy_number) <= 60),
  insurance_expiry        date,
  puc_expiry              date,
  warranty_provider       text check (warranty_provider is null or char_length(warranty_provider) <= 100),
  warranty_expiry         date,
  warranty_notes          text check (warranty_notes is null or char_length(warranty_notes) <= 1000),
  notes                   text check (notes is null or char_length(notes) <= 2000),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- lets child tables prove a vehicle belongs to the same user
  constraint vehicles_id_user_unique unique (id, user_id)
);
create unique index if not exists vehicles_user_registration_uidx
  on public.vehicles (user_id, upper(registration_number))
  where registration_number is not null and registration_number <> '';
create index if not exists vehicles_user_idx on public.vehicles (user_id);

create table if not exists public.service_records (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  vehicle_id           uuid not null,
  service_date         date not null,
  odometer_km          integer not null check (odometer_km >= 0),
  service_type         text not null default 'routine' check (service_type in ('routine','repair','inspection','other')),
  service_center       text check (service_center is null or char_length(service_center) <= 120),
  labour_cost          numeric(12,2) not null default 0 check (labour_cost >= 0),
  parts                jsonb not null default '[]'::jsonb check (jsonb_typeof(parts) = 'array'),
  total_cost           numeric(12,2) not null default 0 check (total_cost >= 0),
  notes                text check (notes is null or char_length(notes) <= 2000),
  next_service_date    date,
  next_service_odometer_km integer check (next_service_odometer_km is null or next_service_odometer_km >= 0),
  invoice_path         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint service_next_after_service check (next_service_date is null or next_service_date >= service_date),
  constraint service_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists service_vehicle_date_idx on public.service_records (vehicle_id, service_date desc);
create index if not exists service_user_idx on public.service_records (user_id);

create table if not exists public.maintenance_tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  vehicle_id      uuid not null,
  title           text not null check (char_length(title) between 1 and 120),
  category        text not null default 'general' check (category in
                    ('engine','brakes','tyres','battery','fluids','ac','electrical','suspension','transmission','general')),
  status          text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  due_date        date,
  due_odometer_km integer check (due_odometer_km is null or due_odometer_km >= 0),
  notes           text check (notes is null or char_length(notes) <= 2000),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint task_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists tasks_vehicle_status_idx on public.maintenance_tasks (vehicle_id, status);
create index if not exists tasks_user_due_idx on public.maintenance_tasks (user_id, due_date);

create table if not exists public.vehicle_issues (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  vehicle_id   uuid not null,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (description is null or char_length(description) <= 2000),
  severity     text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status       text not null default 'open' check (status in ('open','resolved')),
  reported_at  date not null default current_date,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint issue_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists issues_vehicle_status_idx on public.vehicle_issues (vehicle_id, status);
create index if not exists issues_user_idx on public.vehicle_issues (user_id);

-- User-created reminders. Insurance/PUC/warranty/service reminders are derived
-- from vehicle and service data in the app, so they never go out of sync.
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  vehicle_id  uuid,
  title       text not null check (char_length(title) between 1 and 120),
  due_date    date not null,
  notes       text check (notes is null or char_length(notes) <= 1000),
  status      text not null default 'active' check (status in ('active','done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint reminder_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists reminders_user_due_idx on public.reminders (user_id, due_date);

-- ═════════════ updated_at triggers + Row Level Security ═════════════

do $$
declare t text;
begin
  foreach t in array array['vehicles','service_records','maintenance_tasks','vehicle_issues','reminders'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)', t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)', t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;

-- ═════════════════════════ STORAGE ═════════════════════════
-- Private buckets. Files live at <bucket>/<user_id>/<file>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-images',   'vehicle-images',   false, 3145728, array['image/jpeg','image/png','image/webp']),
  ('service-invoices', 'service-invoices', false, 5242880, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['vehicle-images','service-invoices'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_select_own');
    execute format($p$create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_select_own', b);

    execute format('drop policy if exists %I on storage.objects', b || '_insert_own');
    execute format($p$create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_insert_own', b);

    execute format('drop policy if exists %I on storage.objects', b || '_update_own');
    execute format($p$create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_update_own', b);

    execute format('drop policy if exists %I on storage.objects', b || '_delete_own');
    execute format($p$create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_delete_own', b);
  end loop;
end $$;

-- ═════════════════════════ VERIFY ═════════════════════════
-- Expect 5 rows with rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--     and tablename in ('vehicles','service_records','maintenance_tasks','vehicle_issues','reminders');
-- Expect 2 rows:
--   select id from storage.buckets where id in ('vehicle-images','service-invoices');

-- ════════════════════════════════════════════════════════════
-- FILE: migrations/003_expenses_documents_analyzer.sql
-- ════════════════════════════════════════════════════════════
-- AutoCare 360 · Migration 003 · Expenses, documents, analyzer submissions
-- Run AFTER 001 and 002. Safe to re-run.

-- ═════════════════════════ TABLES ═════════════════════════

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  vehicle_id    uuid not null,
  expense_date  date not null,
  category      text not null check (category in ('fuel','service','repairs','parts','insurance','taxes','accessories','other')),
  amount        numeric(12,2) not null check (amount > 0),
  description   text check (description is null or char_length(description) <= 200),
  receipt_path  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint expense_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists expenses_user_date_idx on public.expenses (user_id, expense_date desc);
create index if not exists expenses_vehicle_idx on public.expenses (vehicle_id);

create table if not exists public.vehicle_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  vehicle_id  uuid,                         -- optional: a document may not belong to one vehicle
  title       text not null check (char_length(title) between 1 and 120),
  category    text not null default 'other' check (category in ('insurance','puc','invoice','purchase','warranty','manual','other')),
  file_path   text not null,
  file_name   text not null check (char_length(file_name) <= 255),
  mime_type   text,
  size_bytes  bigint check (size_bytes is null or size_bytes >= 0),
  notes       text check (notes is null or char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint document_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists documents_user_idx on public.vehicle_documents (user_id, created_at desc);
create index if not exists documents_vehicle_idx on public.vehicle_documents (vehicle_id);

-- Analyzer submissions. Phase 3 stores the files and the user's description.
-- Phase 4 will let a server-side function fill in status/result; users cannot write those columns (see grants below).
create table if not exists public.analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  vehicle_id     uuid,
  analysis_type  text not null check (analysis_type in ('warning_light','damage','component','document','invoice','general')),
  title          text not null check (char_length(title) between 1 and 120),
  description    text check (description is null or char_length(description) <= 2000),
  files          jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) between 1 and 5),
  status         text not null default 'awaiting_analysis' check (status in ('awaiting_analysis','analyzed','failed')),
  result         jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint analysis_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists analyses_user_idx on public.analyses (user_id, created_at desc);

-- ═════════════ triggers + Row Level Security ═════════════

do $$
declare t text;
begin
  foreach t in array array['expenses','vehicle_documents','analyses'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;

-- Users must not be able to forge analysis output: only descriptive columns are writable by clients.
revoke insert, update on public.analyses from anon, authenticated;
grant insert (user_id, vehicle_id, analysis_type, title, description, files) on public.analyses to authenticated;
grant update (vehicle_id, title, description) on public.analyses to authenticated;

-- ═════════════════════════ STORAGE ═════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-documents', 'vehicle-documents', false, 10485760, array[
     'application/pdf','image/jpeg','image/png','image/webp','text/plain','application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('expense-receipts',  'expense-receipts',  false, 5242880,  array['application/pdf','image/jpeg','image/png','image/webp']),
  ('analysis-uploads',  'analysis-uploads',  false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['vehicle-documents','expense-receipts','analysis-uploads'] loop
    execute format('drop policy if exists %I on storage.objects', b || '_select_own');
    execute format($p$create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_select_own', b);
    execute format('drop policy if exists %I on storage.objects', b || '_insert_own');
    execute format($p$create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_insert_own', b);
    execute format('drop policy if exists %I on storage.objects', b || '_update_own');
    execute format($p$create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_update_own', b);
    execute format('drop policy if exists %I on storage.objects', b || '_delete_own');
    execute format($p$create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)$p$, b || '_delete_own', b);
  end loop;
end $$;

-- ═════════════════════════ VERIFY ═════════════════════════
-- Expect 3 rows, rowsecurity = true:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--     and tablename in ('expenses','vehicle_documents','analyses');
-- Expect 3 rows:
--   select id from storage.buckets where id in ('vehicle-documents','expense-receipts','analysis-uploads');

-- ════════════════════════════════════════════════════════════
-- FILE: migrations/004_ai.sql
-- ════════════════════════════════════════════════════════════
-- AutoCare 360 · Migration 004 · AI assistant (conversations, messages, usage limits)
-- Run AFTER 001, 002, 003. Safe to re-run.

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  vehicle_id  uuid,
  title       text not null default 'New conversation' check (char_length(title) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint conversation_vehicle_fk foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id) on delete cascade
);
create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null default '' check (char_length(content) <= 30000),
  actions         jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- Server-only table used for rate limiting. RLS on with NO policies = unreachable from the browser.
create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- conversations / messages: owner can read and delete; the Edge Function creates rows.
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own on public.conversations for select to authenticated using (auth.uid() = user_id);
drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own on public.conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own on public.conversations for delete to authenticated using (auth.uid() = user_id);

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages for select to authenticated using (auth.uid() = user_id);
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages for delete to authenticated using (auth.uid() = user_id);

-- Browsers cannot insert conversations/messages (so nobody can forge assistant replies) and
-- may only change a conversation's title or the confirmation status stored in a message's actions.
revoke insert, update on public.conversations from anon, authenticated;
revoke insert, update on public.messages from anon, authenticated;
grant update (title) on public.conversations to authenticated;
grant update (actions) on public.messages to authenticated;

-- ═════════════════ VERIFY ═════════════════
-- Expect 3 rows:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--     and tablename in ('conversations','messages','ai_usage');

-- ════════════════════════════════════════════════════════════
-- FILE: migrations/005_hardening.sql
-- ════════════════════════════════════════════════════════════
-- AutoCare 360 · Migration 005 · Security hardening (final)
-- Run AFTER 001–004. Safe to re-run.

-- 1) Profiles: browsers may only change their name, avatar and preferences.
--    The `email` column is maintained by the signup trigger and cannot be edited by clients.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_path, preferences) on public.profiles to authenticated;

alter table public.profiles drop constraint if exists profiles_preferences_size;
alter table public.profiles add constraint profiles_preferences_size check (pg_column_size(preferences) < 16384);

-- 2) Per-user row caps. RLS already isolates users; this stops one account from filling the database.
create or replace function public.enforce_user_row_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cap integer := tg_argv[0]::integer;
  n   integer;
begin
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name) into n using new.user_id;
  if n >= cap then
    raise exception 'You have reached the limit of % records for this item.', cap using errcode = '54000';
  end if;
  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in select * from (values
      ('vehicles', 50), ('service_records', 5000), ('maintenance_tasks', 5000), ('vehicle_issues', 2000),
      ('reminders', 2000), ('expenses', 20000), ('vehicle_documents', 2000), ('analyses', 500)
    ) as t(name, cap)
  loop
    execute format('drop trigger if exists %I on public.%I', r.name || '_row_limit', r.name);
    execute format('create trigger %I before insert on public.%I for each row execute function public.enforce_user_row_limit(%L)',
                   r.name || '_row_limit', r.name, r.cap);
  end loop;
end $$;

-- ═════════════ VERIFY ═════════════
-- Expect 8 rows:
--   select event_object_table from information_schema.triggers where trigger_name like '%\_row\_limit' escape '\';
