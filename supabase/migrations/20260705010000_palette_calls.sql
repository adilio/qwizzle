-- Rate-limit ledger for the AI palette Edge Function. RLS is enabled with
-- no policies: only the service role (inside the function) can touch it.
create table if not exists public.palette_calls (
  user_id uuid not null,
  called_at timestamptz not null default now()
);

create index if not exists palette_calls_user_time_idx
  on public.palette_calls (user_id, called_at);

alter table public.palette_calls enable row level security;
