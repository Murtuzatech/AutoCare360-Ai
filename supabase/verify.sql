-- AutoCare 360 · verification queries. Run in Supabase → SQL Editor after setup_all.sql.

-- 1) Tables WITHOUT row level security. Expect: no rows.
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- 2) Tables and policy counts. Expect 12 tables; every table except ai_usage has policies (ai_usage has none on purpose).
select t.tablename, count(p.policyname) as policies
from pg_tables t left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' group by t.tablename order by t.tablename;

-- 3) Storage buckets. Expect 6 rows, all public = false.
select id, public, file_size_limit from storage.buckets order by id;

-- 4) Row-limit triggers. Expect 8 rows.
select event_object_table from information_schema.triggers where trigger_name like '%\_row\_limit' escape '\' group by 1 order by 1;
