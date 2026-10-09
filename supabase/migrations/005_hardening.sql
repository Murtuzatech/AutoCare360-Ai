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
