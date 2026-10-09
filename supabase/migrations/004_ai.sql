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
