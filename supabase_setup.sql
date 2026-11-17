-- ============================================================================
-- Aura Personal AI Voice Assistant — Supabase Database Setup (Run in SQL Editor)
-- Project: https://yrwbsbkbbtnakiwtnxqx.supabase.co
-- ============================================================================

-- 1. Personal Memories Table (Phase 7)
create table if not exists public.memories (
  id text primary key,
  user_id text default 'default-user',
  category text not null,
  title text not null,
  content text not null,
  approved boolean default true,
  created_at timestamptz default now()
);

-- 2. Chat & Voice Messages Table (Phase 8)
create table if not exists public.messages (
  id text primary key,
  conversation_id text not null,
  role text not null,
  content text not null,
  created_at text not null,
  inserted_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS) & Policies
alter table public.memories enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Allow public access to memories" on public.memories;
create policy "Allow public access to memories" on public.memories
  for all using (true) with check (true);

drop policy if exists "Allow public access to messages" on public.messages;
create policy "Allow public access to messages" on public.messages
  for all using (true) with check (true);
