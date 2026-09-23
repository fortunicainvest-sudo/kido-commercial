// Enregistrement cloud du direct (Egress LiveKit → Cloudflare R2) —
// réservé aux plans PRO/ENTERPRISE, comme prévu dans le tableau de
// bridage (voir modules/billing/plan-limits.ts::cloudRecording).
import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";
import { eventsRepository } from "../events/events.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { limitsFor } from "../billing/plan-limits.js";
import { badRequest, forbidden, notFound } from "../../shared/http-error.js";

function requireEnv() {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) throw new Error("Variables LIVEKIT_* manquantes.");
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) throw new Error("Variables R2_* manquantes.");
  return { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET };
}

function egressClient(): EgressClient {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = requireEnv();
  const httpUrl = LIVEKIT_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  return new EgressClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

async function assertHostWithRecordingPlan(actorUserId: string, eventId: string) {
  const event = await eventsRepository.byId(eventId);
  if (!event) throw notFound("Cet événement n'existe pas.");
  if (event.creator_id !== actorUserId) throw forbidden("Seul l'hôte peut démarrer l'enregistrement.");

  const host = await authRepository.findById(actorUserId);
  const limits = limitsFor(host?.plan ?? "FREE");
  if (!limits.cloudRecording) {
    throw forbidden(`L'enregistrement cloud n'est pas inclus dans le plan ${host?.plan ?? "FREE"} — passe en PRO pour l'activer.`);
  }
  return event;
}

export const recordingService = {
  async start(actorUserId: string, eventId: string) {
    const event = await assertHostWithRecordingPlan(actorUserId, eventId);
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = requireEnv();

    const filepath = `recordings/${event.id}/${Date.now()}.mp4`;
    const output = new EncodedFileOutput({
      filepath,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: R2_ACCESS_KEY_ID,
          secret: R2_SECRET_ACCESS_KEY,
          bucket: R2_BUCKET,
          region: "auto",
          endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          forcePathStyle: true,
        }),
      },
    });

    const info = await egressClient().startRoomCompositeEgress(event.room_name, { file: output }, { layout: "speaker" });
    return { egressId: info.egressId, filepath };
  },

  async stop(actorUserId: string, eventId: string, egressId: string) {
    await assertHostWithRecordingPlan(actorUserId, eventId);
    if (!egressId) throw badRequest("egressId manquant.");
    const info = await egressClient().stopEgress(egressId);
    return { status: info.status };
  },
};
