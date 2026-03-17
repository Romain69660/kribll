-- ─────────────────────────────────────────────────────────────────────────────
-- Kribbl — Supabase setup SQL
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois)
-- ─────────────────────────────────────────────────────────────────────────────

-- Table profils agence
create table if not exists agency_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  name                text,
  city                text,
  team_size           int,
  annual_revenue      int,
  preferred_countries text[],
  project_types       text[],
  preferred_categories   text[],
  excluded_categories    text[],
  keywords_positive   text[],
  keywords_negative   text[],
  references          jsonb default '[]'::jsonb,
  created_at          timestamp default now(),
  updated_at          timestamp default now()
);

-- Index pour les lookups par user
create unique index if not exists agency_profiles_user_id_idx on agency_profiles(user_id);

-- RLS
alter table agency_profiles enable row level security;

drop policy if exists "Users can manage their own profile" on agency_profiles;
create policy "Users can manage their own profile"
  on agency_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agency_profiles_updated_at on agency_profiles;
create trigger agency_profiles_updated_at
  before update on agency_profiles
  for each row execute procedure update_updated_at();
