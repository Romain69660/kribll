// Kit de candidature de l'agence : identité, références validées, réseau de partenaires, leçons.
// Ces données ne sont servies que par /api/agence/kit, après vérification du code de l'agence.
// Les pièces sensibles (certificat COAM avec numéro d'identité, Kbis, RIB, attestations fiscales des
// partenaires) ne sont pas sur le site : elles restent dans le kit hors ligne (Drive de l'agence).

export type KitRow = { label: string; value: string; note?: string }
export type KitRef = {
  id: string; title: string; nature: string; program: string; client: string; place: string
  cost_k: number; area: string; mission: string; role: string; status: string; source: string
  images: { src: string; caption: string }[]
}
export type KitPartner = {
  region: string; name: string; skills: string; siret?: string; address?: string; contact?: string
  signatory?: string; staff?: string; status: 'actif' | 'en cours' | 'piste'; note?: string
}
export type KitLesson = { rule: string; why: string }
export type KitDoc = { name: string; href: string; note: string }
export type Kit = { updated: string; agency: KitRow[]; dc1Block: string; refs: KitRef[]; partners: KitPartner[]; lessons: KitLesson[]; docs: KitDoc[]; offline: string[] }

const ADR_BALDASSARI = "ZAE d'Erbajolo, lieu-dit Pastoreccia, rue Marcelle Conrad, 20600 Bastia"
const syn = 'Image de synthèse'

