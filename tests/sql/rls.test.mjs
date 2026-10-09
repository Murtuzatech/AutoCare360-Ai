import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../supabase/')
const dir = root + '/migrations/'
const db = new PGlite()
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

// ── Emulate the parts of Supabase the migrations rely on ──
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  grant all on storage.objects, storage.buckets, auth.users to authenticated, anon, service_role;
  -- Supabase grants new public tables to these roles by default; emulate that so column-level revokes are tested faithfully
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`)

// ── Run every migration, twice (idempotency) ──
const files = ['001_foundation.sql', '002_vehicles_service.sql', '003_expenses_documents_analyzer.sql', '004_ai.sql', '005_hardening.sql']
for (const round of [1, 2]) for (const f of files) {
  try { await db.exec(readFileSync(dir + f, 'utf8')) } catch (e) { console.error(`FAILED ${f} (run ${round}):`, e.message); process.exit(1) }
}
console.log('all 5 migrations ran twice without error')

// Also verify the combined file
const combined = readFileSync(root + '/setup_all.sql', 'utf8')
const fresh = new PGlite()
await fresh.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text); alter table storage.objects enable row level security;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;`)
await fresh.exec(combined)
console.log('setup_all.sql runs on a fresh database')

// ── helpers ──
const as = async (uid, sql, params = []) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return await db.query(sql, params) } finally { await db.exec('reset role;') }
}
const denied = async (uid, sql, params, label) => {
  try { await as(uid, sql, params) } catch (e) { return console.log('  blocked:', label) }
  assert.fail(`SHOULD HAVE BEEN BLOCKED: ${label}`)
}

await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.com'), ('${B}', 'b@x.com')`)
const profiles = (await db.query('select count(*)::int c from public.profiles')).rows[0].c
assert.strictEqual(profiles, 2); console.log('signup trigger created 2 profiles')

// every public table has RLS on
const noRls = (await db.query(`select tablename from pg_tables where schemaname='public' and not rowsecurity`)).rows
assert.deepStrictEqual(noRls, [], 'tables without RLS: ' + JSON.stringify(noRls))
console.log('RLS enabled on all', (await db.query(`select count(*)::int c from pg_tables where schemaname='public'`)).rows[0].c, 'public tables')

// ── isolation ──
const vA = (await as(A, `insert into vehicles (user_id, nickname, make, model, fuel_type) values ($1,'A-car','Honda','City','petrol') returning id`, [A])).rows[0].id
const vB = (await as(B, `insert into vehicles (user_id, nickname, make, model, fuel_type) values ($1,'B-car','Tata','Nexon','diesel') returning id`, [B])).rows[0].id
assert.strictEqual((await as(A, 'select * from vehicles')).rows.length, 1)
assert.strictEqual((await as(B, 'select * from vehicles')).rows[0].nickname, 'B-car')
console.log('users only see their own vehicles')
await denied(A, `insert into vehicles (user_id, nickname, make, model, fuel_type) values ($1,'forged','x','y','petrol')`, [B], "insert a vehicle as another user")
assert.strictEqual((await as(A, `update vehicles set nickname='hacked' where id=$1 returning id`, [vB])).rows.length, 0)
assert.strictEqual((await as(A, `delete from vehicles where id=$1 returning id`, [vB])).rows.length, 0)
console.log('  blocked: update/delete another user\'s vehicle (0 rows affected)')
await denied(A, `update vehicles set user_id=$1 where id=$2`, [B, vA], 'reassign a vehicle to another user')

// child rows cannot point at another user's vehicle (composite FK)
await denied(A, `insert into service_records (user_id, vehicle_id, service_date, odometer_km) values ($1,$2,'2026-01-01',100)`, [A, vB], "service record on someone else's vehicle")
await denied(A, `insert into expenses (user_id, vehicle_id, expense_date, category, amount) values ($1,$2,'2026-01-01','fuel',10)`, [A, vB], "expense on someone else's vehicle")
await denied(A, `insert into vehicle_documents (user_id, vehicle_id, title, file_path, file_name) values ($1,$2,'t','p','n')`, [A, vB], "document on someone else's vehicle")
await as(A, `insert into service_records (user_id, vehicle_id, service_date, odometer_km, total_cost) values ($1,$2,'2026-01-01',100, 50)`, [A, vA])
await denied(A, `insert into service_records (user_id, vehicle_id, service_date, odometer_km, total_cost) values ($1,$2,'2026-01-01',100,-5)`, [A, vA], 'negative cost (check constraint)')
await denied(A, `insert into service_records (user_id, vehicle_id, service_date, odometer_km, next_service_date) values ($1,$2,'2026-05-01',100,'2026-01-01')`, [A, vA], 'next service before service date')

