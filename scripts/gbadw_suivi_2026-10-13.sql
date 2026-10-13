-- Kribbl GBADW : suivi du 13 octobre 2026 (Annecy, Francoulès, Ajaccio, Riaumont, T8, Rioz).
-- A coller dans Supabase > SQL Editor, puis Run. Peut être relancé sans risque.

-- 1. Pièces livrées avec le site pour Annecy et Francoulès
delete from gbadw_docs where path like '/dossiers/26-91301/%' or path like '/dossiers/26-83795/%';
insert into gbadw_docs (publication_number,name,path,size,created_by) values
('26-91301','Reglement de concours.pdf','/dossiers/26-91301/Reglement_de_concours.pdf',963239,'Romain'),
('26-91301','Note de presentation du projet.pdf','/dossiers/26-91301/Note_presentation_projet.pdf',1027540,'Romain'),
('26-91301','Annexes B1 B2 B4 (candidature).xlsx','/dossiers/26-91301/Annexes_B1_B2_B4.xlsx',22284,'Romain'),
('26-91301','Annexe B3 references.pptx','/dossiers/26-91301/Annexe_B3_references.pptx',49977,'Romain'),
('26-91301','DC1.doc','/dossiers/26-91301/DC1.doc',131584,'Romain'),
('26-91301','DC2.doc','/dossiers/26-91301/DC2.doc',590336,'Romain'),
('26-91301','Pouvoir au mandataire (Annecy).docx','/dossiers/26-91301/Pouvoir_au_mandataire.docx',37733,'Romain'),
('26-91301','Declaration sur l honneur (cotraitants).docx','/dossiers/26-91301/Declaration_sur_l_honneur.docx',37459,'Romain'),
('26-83795','Reglement du concours.pdf','/dossiers/26-83795/Reglement_du_concours.pdf',438159,'Romain'),
('26-83795','Synthese du programme.pdf','/dossiers/26-83795/Synthese_programme.pdf',1884700,'Romain'),
('26-83795','Cadre reponse candidature.xls','/dossiers/26-83795/Cadre_reponse_candidature.xls',68608,'Romain'),
('26-83795','Cadre type affiche (2 A3).doc','/dossiers/26-83795/Cadre_type_affiche.doc',47104,'Romain'),
('26-83795','Cadre references complementaires.doc','/dossiers/26-83795/Cadre_references_complementaires.doc',46080,'Romain'),
('26-83795','DC1.docx','/dossiers/26-83795/DC1.docx',47761,'Romain'),
('26-83795','DC2.docx','/dossiers/26-83795/DC2.docx',56499,'Romain'),
('26-83795','Declaration sur l honneur.docx','/dossiers/26-83795/Declaration_sur_l_honneur.docx',51974,'Romain'),
('26-83795','Pouvoir au mandataire (Francoules).docx','/dossiers/26-83795/Pouvoir_au_mandataire.docx',37752,'Romain'),
('26-83795','CCAP.doc','/dossiers/26-83795/CCAP.doc',305664,'Romain');

-- 2. Statuts de suivi
insert into gbadw_tracking (publication_number,status,starred,notes,checklist,updated_by,updated_at) values ('26-79093','submitted',true,'Déposé le 9/10/2026 à 13:33:49 sur marches-publics.info (compte AW Solutions de Pablo). Attestation de dépôt et bordereau envoyés à Coralie (Baldassari) le 13/10. Réponse du jury attendue : 3 équipes admises à l''offre, DCE offres en novembre 2026.','{"dc1":true,"dc2":true,"refs":true,"insurance":true,"order":true,"capacity":true,"partners":true,"mandate":true,"upload":true}'::jsonb,'Romain',now())
on conflict (publication_number) do update set status=excluded.status, starred=true, notes=excluded.notes, checklist=coalesce(gbadw_tracking.checklist,'{}'::jsonb) || excluded.checklist, updated_by='Romain', updated_at=now();
insert into gbadw_tracking (publication_number,status,starred,notes,checklist,updated_by,updated_at) values ('26-91301','contacted',true,'Candidature jeudi 22/10 à 12h. BET sollicités le 13/10 : Oteis, Iliade (structure, fluides, QEB, SSI), Bateca (VRD et mobilité), ADP Dubois (paysage), ARA (acoustique), Adequat (signalétique). Refus : Alp''VRD, Tecta (déjà engagé). Pièces des BET attendues le lundi 19/10. A obtenir de Pablo : rôle sur Montoro et Los Prados, images de Los Prados, CA 2023 à 2025, attestation d''assurance. Références : Dos Hermanas, Ronda, Montoro, Los Prados (Lahore refusée, plus de 7 ans).','{"refs":false}'::jsonb,'Romain',now())
on conflict (publication_number) do update set status=excluded.status, starred=true, notes=excluded.notes, checklist=coalesce(gbadw_tracking.checklist,'{}'::jsonb) || excluded.checklist, updated_by='Romain', updated_at=now();
insert into gbadw_tracking (publication_number,status,starred,notes,checklist,updated_by,updated_at) values ('26-83795','contacted',true,'Candidature jeudi 22/10 à 16h, dépôt sur lot.fr (accès rapide > marchés publics), pas sur AWS. BET sollicités le 13/10 : Vertical Sea agence de Toulouse (structure, fluides, QE, économie, VRD), Atelier GAMA (paysage), Ampletudes (acoustique). Secours acoustique : ABC Décibel. Pièces attendues le lundi 19/10. Dossier d''oeuvre : 2 A3 libres + 2 A3 de tableau, tout en format natif. Référence clé : base de maintenance de Ronda.','{}'::jsonb,'Romain',now())
on conflict (publication_number) do update set status=excluded.status, starred=true, notes=excluded.notes, checklist=coalesce(gbadw_tracking.checklist,'{}'::jsonb) || excluded.checklist, updated_by='Romain', updated_at=now();
insert into gbadw_tracking (publication_number,status,starred,notes,checklist,updated_by,updated_at) values ('26-97290','shortlist',true,'EHPAD/USLD de Riaumont (Liévin), 160 lits, 8 180 m², 20,7 M€, 3 équipes, prime 80 k€. Candidature le 19/11 à 16h, architecte mandataire. 5 références après juin 2021 dont 2 après juin 2024. Faisable avec Enero : en attente de Pablo.','{}'::jsonb,'Romain',now())
on conflict (publication_number) do update set status=excluded.status, starred=true, notes=excluded.notes, checklist=coalesce(gbadw_tracking.checklist,'{}'::jsonb) || excluded.checklist, updated_by='Romain', updated_at=now();
insert into gbadw_tracking (publication_number,status,starred,notes,checklist,updated_by,updated_at) values ('26-97051','shortlist',true,'Tramway T8 Paris (26,45 M€), appel d''offres ouvert, remise le 17/11, questions avant le 5/11. Mandataire ingénierie obligatoire : l''agence ne peut être que cotraitante (coordination architecturale). Envoyé à Pablo pour trouver un partenaire.','{}'::jsonb,'Romain',now())
on conflict (publication_number) do update set status=excluded.status, starred=true, notes=excluded.notes, checklist=coalesce(gbadw_tracking.checklist,'{}'::jsonb) || excluded.checklist, updated_by='Romain', updated_at=now();
update gbadw_tracking set notes = 'Bloquant : le règlement exige au moins une référence réceptionnée de l''architecte de moins de 10 ans.', updated_at=now() where publication_number='26-92409';
update gbadw_tracking set dossier = coalesce(dossier,'{}'::jsonb) || '{"works_eur": 20700000, "prize_eur": 80000, "teams": 3}'::jsonb where publication_number='26-97290';
update gbadw_tracking set dossier = coalesce(dossier,'{}'::jsonb) || '{"works_eur": 26450000}'::jsonb where publication_number='26-97051';