export const KIT: Kit = {
  updated: '9 octobre 2026, après le dépôt du concours CAPA Ajaccio (AC24-35-1)',
  agency: [
    { label: 'Dénomination', value: 'GIL BARTOLOME ADW S.L.' },
    { label: 'Forme juridique', value: "Société à responsabilité limitée de droit espagnol (Sociedad Limitada), société d'architecture" },
    { label: 'Siège social', value: 'Calle Clara del Rey 26, Portal A, Bajo, 28002 Madrid, Espagne', note: 'Confirmé par Pablo le 8/10/2026. Le pouvoir ICTP mentionnait Calle Entrepeñas 62 : erroné.' },
    { label: 'NIF', value: 'B87628533', note: 'À indiquer à la place du SIRET (« numéro propre au pays d’origine »).' },
    { label: 'TVA intracommunautaire', value: 'ESB87628533' },
    { label: 'Représentant légal', value: 'Pablo GIL MARTINEZ, administrateur solidaire (administrador solidario), architecte' },
    { label: 'Architecte 1', value: 'Pablo Gil Martínez, COAM n° 16829, inscrit depuis le 22/05/2006', note: 'Attestation bilingue du COAM du 7/10/2026 : dans le kit hors ligne. À redemander si plus de 3 à 6 mois.' },
    { label: 'Architecte 2', value: 'Jaime Bartolomé Illera, COAM n° 17660' },
    { label: 'Effectif', value: '7 architectes', note: 'Donné par Pablo, octobre 2026.' },
    { label: 'Contact acheteurs', value: 'pablo@gilbartolome.com · +34 657 422 572' },
    { label: 'Compte AW Solutions (marches-publics.info)', value: 'Au nom de Pablo GIL MARTINEZ, identifiant pablo@gilbartolome.com', note: 'Créé le 8/10/2026. Alertes limitées à « Mes consultations ».' },
    { label: "Chiffre d'affaires 2023 à 2025", value: 'À demander à Pablo', note: 'Exigé par certains règlements (ex. Annecy, annexe B1).' },
  ],
  dc1Block: "GIL BARTOLOME ADW S.L., société à responsabilité limitée de droit espagnol (Sociedad Limitada), société d'architecture. Calle Clara del Rey 26, Portal A, Bajo, 28002 Madrid, Espagne. pablo@gilbartolome.com · +34 657 422 572. NIF (numéro d'identification fiscale espagnol) : B87628533.",
  refs: [
    {
      id: 'ronda', title: 'Nouvelle base de maintenance ferroviaire de Ronda', nature: 'Construction neuve',
      program: 'Bâtiment de maintenance des trains et équipements ferroviaires : ateliers, bureaux, locaux administratifs',
      client: 'ADIF, gestionnaire public du réseau ferré espagnol', place: 'Ronda (Málaga), Espagne', cost_k: 4000, area: '2 400 m²',
      mission: 'Conception, études détaillées, maquette BIM, métrés et estimation, dossier de consultation des entreprises',
      role: 'Concepteur principal (architecture). Cotraitant du groupement temporaire (UTE) GIL BARTOLOME ADW / Viarium, titulaire du marché ADIF',
      status: 'Études détaillées et DCE achevés en 2024. Travaux non commencés (selon Jaime, à confirmer).',
      source: 'Pablo (7/10) et Jaime (9/10). Le portfolio indique 28 M€ : chiffre retenu 4 M€.',
      images: [
        { src: '/kit/refs/ronda/1.jpg', caption: syn }, { src: '/kit/refs/ronda/2.jpg', caption: syn },
        { src: '/kit/refs/ronda/3.jpg', caption: 'Insertion dans le site ferroviaire, image de synthèse' },
        { src: '/kit/refs/ronda/4.jpg', caption: 'Coupe détaillée, bureaux' }, { src: '/kit/refs/ronda/5.jpg', caption: 'Coupes longitudinales, magasins et accès trains' },
      ],
    },
    {
      id: 'dos-hermanas', title: 'Gare de Dos Hermanas et aménagement de ses abords', nature: 'Construction neuve',
      program: 'Gare ferroviaire (hall, billetterie, locaux techniques, quais couverts) et espaces urbains attenants',
      client: 'ADIF, gestionnaire public du réseau ferré espagnol', place: 'Dos Hermanas (Séville), Espagne', cost_k: 18700, area: '1 802 m² (gare) + 1 915 m² (espaces urbains)',
      mission: 'Conception, études détaillées, architecture intérieure, maquette BIM, dossier de consultation des entreprises',
      role: 'Concepteur principal (architecture). Cotraitant du groupement temporaire (UTE) GIL BARTOLOME ADW / Meta Engineering, titulaire du marché ADIF',
      status: 'Études détaillées et DCE achevés en 2026. Démarrage des travaux imminent.',
      source: 'Pablo et Jaime. Le portfolio indique 9,5 M€ : chiffre retenu 18,7 M€.',
      images: [
        { src: '/kit/refs/dos-hermanas/1.jpg', caption: syn }, { src: '/kit/refs/dos-hermanas/2.jpg', caption: syn },
        { src: '/kit/refs/dos-hermanas/3.jpg', caption: syn }, { src: '/kit/refs/dos-hermanas/4.jpg', caption: 'Axonométrie, structure et équipements' },
        { src: '/kit/refs/dos-hermanas/5.jpg', caption: 'Maquette BIM, gare et quais' },
      ],
    },
    {
      id: 'lahore', title: "Terminal de fret de l'aéroport de Lahore", nature: 'Construction neuve',
      program: 'Terminal de fret et aire de stationnement des avions',
      client: 'Pakistan Civil Aviation Authority (PCAA)', place: 'Lahore, Pakistan', cost_k: 34850, area: '27 501 m²',
      mission: 'Conception, études détaillées, cahiers des charges techniques, métrés',
      role: 'Concepteur principal (architecture). Sous-traitant de TYPSA, titulaire du marché',
      status: "Études achevées en 2016. Terminal de fret non construit (seul le parking de l'aéroport a été réalisé).",
      source: 'Pablo et Jaime. Plus de 7 ans : refusée quand le règlement limite l’âge des références (ex. Annecy).',
      images: [
        { src: '/kit/refs/lahore/1.jpg', caption: syn }, { src: '/kit/refs/lahore/2.jpg', caption: syn },
        { src: '/kit/refs/lahore/3.jpg', caption: 'Ambiance intérieure du terminal de fret, image de synthèse' },
      ],
    },
  ],
  partners: [
    { region: 'Corse', name: 'Groupe Baldassari (coordination)', skills: 'Pôle de bureaux d’études : INTI, NRGIA, VIATEC, BVP', address: ADR_BALDASSARI, contact: '04 95 30 44 13 · coralie@groupebaldassari.com', signatory: 'Coralie Sepulcre, coordination des dossiers', status: 'actif', note: 'Réactive. A fourni Kbis, DC2, attestations, références et CV (kit hors ligne).' },
    { region: 'Corse', name: 'INTI INGÉNIERIE, SAS', skills: 'Fluides CVC, plomberie, électricité CFO/CFA, SSI', siret: '881 155 584 00025', address: ADR_BALDASSARI, contact: '04 95 30 44 13 · contact@inti-ingenierie.com', signatory: 'Nicolas Baldassari, président', staff: '7', status: 'actif', note: 'Déclaration sur l’honneur de janvier 2026 : à refaire pour le prochain dépôt.' },
    { region: 'Corse', name: 'BET NRGIA, SARL', skills: 'Thermique, audits énergétiques', siret: '814 653 564 00033', address: ADR_BALDASSARI, contact: '04 95 32 26 69 · secretariat@groupebaldassari.com', signatory: 'Nicolas Baldassari, président', staff: '1', status: 'actif', note: 'Déclaration de janvier 2026.' },
    { region: 'Corse', name: 'VIATEC, SAS', skills: 'VRD, parkings, plateformes, réseaux', siret: '880 471 636 00022', address: ADR_BALDASSARI, contact: '04 95 30 44 13 · secretariat@groupebaldassari.com', signatory: 'Nicolas Baldassari, président', staff: '6', status: 'actif', note: 'Déclaration corrigée du 8/10/2026.' },
    { region: 'Corse', name: 'BVP INGÉNIERIE, SAS', skills: 'Économie de la construction', siret: '812 773 554 00058', address: ADR_BALDASSARI, contact: '04 95 30 44 13 · secretariat@groupebaldassari.com', signatory: 'Nicolas Baldassari, président', staff: '12', status: 'actif', note: 'Déclaration de janvier 2026.' },
    { region: 'Corse / PACA', name: 'ICTP, SAS', skills: 'Structure et génie civil', siret: '434 363 826 00067', address: '254, Corniche Fahnestock, 06700 Saint-Laurent-du-Var', contact: '04 92 12 97 09 · ictp@ictp.fr', signatory: 'Didier Tosello', staff: '11', status: 'actif', note: 'Leur pouvoir au mandataire porte une mauvaise adresse de l’agence : à corriger avant une phase d’offre.' },
    { region: 'Corse', name: 'AMO SPICY, SARL', skills: 'OPC (qualification OPQIBI)', siret: '521 313 916 00020', address: 'Espace Alban, bât. E, 26 bd Dominique Paoli, 20090 Ajaccio', contact: '06 87 66 44 29 · amospicyagence@orange.fr', signatory: 'Dominique Pasqualetti, gérant ; Ghjuvanna Verdi', staff: '3', status: 'actif', note: 'Accord obtenu début octobre 2026 pour Ajaccio.' },
    { region: 'France', name: 'B2A, Barre Bouchetard Architecture', skills: 'Agence d’architecture partenaire potentielle (ingénieurs-architectes)', staff: '7', status: 'en cours', note: 'Visio approuvée par Jaime. Utile quand un concours exige des références que l’agence n’a pas.' },
    { region: 'Rhône-Alpes', name: 'Iliade Ingénierie', skills: 'Ingénierie pluridisciplinaire du bâtiment', address: 'Caluire-et-Cuire (69)', status: 'piste', note: 'Lauréat du PEM des Glaisins (Grand Annecy, 2025) avec Marc Mimram.' },
    { region: 'Rhône-Alpes', name: 'Tecta', skills: 'VRD, aménagement', address: '118 av. des Marais, Allonzier-la-Caille (74)', status: 'piste', note: 'Lauréat du PEM des Glaisins.' },
    { region: 'Rhône-Alpes', name: 'Egis Bâtiments Rhône-Alpes', skills: 'Pluridisciplinaire, mobilité', address: 'Lyon', status: 'piste', note: 'Centre bus de Grand Chambéry (2026).' },
    { region: 'Rhône-Alpes', name: 'OTEIS', skills: 'Ingénierie tous corps d’état', address: 'Lyon, Chambéry, Annecy', status: 'piste', note: 'Centre de maintenance InspiRe, Clermont.' },
    { region: 'Rhône-Alpes', name: 'ADP Dubois', skills: 'Paysage, espaces publics', address: '84 rue Carnot, Annecy', contact: '04 50 68 24 13 · contact@adpdubois.com', status: 'piste', note: 'Espaces publics en Haute-Savoie.' },
    { region: 'Rhône-Alpes', name: 'SYSTRA', skills: 'Mobilité, pôles d’échanges', address: 'Lyon', status: 'piste', note: 'PEM Massenet, Saint-Étienne.' },
    { region: 'Rhône-Alpes', name: 'ARA Acoustique', skills: 'Acoustique', address: 'Lyon 3e', contact: '04 82 53 05 21 · bonjour@ara-acoustique.fr', status: 'piste' },
    { region: 'Rhône-Alpes', name: 'Agence Adequat', skills: 'Signalétique', contact: 'contact@agence-adequat.fr', status: 'piste', note: 'Signalétique du pôle d’échanges de Lyon Perrache.' },
  ],
  lessons: [
    { rule: 'Lire tout le DCE, y compris les questions-réponses de l’acheteur', why: 'Ajaccio : les réponses précisaient que seule l’inscription de l’architecte était obligatoire et qu’il n’y avait pas de limite d’âge des références.' },
    { rule: 'Retélécharger le DCE depuis le compte avant de déposer', why: 'Rattache la consultation au compte et permet de vérifier qu’aucun fichier n’a changé.' },
    { rule: 'Noms de fichiers : 30 caractères maximum, sans accents ni caractères spéciaux', why: 'Règle d’AW Solutions. Déposer les fichiers un par un plutôt qu’un zip.' },
    { rule: 'Pour chaque référence : rôle réel ET qualité contractuelle', why: 'Mandataire, cotraitant d’une UTE, sous-traitant de… C’est demandé par la plupart des règlements.' },
    { rule: 'Indiquer l’avancement réel des références', why: 'Construit, en chantier ou non commencé. Les acheteurs valorisent les projets réalisés.' },
    { rule: 'Ne jamais annoncer une pièce « jointe » qui n’est pas jointe', why: 'Relevé par la relecture à Ajaccio.' },
    { rule: 'Mêmes noms, adresses et SIRET dans toutes les pièces', why: 'DC1, tableau, déclarations : harmoniser avant de déposer.' },
    { rule: 'Vérifier les déclarations des partenaires', why: 'Code de la commande publique (L. 2141-1 à L. 2141-11, L. 5212), pas l’ancien code des marchés publics. Bon numéro RCS, date récente.' },
    { rule: 'Planches de références : images entières, au format d’origine', why: 'Partir des fichiers d’origine du portfolio, légender « Image de synthèse » en bas à droite.' },
    { rule: 'Attribuer toutes les missions complémentaires du CCAP', why: 'Coordonnateur déchets, signalétique… Une ligne dans le DC1 évite un trou apparent dans l’équipe.' },
    { rule: 'Faire relire le dossier final par un second outil ou une seconde personne', why: 'La relecture a trouvé 5 vraies corrections à Ajaccio.' },
    { rule: 'Déposer au moins 48 h avant, et avant 18 h', why: 'Pour joindre l’assistance AW Solutions en cas de problème (0892 14 00 04).' },
    { rule: 'Garder l’attestation de dépôt et le bordereau de contrôle', why: 'Vérifier que la taille de chaque fichier du bordereau correspond au fichier local.' },
    { rule: 'Candidature nominative, projet anonyme', why: 'Le nom de l’agence figure sur la candidature. Seul le rendu de la phase 2 est anonyme.' },
  ],
  docs: [
    { name: 'DC1 de groupement (modèle Ajaccio)', href: '/kit/modeles/DC1_groupement_modele.docx', note: 'Formulaire officiel rempli : mandataire, 6 cotraitants, missions.' },
    { name: 'Déclaration sur l’honneur de l’agence', href: '/kit/modeles/Declaration_honneur_GBADW.docx', note: 'Changer l’objet de la consultation et la date.' },
    { name: 'Pouvoir au mandataire', href: '/kit/modeles/Pouvoir_mandataire_modele.docx', note: 'À faire signer par chaque cotraitant quand le règlement l’exige.' },
    { name: 'Planches A3 des 3 références (exemple Ajaccio)', href: '/kit/modeles/Planches_A3_exemple_Ajaccio.pdf', note: 'Mise en page : images entières, cartouche avec les informations exigées.' },
  ],
  offline: [
    'Attestation d’inscription COAM de Pablo (contient un numéro d’identité personnel)',
    'Dossiers administratifs des partenaires : Kbis, DC2, attestations fiscales et sociales, RIB, CV',
    'Images des références en pleine résolution',
    'Les 11 pièces déposées à Ajaccio, l’attestation de dépôt et le bordereau',
  ],
}
