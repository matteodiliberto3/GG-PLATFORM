-- Add first_login for Editor onboarding (Sig. Giusti)
alter table public.profiles
  add column if not exists first_login boolean not null default true;

comment on column public.profiles.first_login is 'Editor onboarding: true until POST /v1/admin/onboarding_complete';
