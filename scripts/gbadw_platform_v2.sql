-- Kribbl GBADW : tables de la plateforme agence (suivi, contacts, membres).
-- À lancer UNE fois dans Supabase (SQL Editor), après gbadw_platform.sql.

-- 1. Qui a accès à l'espace agence. Ajouter une ligne par personne (email du compte Kribbl).
create table if not exists gbadw_members (
  email      text primary key,
  name       text,
  created_at timestamptz default now()
);
insert into gbadw_members (email, name) values
  ('bourgeoisromain6@gmail.com', 'Romain')
  -- , ('email-de-pablo@exemple.com', 'Pablo')   <- enlever les deux tirets et mettre l'email du compte de Pablo
on conflict (email) do nothing;

create or replace function is_gbadw_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gbadw_members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table gbadw_members enable row level security;
drop policy if exists "gbadw_members_read" on gbadw_members;
create policy "gbadw_members_read" on gbadw_members for select to authenticated using (is_gbadw_member());

-- 2. Les annonces : lecture réservée aux membres (au lieu de tout compte connecté).
drop policy if exists "gbadw_tenders_read" on gbadw_tenders;
create policy "gbadw_tenders_read" on gbadw_tenders for select to authenticated using (is_gbadw_member());

-- 3. Suivi de chaque annonce.
create table if not exists gbadw_tracking (
  publication_number text primary key,
  status      text default 'none',   -- none, shortlist, go, contacted, team, preparing, ready, submitted, selected, won, lost, dropped
  starred     boolean default false,
  owner       text,
  notes       text,
  checklist   jsonb default '{}'::jsonb,
  suggestions jsonb,                 -- entreprises proposées par la recherche IA
  updated_by  text,
  updated_at  timestamptz default now()
);
alter table gbadw_tracking add column if not exists suggestions jsonb;
alter table gbadw_tracking enable row level security;
drop policy if exists "gbadw_tracking_all" on gbadw_tracking;
create policy "gbadw_tracking_all" on gbadw_tracking for all to authenticated
  using (is_gbadw_member()) with check (is_gbadw_member());

-- 4. Entreprises à contacter (bureaux d'études, partenaires) par annonce.
create table if not exists gbadw_contacts (
  id          uuid primary key default gen_random_uuid(),
  publication_number text not null,
  company     text not null,
  discipline  text,
  city        text,
  phone       text,
  email       text,
  website     text,
  source_url  text,
  why         text,
  note        text,
  status      text default 'todo',   -- todo, contacted, interested, confirmed, declined
  created_by  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists gbadw_contacts_tender_idx on gbadw_contacts (publication_number);
alter table gbadw_contacts enable row level security;
drop policy if exists "gbadw_contacts_all" on gbadw_contacts;
create policy "gbadw_contacts_all" on gbadw_contacts for all to authenticated
  using (is_gbadw_member()) with check (is_gbadw_member());
