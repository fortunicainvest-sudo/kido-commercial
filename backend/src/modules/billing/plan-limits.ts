// Bridage des fonctionnalités par plan — seule source de vérité, appliquée
// côté serveur (jamais confiance dans ce que le frontend affiche).
export type Plan = "FREE" | "PRO" | "ENTERPRISE";

export interface PlanLimits {
  maxMeetingMinutes: number | null;   // null = illimité
  maxParticipants: number;
  maxVideoQuality: "720p" | "1080p" | "4k";
  cloudRecording: boolean;
  recordingStorageGb: number;
  passCustomization: "standard" | "logo_couleurs" | "marque_blanche";
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxMeetingMinutes: 40,
    maxParticipants: 10,
    maxVideoQuality: "720p",
    cloudRecording: false,
    recordingStorageGb: 0,
    passCustomization: "standard",
  },
  PRO: {
    maxMeetingMinutes: null,
    maxParticipants: 100,
    maxVideoQuality: "1080p",
    cloudRecording: true,
    recordingStorageGb: 10,
    passCustomization: "logo_couleurs",
  },
  ENTERPRISE: {
    maxMeetingMinutes: null,
    maxParticipants: 500,
    maxVideoQuality: "4k",
    cloudRecording: true,
    recordingStorageGb: 100,
    passCustomization: "marque_blanche",
  },
};

export function limitsFor(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) in PLAN_LIMITS ? (plan as Plan) : "FREE"];
}
