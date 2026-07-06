-- Qwizzle initial schema: profiles, wordlists, editions, stats.
-- RLS on everything; users touch only their own rows, except editions
-- explicitly published via is_public + share_slug, which are world-readable.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme_pref text not null default 'system'
    check (theme_pref in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wordlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  source_type text not null
    check (source_type in ('builtin', 'json', 'csv', 'paste', 'url', 'gist')),
  -- Uploaded/pasted lists store entries here; url/gist lists store the source.
  payload_json jsonb,
  source_url text,
  item_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  theme_json jsonb not null,
  -- Portable wordlist reference (same shape as the edition export JSON):
  -- {source_type, name?, source_url?, entries?}. Self-contained so public
  -- share links work without exposing the owner's wordlists table.
  wordlist_ref jsonb not null default '{"source_type":"builtin"}'::jsonb,
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stats_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.wordlists enable row level security;
alter table public.editions enable row level security;
alter table public.stats enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own wordlists" on public.wordlists;
create policy "own wordlists" on public.wordlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own editions" on public.editions;
create policy "own editions" on public.editions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public editions readable" on public.editions;
create policy "public editions readable" on public.editions
  for select using (is_public = true);

drop policy if exists "own stats" on public.stats;
create policy "own stats" on public.stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists editions_user_idx on public.editions (user_id);
create index if not exists editions_slug_idx on public.editions (share_slug)
  where is_public = true;
create index if not exists wordlists_user_idx on public.wordlists (user_id);

-- Upserts key on (user_id, name): re-importing a list replaces it.
create unique index if not exists wordlists_user_name_idx
  on public.wordlists (user_id, name);
