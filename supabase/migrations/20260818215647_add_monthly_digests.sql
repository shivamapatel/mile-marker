create table public.monthly_digest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in boolean not null default false,
  opted_in_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.monthly_digest_preferences enable row level security;

create policy "Users can view their own monthly digest preference"
  on public.monthly_digest_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own monthly digest preference"
  on public.monthly_digest_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own monthly digest preference"
  on public.monthly_digest_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.monthly_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  reflection_count integer not null check (reflection_count >= 5),
  energy_distribution jsonb not null default '{"Drained": 0, "Steady": 0, "Charged": 0}'::jsonb,
  themes jsonb not null default '[]'::jsonb,
  reflection_question text,
  requested_model text not null,
  model text,
  provider text,
  prompt_version text not null,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'completed', 'failed')),
  error_message text,
  openrouter_generation_id text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  cost numeric(12, 8),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint monthly_digests_valid_period check (period_end > period_start),
  constraint monthly_digests_one_per_user_month unique (user_id, period_start)
);

alter table public.monthly_digests enable row level security;

create policy "Users can view their own monthly digests"
  on public.monthly_digests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update on public.monthly_digest_preferences to authenticated;
grant select on public.monthly_digests to authenticated;
