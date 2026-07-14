-- The planned §3 profiles.default_edition_id field: a user-chosen edition
-- that loads automatically when they sign in on a fresh device.
alter table public.profiles
  add column if not exists default_edition_id uuid
    references public.editions (id) on delete set null;