-- 3. Bureaux d'études contactés (remplace les lignes du même nom pour ces deux concours)
delete from gbadw_contacts where publication_number='26-91301' and company in ('OTEIS','Iliade Ingénierie','Bateca','ADP Dubois','ARA Acoustique','Agence Adequat','Alp''VRD Ingénierie','Tecta (Vertical Sea)');
insert into gbadw_contacts (publication_number,company,discipline,city,phone,email,note,status,created_by) values
('26-91301','OTEIS','structure','Annecy',null,'annecy@ioa.oteis.fr','Mail envoyé le 13/10.','contacted','Romain'),
('26-91301','Iliade Ingénierie','structure','Caluire-et-Cuire','04 37 40 25 90','accueil@iliade-ing.com','Mail envoyé le 13/10. Anti-spam : cliquer le lien de validation reçu.','contacted','Romain'),
('26-91301','Bateca','vrd','Sainte-Foy-lès-Lyon',null,'contact@bateca.fr','VRD et mobilité. Mail envoyé le 13/10.','contacted','Romain'),
('26-91301','ADP Dubois','paysage','Annecy','04 50 68 24 13','contact@adpdubois.com','Mail envoyé le 13/10.','contacted','Romain'),
('26-91301','ARA Acoustique','acoustique','Lyon','04 82 53 05 21','bonjour@ara-acoustique.fr','Mail envoyé le 13/10.','contacted','Romain'),
('26-91301','Agence Adequat','environnement','Lyon',null,'contact@agence-adequat.fr','Signalétique. Mail envoyé le 13/10.','contacted','Romain'),
('26-91301','Alp''VRD Ingénierie','vrd','Argonay','04 57 98 11 90','contact@alpvrd.fr','A décliné le 13/10 sans motif.','declined','Romain'),
('26-91301','Tecta (Vertical Sea)','vrd','Allonzier-la-Caille',null,'sl@tecta-ing.com','Déjà engagé avec une autre équipe, ouvert pour plus tard.','declined','Romain');
delete from gbadw_contacts where publication_number='26-83795' and company in ('Vertical Sea (agence de Toulouse)','Atelier GAMA','Ampletudes Acoustique','ABC Décibel');
insert into gbadw_contacts (publication_number,company,discipline,city,phone,email,note,status,created_by) values
('26-83795','Vertical Sea (agence de Toulouse)','structure','Toulouse',null,'sl@tecta-ing.com','Structure, fluides, QE, économie, VRD. Mail envoyé le 13/10 à Claire Aguettaz.','contacted','Romain'),
('26-83795','Atelier GAMA','paysage','Toulouse',null,'contact@atelier-gama.com','Mail envoyé le 13/10.','contacted','Romain'),
('26-83795','Ampletudes Acoustique','acoustique','Toulouse',null,'contact@ampletudes.fr','Mail envoyé le 13/10.','contacted','Romain'),
('26-83795','ABC Décibel','acoustique','Toulouse','05 67 31 45 24',null,'Solution de secours, pas d email publié.','todo','Romain');
