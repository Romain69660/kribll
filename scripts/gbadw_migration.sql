-- Kribbl GBADW : colonnes supplémentaires sur la table tenders
-- À lancer une fois dans l'éditeur SQL Supabase.
-- (Sans cette migration, le pipeline uploade quand même, sans ces colonnes.)

alter table tenders add column if not exists deadline        date;
alter table tenders add column if not exists sector          text;
alter table tenders add column if not exists eligibility     text;
alter table tenders add column if not exists blocking_points text;
alter table tenders add column if not exists summary_en      text;
alter table tenders add column if not exists contract_type   text;
