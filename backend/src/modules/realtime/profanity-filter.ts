// Filtre basique anti-insultes — s'applique UNIQUEMENT au chat PUBLIC d'une
// salle (celui que tout le monde dans l'événement peut lire, voir
// socket.ts::chat_message). Ne touche jamais à une conversation privée
// (chat vocal entre amis, messages directs) : ces échanges restent hors de
// portée de toute modération automatique, sur demande explicite — voir la
// note dans socket.ts. Si un futur chat privé est ajouté, ce filtre ne doit
// PAS lui être branché.
//
// Volontairement simple (liste de mots + variantes), pas un modèle de
// détection de toxicité — suffisant pour un MVP, à muscler plus tard si
// besoin (Perspective API, service tiers...).
const BANNED_PATTERNS: RegExp[] = [
  /\bconnard?e?s?\b/i,
  /\bsalope?s?\b/i,
  /\bpute?s?\b/i,
  /\bencul[ée]s?\b/i,
  /\bnègre?s?\b/i,
  /\bbougnoule?s?\b/i,
  /\bfdp\b/i,
  /\bnique\s?ta\s?m[eè]re\b/i,
  /\bfuck\b/i,
  /\bbitch\b/i,
  /\bn[i1]gg[ae3]r?\b/i,
];

export function containsProfanity(text: string): boolean {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

/** Remplace les mots interdits par des astérisques plutôt que de bloquer le
 *  message entier — garde la conversation lisible sans être punitif. */
export function censor(text: string): string {
  let out = text;
  for (const re of BANNED_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), (m) => "*".repeat(m.length));
  }
  return out;
}
