-- Kribbl GBADW : table des avis de la plateforme agence.
-- À lancer UNE fois dans Supabase (SQL Editor). Sans elle, le pipeline tourne quand même,
-- mais il réanalyse tous les avis à chaque run et ne sait pas dire lesquels sont nouveaux.

create table if not exists gbadw_tenders (
  publication_number  text primary key,
  source              text,
  title               text,
  buyer_name          text,
  location            text,
  departement         text,
  url                 text,
  dce_url             text,
  platform            text,
  publication_date    date,
  deadline            date,
  deadline_type       text,
  typology            text,        -- TRANSPORT, MAINTENANCE, HEALTH, EDUCATION, HOUSING, SPORT, CULTURE...
  fit                 text,        -- CORE, PARTNER, NO
  contract_type       text,        -- ARCHITECT_LED, STUDY, DESIGN_BUILD, OTHER
  team_lead           text,
  verdict             text,        -- GO, MAYBE, NO
  score               int,
  relevance_score     int,
  procedure_type      text,
  mission             text,
  estimated_budget    text,
  budget_eur          bigint,
  prize_eur           bigint,
  teams_shortlisted   int,
  project_type        text,
  program             text,
  required_references jsonb default '[]'::jsonb,
  eligibility         text,
  blocking_points     jsonb default '[]'::jsonb,
  summary_fr          text,
  summary_en          text,
  summary_es          text,
  cpv_code            text,
  is_live             boolean default true,
  first_seen          date default current_date,
  last_seen           date default current_date,
  updated_at          timestamptz default now()
);

create index if not exists gbadw_tenders_live_idx     on gbadw_tenders (is_live, deadline);
create index if not exists gbadw_tenders_typology_idx on gbadw_tenders (typology, fit);

-- Lecture réservée aux comptes connectés ; l'écriture se fait par le pipeline (clé service).
alter table gbadw_tenders enable row level security;
drop policy if exists "gbadw_tenders_read" on gbadw_tenders;
create policy "gbadw_tenders_read" on gbadw_tenders for select to authenticated using (true);
