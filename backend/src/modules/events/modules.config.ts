// Seule source de vérité sur les règles de chaque module du hub Créativité —
// le frontend les lit via GET /api/modules plutôt que de les dupliquer.
export const MODULES = {
  concert: {
    label: "Concert", icon: "🎤", category: "musique",
    ticketing: true, defaultStreamMode: "ecran" as const, forcedVisibility: null,
    blurb: "Un live musical, gratuit ou payant.",
  },
  reunion: {
    label: "Réunion", icon: "🗣️", category: "autre",
    ticketing: false, defaultStreamMode: "audio" as const, forcedVisibility: null,
    blurb: "Un point d'équipe ou une visio simple — toujours gratuite.",
  },
  cinema: {
    label: "Cinéma", icon: "🎬", category: "cinema",
    ticketing: true, defaultStreamMode: "ecran" as const, forcedVisibility: null,
    blurb: "Une projection suivie ensemble, écran partagé.",
  },
  conference: {
    label: "Conférence", icon: "🎓", category: "conference",
    ticketing: true, defaultStreamMode: "les_deux" as const, forcedVisibility: null,
    blurb: "Une intervention ou un talk, avec ou sans billet.",
  },
  match: {
    label: "Match", icon: "⚽", category: "sport",
    ticketing: true, defaultStreamMode: "ecran" as const, forcedVisibility: null,
    blurb: "Une rencontre sportive suivie en direct.",
  },
  prive: {
    label: "Événement privé", icon: "🔒", category: "autre",
    ticketing: true, defaultStreamMode: "les_deux" as const, forcedVisibility: "private" as const,
    blurb: "Accessible seulement par lien — n'apparaît jamais dans l'explorateur.",
  },
} satisfies Record<string, {
  label: string; icon: string; category: string; ticketing: boolean;
  defaultStreamMode: "ecran" | "camera" | "les_deux" | "audio";
  forcedVisibility: "private" | null; blurb: string;
}>;

export type ModuleKey = keyof typeof MODULES;
export const CATEGORIES = ["musique", "cinema", "sport", "conference", "gaming", "education", "autre"] as const;

export function applyModuleRules(moduleKey: ModuleKey, fields: {
  priceCents?: number; maxSeats?: number | null; visibility?: string; streamMode?: string;
}) {
  const mod = MODULES[moduleKey];
  const out = { ...fields };
  if (!mod.ticketing) {
    out.priceCents = 0;
    out.maxSeats = null;
  }
  if (mod.forcedVisibility) out.visibility = mod.forcedVisibility;
  if (!out.streamMode) out.streamMode = mod.defaultStreamMode;
  return out;
}
