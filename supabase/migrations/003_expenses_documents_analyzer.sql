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
