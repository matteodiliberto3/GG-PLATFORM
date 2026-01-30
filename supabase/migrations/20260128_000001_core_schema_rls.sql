-- GG PLATFORM - Core Schema + RLS (Day02)
-- Safe to re-run: uses IF NOT EXISTS where possible.

begin;

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Helper: role from JWT (Supabase)
-- NOTE: expects JWT app_metadata.role in {"admin","soc","user"}.
create or replace function public.gg_current_role()
returns text
language sql
stable
as $$
  select coalesce(nullif((auth.jwt() -> 'app_metadata' ->> 'role')::text, ''), 'user');
$$;

-- 2) Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'gg_user_status') then
    create type public.gg_user_status as enum ('PENDING', 'APPROVED', 'DENIED', 'ACTIVE', 'SUSPICIOUS', 'SHADOW_BANNED', 'HARD_BANNED');
  end if;
  if not exists (select 1 from pg_type where typname = 'gg_content_type') then
    create type public.gg_content_type as enum ('THEORY', 'STRATEGY');
  end if;
  if not exists (select 1 from pg_type where typname = 'gg_content_status') then
    create type public.gg_content_status as enum ('DRAFT', 'SCHEDULED', 'LIVE', 'ARCHIVED');
  end if;
  if not exists (select 1 from pg_type where typname = 'gg_severity') then
    create type public.gg_severity as enum ('GREY', 'YELLOW', 'RED');
  end if;
end $$;

-- 3) Profiles (maps auth.users -> app user)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Sessions (runtime security state)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.gg_user_status not null default 'PENDING',
  trust_score integer not null default 0 check (trust_score >= 0 and trust_score <= 100),
  hw_hash text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (user_id, hw_hash)
);

create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
create index if not exists idx_user_sessions_status on public.user_sessions(status);
create index if not exists idx_user_sessions_hw_hash on public.user_sessions(hw_hash);

-- 5) Content (encrypted payload stored server-side)
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type public.gg_content_type not null,
  status public.gg_content_status not null default 'DRAFT',
  -- encrypted binary (AES-GCM) produced client-side (Wasm) or server-side in future
  encrypted_payload bytea not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_type_status on public.content(content_type, status);
create index if not exists idx_content_created_at on public.content(created_at desc);

-- 6) Schedule (time-based unlock)
create table if not exists public.content_schedule (
  content_id uuid primary key references public.content(id) on delete cascade,
  publish_at timestamptz not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create index if not exists idx_content_schedule_publish_at on public.content_schedule(publish_at);

-- 7) Banlist (hardware/ip based)
create table if not exists public.banlist (
  id uuid primary key default gen_random_uuid(),
  hw_hash text,
  ip inet,
  reason text,
  severity public.gg_severity not null default 'GREY',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_banlist_active on public.banlist(is_active);
create index if not exists idx_banlist_hw_hash on public.banlist(hw_hash);
create index if not exists idx_banlist_ip on public.banlist(ip);

-- 8) Forensic logs (immutable-ish evidence packets)
create table if not exists public.forensic_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid references public.user_sessions(id) on delete set null,
  severity public.gg_severity not null,
  violation_code text not null,
  evidence_score numeric(5,4),
  telemetry jsonb not null default '{}'::jsonb,
  hmac_signature text,
  created_at timestamptz not null default now()
);

create index if not exists idx_forensic_logs_user_id on public.forensic_logs(user_id);
create index if not exists idx_forensic_logs_created_at on public.forensic_logs(created_at desc);

-- 9) Audit log (append-only)
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log(actor_user_id);

-- 10) RLS enable
alter table public.profiles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.content enable row level security;
alter table public.content_schedule enable row level security;
alter table public.banlist enable row level security;
alter table public.forensic_logs enable row level security;
alter table public.audit_log enable row level security;

-- 11) RLS policies

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id or public.gg_current_role() in ('admin','soc'));

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Sessions
drop policy if exists "sessions_select_own_or_staff" on public.user_sessions;
create policy "sessions_select_own_or_staff"
on public.user_sessions for select
using (auth.uid() = user_id or public.gg_current_role() in ('admin','soc'));

drop policy if exists "sessions_insert_own" on public.user_sessions;
create policy "sessions_insert_own"
on public.user_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "sessions_update_staff" on public.user_sessions;
create policy "sessions_update_staff"
on public.user_sessions for update
using (public.gg_current_role() in ('admin','soc'))
with check (public.gg_current_role() in ('admin','soc'));

-- Content (admin only write; users can read LIVE only)
drop policy if exists "content_select_live_or_admin" on public.content;
create policy "content_select_live_or_admin"
on public.content for select
using (
  public.gg_current_role() in ('admin','soc')
  or status = 'LIVE'
);

drop policy if exists "content_insert_admin" on public.content;
create policy "content_insert_admin"
on public.content for insert
with check (public.gg_current_role() = 'admin');

drop policy if exists "content_update_admin" on public.content;
create policy "content_update_admin"
on public.content for update
using (public.gg_current_role() = 'admin')
with check (public.gg_current_role() = 'admin');

drop policy if exists "content_delete_admin" on public.content;
create policy "content_delete_admin"
on public.content for delete
using (public.gg_current_role() = 'admin');

-- Schedule (admin only)
drop policy if exists "schedule_select_admin" on public.content_schedule;
create policy "schedule_select_admin"
on public.content_schedule for select
using (public.gg_current_role() = 'admin');

drop policy if exists "schedule_write_admin" on public.content_schedule;
create policy "schedule_write_admin"
on public.content_schedule for all
using (public.gg_current_role() = 'admin')
with check (public.gg_current_role() = 'admin');

-- Banlist (soc/admin)
drop policy if exists "banlist_select_staff" on public.banlist;
create policy "banlist_select_staff"
on public.banlist for select
using (public.gg_current_role() in ('admin','soc'));

drop policy if exists "banlist_write_staff" on public.banlist;
create policy "banlist_write_staff"
on public.banlist for all
using (public.gg_current_role() in ('admin','soc'))
with check (public.gg_current_role() in ('admin','soc'));

-- Forensic logs (soc/admin read, staff write; no user access)
drop policy if exists "forensic_select_staff" on public.forensic_logs;
create policy "forensic_select_staff"
on public.forensic_logs for select
using (public.gg_current_role() in ('admin','soc'));

drop policy if exists "forensic_insert_staff" on public.forensic_logs;
create policy "forensic_insert_staff"
on public.forensic_logs for insert
with check (public.gg_current_role() in ('admin','soc'));

-- Audit log (append-only; only staff can read; only staff insert)
drop policy if exists "audit_select_staff" on public.audit_log;
create policy "audit_select_staff"
on public.audit_log for select
using (public.gg_current_role() in ('admin','soc'));

drop policy if exists "audit_insert_staff" on public.audit_log;
create policy "audit_insert_staff"
on public.audit_log for insert
with check (public.gg_current_role() in ('admin','soc'));

-- No UPDATE/DELETE policies on audit_log or forensic_logs => blocked by default under RLS.

commit;

