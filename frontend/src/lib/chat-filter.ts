// Filtre anti-insultes basique pour le chat écrit PUBLIC des salles live
// (celui que tout le monde dans la salle peut voir).
//
// ⚠️ Portée volontairement limitée : ce filtre ne doit JAMAIS être branché
// sur un futur chat privé (messages entre amis, groupe vocal privé, etc.) —
// seul le chat public de la salle est concerné. N'importe où ailleurs, ne
// pas réutiliser ce module.
//
// Limite technique à connaître : ce filtre tourne côté client, avant l'envoi.
// C'est une modération "basique" comme demandé, pas une garantie absolue —
// un client modifié pourrait l'contourner. Pour une vraie garantie, il
// faudrait faire transiter le chat par notre serveur plutôt que directement
// par le canal de données LiveKit.

const BLOCKED_TERMS = [
  "connard", "connasse", "encule", "enculé", "salope", "pute", "putain",
  "batard", "bâtard", "merde", "con", "conne", "abruti", "abrutie",
  "debile", "débile", "idiot", "crétin", "cretin", "imbecile", "imbécile",
  "nique", "niquer", "ntm", "fdp", "ta gueule", "ferme ta gueule",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // enlève les accents pour matcher "débile"/"debile" pareil
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return BLOCKED_TERMS.some((term) => {
    const pattern = new RegExp(`\\b${normalize(term).replace(/\s+/g, "\\s+")}\\b`, "i");
    return pattern.test(normalized);
  });
}