// cascade
await as(B, `insert into expenses (user_id, vehicle_id, expense_date, category, amount) values ($1,$2,'2026-01-01','fuel',10)`, [B, vB])
await db.exec(`delete from vehicles where id='${vB}'`)
assert.strictEqual((await db.query(`select count(*)::int c from expenses where vehicle_id='${vB}'`)).rows[0].c, 0)
console.log('deleting a vehicle cascades to its records')

// ── forging protections (column privileges) ──
const an = (await as(A, `insert into analyses (user_id, vehicle_id, analysis_type, title, files) values ($1,$2,'general','t','[{"path":"x"}]') returning id, status, result`, [A, vA])).rows[0]
assert.strictEqual(an.status, 'awaiting_analysis')
await denied(A, `insert into analyses (user_id, analysis_type, title, files, status, result) values ($1,'general','t','[{"path":"x"}]','analyzed','{"urgency":"monitor"}')`, [A], 'forge an analysis result on insert')
await denied(A, `update analyses set status='analyzed' where id=$1`, [an.id], 'forge analysis status on update')
await denied(A, `update analyses set result='{"x":1}' where id=$1`, [an.id], 'forge analysis result on update')
await as(A, `update analyses set title='renamed' where id=$1`, [an.id])
await denied(A, `insert into analyses (user_id, analysis_type, title, files) values ($1,'general','t','[]')`, [A], 'analysis with zero files')

await denied(A, `insert into conversations (user_id, title) values ($1,'x')`, [A], 'browser-created conversation')
const conv = (await db.query(`insert into conversations (user_id, title) values ('${A}','chat') returning id`)).rows[0].id // server (service role) path
await db.query(`insert into messages (conversation_id, user_id, role, content, actions) values ($1,$2,'assistant','hi','[{"id":"a1","status":"proposed"}]')`, [conv, A])
await denied(A, `insert into messages (conversation_id, user_id, role, content) values ($1,$2,'assistant','forged')`, [conv, A], 'browser-forged assistant message')
await denied(A, `update messages set content='edited' where conversation_id=$1`, [conv], 'edit message content')
assert.strictEqual((await as(A, `update messages set actions='[{"id":"a1","status":"confirmed"}]' where conversation_id=$1 returning id`, [conv])).rows.length, 1)
console.log('  allowed: updating action confirmation status')
assert.strictEqual((await as(B, 'select * from messages')).rows.length, 0)
assert.strictEqual((await as(B, 'select * from conversations')).rows.length, 0)
console.log('other users cannot read chats')
await denied(A, 'select * from ai_usage', [], 'read the rate-limit table')

// profiles: email immutable, preferences size capped
await as(A, `update profiles set full_name='Alice', preferences='{"a":1}' where id=$1`, [A])
await denied(A, `update profiles set email='spoof@x.com' where id=$1`, [A], 'edit profile email')
await denied(A, `update profiles set preferences=$2::jsonb where id=$1`, [A, JSON.stringify({ x: 'y'.repeat(20000) })], 'oversized preferences')
assert.strictEqual((await as(B, `select full_name from profiles where id=$1`, [A])).rows.length, 0)
console.log('profiles are private')

// ── row caps ──
await db.exec(`insert into vehicles (user_id, nickname, make, model, fuel_type) select '${B}', 'v'||g, 'm', 'm', 'petrol' from generate_series(1,50) g`)
await denied(B, `insert into vehicles (user_id, nickname, make, model, fuel_type) values ($1,'51st','m','m','petrol')`, [B], 'more than 50 vehicles')

// ── storage policies ──
await db.exec(`reset role`)
await as(A, `insert into storage.objects (bucket_id, name) values ('vehicle-documents', '${A}/file.pdf')`)
await denied(A, `insert into storage.objects (bucket_id, name) values ('vehicle-documents', '${B}/file.pdf')`, [], "upload into another user's folder")
await denied(A, `insert into storage.objects (bucket_id, name) values ('vehicle-documents', 'loose.pdf')`, [], 'upload outside any user folder')
assert.strictEqual((await as(B, `select * from storage.objects where bucket_id='vehicle-documents'`)).rows.length, 0)
assert.strictEqual((await as(A, `select * from storage.objects where bucket_id='vehicle-documents'`)).rows.length, 1)
console.log('storage: users only reach their own folder')
const buckets = (await db.query(`select id, public from storage.buckets order by id`)).rows
assert.strictEqual(buckets.length, 6); assert.ok(buckets.every((b) => b.public === false))
console.log('6 buckets, all private:', buckets.map((b) => b.id).join(', '))
console.log('\nRLS / SQL security suite PASSED')
