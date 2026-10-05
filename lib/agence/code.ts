// Code interne de l'agence. Il n'est stocké dans aucune base : il vit ici, côté serveur.
// Pour le changer sans toucher au code : variable d'environnement GBADW_CODE sur l'hébergeur.
const CODE = process.env.GBADW_CODE || 'GilBartolome2026'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

export function codeOk(given: string | null | undefined): boolean {
  return !!given && norm(given) === norm(CODE)
}
