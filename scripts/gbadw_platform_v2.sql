-- Kribbl GBADW : tables de la plateforme agence (suivi, entreprises à contacter).
-- À lancer dans Supabase (SQL Editor), après gbadw_platform.sql. Peut être relancé sans risque.
-- L'accès se fait par le code interne de l'agence, vérifié par le site : pas de comptes, pas d'emails.
-- Les tables sont donc ouvertes à la clé publique du site.

create table if not exists gbadw_tracking (
  publication_number text primary key,
  status      text default 'none',   -- none, shortlist, go, contacted, team, preparing, ready, submitted, selected, won, lost, dropped
  starred     boolean default false,
  owner       text,
  notes       text,
  checklist   jsonb default '{}'::jsonb,
  suggestions jsonb,                 -- entreprises proposées par la recherche IA
  updated_by  text,                  -- Pablo, Jaime ou Romain
  updated_at  timestamptz default now()
);
alter table gbadw_tracking add column if not exists suggestions jsonb;

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

alter table gbadw_tenders add column if not exists title_en text;
alter table gbadw_tenders add column if not exists title_es text;

alter table gbadw_tenders  enable row level security;
alter table gbadw_tracking enable row level security;
alter table gbadw_contacts enable row level security;

drop policy if exists "gbadw_tenders_read" on gbadw_tenders;
create policy "gbadw_tenders_read" on gbadw_tenders for select to anon, authenticated using (true);

drop policy if exists "gbadw_tracking_all" on gbadw_tracking;
create policy "gbadw_tracking_all" on gbadw_tracking for all to anon, authenticated using (true) with check (true);

drop policy if exists "gbadw_contacts_all" on gbadw_contacts;
create policy "gbadw_contacts_all" on gbadw_contacts for all to anon, authenticated using (true) with check (true);

grant select on gbadw_tenders to anon;
grant select, insert, update, delete on gbadw_tracking, gbadw_contacts to anon;

-- Dossiers de consultation : fichiers déposés sur une annonce et résultat de leur lecture.
alter table gbadw_tracking add column if not exists dossier jsonb;

create table if not exists gbadw_docs (
  id          uuid primary key default gen_random_uuid(),
  publication_number text not null,
  name        text not null,
  path        text not null,
  size        bigint,
  created_by  text,
  created_at  timestamptz default now()
);
create index if not exists gbadw_docs_tender_idx on gbadw_docs (publication_number);
alter table gbadw_docs enable row level security;
drop policy if exists "gbadw_docs_all" on gbadw_docs;
create policy "gbadw_docs_all" on gbadw_docs for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on gbadw_docs to anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('gbadw-docs', 'gbadw-docs', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "gbadw_docs_files_read" on storage.objects;
create policy "gbadw_docs_files_read" on storage.objects for select to anon, authenticated using (bucket_id = 'gbadw-docs');
drop policy if exists "gbadw_docs_files_write" on storage.objects;
create policy "gbadw_docs_files_write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'gbadw-docs');
drop policy if exists "gbadw_docs_files_delete" on storage.objects;
create policy "gbadw_docs_files_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'gbadw-docs');
