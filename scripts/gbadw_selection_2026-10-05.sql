-- Kribbl GBADW : pièces livrées avec le site + sélection du 5 octobre. Peut être relancé sans risque.

delete from gbadw_docs where path like '/dossiers/%';

insert into gbadw_docs (publication_number,name,path,size,created_by) values
('26-79093','Reglement de la consultation.pdf','/dossiers/26-79093/Reglement_de_la_consultation.pdf',454949,'Romain'),
('26-86968','Reglement de concours.pdf','/dossiers/26-86968/Reglement_de_concours.pdf',653247,'Romain'),
('26-86968','DC1.doc','/dossiers/26-86968/DC1.doc',137216,'Romain'),
('26-91301','Reglement de concours.pdf','/dossiers/26-91301/Reglement_de_concours.pdf',963239,'Romain'),
('26-91301','DC1.doc','/dossiers/26-91301/DC1.doc',131584,'Romain'),
('26-91301','DC2.doc','/dossiers/26-91301/DC2.doc',590336,'Romain'),
('26-83795','Reglement du concours.pdf','/dossiers/26-83795/Reglement_du_concours.pdf',438159,'Romain'),
('26-83795','DC1.docx','/dossiers/26-83795/DC1.docx',47761,'Romain'),
('26-83795','DC2.docx','/dossiers/26-83795/DC2.docx',56499,'Romain'),
('26-92409','Reglement de concours.pdf','/dossiers/26-92409/Reglement_de_concours.pdf',571012,'Romain'),
('26-94791','Reglement de la consultation.pdf','/dossiers/26-94791/Reglement_de_la_consultation.pdf',693107,'Romain'),
('26-94573','Reglement de la consultation.pdf','/dossiers/26-94573/Reglement_de_la_consultation.pdf',446945,'Romain'),
('26-94573','Questions reponses.pdf','/dossiers/26-94573/Questions_reponses.pdf',87974,'Romain'),
('26-92192','Reglement de la consultation.pdf','/dossiers/26-92192/Reglement_de_la_consultation.pdf',387293,'Romain'),
('26-90551','Reglement de la consultation.pdf','/dossiers/26-90551/Reglement_de_la_consultation.pdf',354286,'Romain'),
('26-90551','DC1.doc','/dossiers/26-90551/DC1.doc',549376,'Romain'),
('26-90551','DC2.doc','/dossiers/26-90551/DC2.doc',604672,'Romain'),
('26-90551','DC4.doc','/dossiers/26-90551/DC4.doc',1042944,'Romain'),
('26-85665','Reglement du concours.pdf','/dossiers/26-85665/Reglement_du_concours.pdf',650088,'Romain'),
('626015-2026','Reglement de la consultation.pdf','/dossiers/626015-2026/Reglement_de_la_consultation.pdf',2028340,'Romain'),
('26-85761','Reglement de la consultation.pdf','/dossiers/26-85761/Reglement_de_la_consultation.pdf',821828,'Romain'),
('26-85761','DC1.docx','/dossiers/26-85761/DC1.docx',48460,'Romain'),
('26-85761','DC2.docx','/dossiers/26-85761/DC2.docx',92981,'Romain'),
('26-85761','DC4.docx','/dossiers/26-85761/DC4.docx',116700,'Romain'),
('631243-2026','Reglement de concours.pdf','/dossiers/631243-2026/Reglement_de_concours.pdf',618007,'Romain'),
('631243-2026','DC1.doc','/dossiers/631243-2026/DC1.doc',130560,'Romain'),
('631243-2026','DC2.doc','/dossiers/631243-2026/DC2.doc',176128,'Romain'),
('631243-2026','DC4.doc','/dossiers/631243-2026/DC4.doc',189440,'Romain'),
('600087-2026','Reglement de concours.pdf','/dossiers/600087-2026/Reglement_de_concours.pdf',752355,'Romain'),
('600087-2026','DC1.doc','/dossiers/600087-2026/DC1.doc',130560,'Romain'),
('600087-2026','DC2.doc','/dossiers/600087-2026/DC2.doc',176128,'Romain'),
('600087-2026','DC4.doc','/dossiers/600087-2026/DC4.doc',189440,'Romain');

insert into gbadw_tracking (publication_number,starred,updated_by) values
('26-79093',true,'Romain'),
('26-86968',true,'Romain'),
('26-91301',true,'Romain'),
('26-83795',true,'Romain'),
('26-92409',true,'Romain'),
('26-94791',true,'Romain'),
('26-94573',true,'Romain'),
('26-92192',true,'Romain'),
('26-90551',true,'Romain'),
('26-85665',true,'Romain'),
('626015-2026',true,'Romain'),
('26-85761',true,'Romain'),
('631243-2026',true,'Romain'),
('600087-2026',true,'Romain')
on conflict (publication_number) do update set starred=true, updated_at=now();
