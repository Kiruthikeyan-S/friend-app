-- ============================================================================
-- Aura Personal AI Assistant — Production Supabase Schema, RLS & 7-Day pg_cron
-- Project: https://yrwbsbkbbtnakiwtnxqx.supabase.co
-- All timestamps use UTC (timestamptz).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. User Profiles & Retention Preferences
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  preferred_response_length text default 'concise',
  preferred_language text default 'en-US',
  retention_days integer not null default 7 check (retention_days between 1 and 90),
  auto_delete_temporary boolean not null default true,
  created_at timestamptz not null default (now() at time zone 'utc'),
  updated_at timestamptz not null default (now() at time zone 'utc')
);

-- 2. Conversations (7-day expiration for temporary/standard chats)
create table if not exists public.conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Conversation',
  mode text not null default 'text' check (mode in ('text', 'voice')),
  is_temporary boolean not null default true,
  expires_at timestamptz default ((now() at time zone 'utc') + interval '7 days'),
  created_at timestamptz not null default (now() at time zone 'utc'),
  updated_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists idx_conversations_user_expires
  on public.conversations (user_id, expires_at);

-- 3. Messages (UTC timestamps, optional redacted content, audio storage path)
create table if not exists public.messages (
  id text primary key,
  conversation_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  redacted_content text,
  is_temporary boolean not null default true,
  audio_storage_path text,
  expires_at timestamptz default ((now() at time zone 'utc') + interval '7 days'),
  created_at text not null,
  inserted_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists idx_messages_user_expires
  on public.messages (user_id, expires_at);

-- 4. Consent-Based User Memories (6 categories + optional expiration)
create table if not exists public.user_memories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (
    category in (
      'Communication preferences',
      'Learning interests',
      'Skills and experience',
      'Ongoing projects',
      'Frequently used preferences',
      'User-approved personal context',
      'Profile',
      'Preferences',
      'Work',
      'Interests'
    )
  ),
  title text not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  explicit_consent boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default (now() at time zone 'utc'),
  updated_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists idx_user_memories_user_status
  on public.user_memories (user_id, status, expires_at);

-- 5. Memory Audit Logs (NO sensitive content stored)
create table if not exists public.memory_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id text not null,
  action text not null check (
    action in ('extracted', 'approved', 'rejected', 'edited', 'deleted', 'expired', 'redacted')
  ),
  category text,
  created_at timestamptz not null default (now() at time zone 'utc')
);

-- 6. Automatic 7-Day Retention Execution Logs (NO sensitive content stored)
create table if not exists public.retention_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default (now() at time zone 'utc'),
  status text not null check (status in ('success', 'partial_failure', 'failed')),
  deleted_conversations integer not null default 0,
  deleted_messages integer not null default 0,
  deleted_memory_candidates integer not null default 0,
  deleted_audio_files integer not null default 0,
  retry_count integer not null default 0,
  error_summary text
);

-- Legacy compatibility table (kept if already created)
create table if not exists public.memories (
  id text primary key,
  user_id text default 'default-user',
  category text not null,
  title text not null,
  content text not null,
  approved boolean default true,
  created_at timestamptz default (now() at time zone 'utc')
);

-- ============================================================================
-- Row Level Security (RLS) — Strict Per-User Data Isolation
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_memories enable row level security;
alter table public.memory_audit_logs enable row level security;
alter table public.retention_logs enable row level security;

drop policy if exists "profiles_owner_only" on public.profiles;
create policy "profiles_owner_only" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "conversations_owner_only" on public.conversations;
create policy "conversations_owner_only" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages_owner_only" on public.messages;
create policy "messages_owner_only" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_memories_owner_only" on public.user_memories;
create policy "user_memories_owner_only" on public.user_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "memory_audit_logs_owner_only" on public.memory_audit_logs;
create policy "memory_audit_logs_owner_only" on public.memory_audit_logs
  for select using (auth.uid() = user_id);

-- retention_logs is restricted (service_role bypasses RLS; clients cannot read/write)
drop policy if exists "retention_logs_deny_clients" on public.retention_logs;
create policy "retention_logs_deny_clients" on public.retention_logs
  for all using (false) with check (false);

-- ============================================================================
-- Idempotent 7-Day Data Retention Cleanup Function + pg_cron Schedule
-- ============================================================================
create or replace function public.run_seven_day_retention_cleanup()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_now timestamptz := (now() at time zone 'utc');
  v_del_messages integer := 0;
  v_del_conversations integer := 0;
  v_del_memories integer := 0;
begin
  -- 1. Delete expired / temporary messages
  delete from public.messages
  where (is_temporary = true and inserted_at <= v_now - interval '7 days')
     or (expires_at is not null and expires_at <= v_now);
  get diagnostics v_del_messages = row_count;

  -- 2. Delete expired temporary conversations
  delete from public.conversations
  where (is_temporary = true and updated_at <= v_now - interval '7 days')
     or (expires_at is not null and expires_at <= v_now);
  get diagnostics v_del_conversations = row_count;

  -- 3. Delete expired temporary memory candidates (keep approved long-term memories unless expired)
  delete from public.user_memories
  where (status = 'pending' and created_at <= v_now - interval '7 days')
     or (status = 'rejected' and updated_at <= v_now - interval '7 days')
     or (expires_at is not null and expires_at <= v_now);
  get diagnostics v_del_memories = row_count;

  -- 4. Record cleanup execution without any sensitive content
  insert into public.retention_logs (
    run_at, status, deleted_conversations, deleted_messages, deleted_memory_candidates
  ) values (
    v_now, 'success', v_del_conversations, v_del_messages, v_del_memories
  );

  return jsonb_build_object(
    'status', 'success',
    'run_at', v_now,
    'deleted_conversations', v_del_conversations,
    'deleted_messages', v_del_messages,
    'deleted_memory_candidates', v_del_memories
  );
end;
$$;

-- Enable pg_cron when available on Supabase and schedule daily at 03:00 UTC
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule('aura-7-day-retention-cleanup')
    where exists (
      select 1 from cron.job where jobname = 'aura-7-day-retention-cleanup'
    );
    perform cron.schedule(
      'aura-7-day-retention-cleanup',
      '0 3 * * *',
      'select public.run_seven_day_retention_cleanup();'
    );
  end if;
exception when others then
  -- Safe no-op if pg_cron requires dashboard extension toggle
  null;
end;
$$;
