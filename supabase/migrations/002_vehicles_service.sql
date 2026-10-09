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
