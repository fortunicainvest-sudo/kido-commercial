import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { eventsRepository } from "../events/events.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { ticketsRepository } from "../tickets/tickets.repository.js";
import { limitsFor } from "../billing/plan-limits.js";
import { badRequest, forbidden, notFound } from "../../shared/http-error.js";

function requireEnv() {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL manquants dans .env");
  }
  return { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL };
}

function roomServiceClient(): RoomServiceClient {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = requireEnv();
  // RoomServiceClient veut une URL http(s), pas wss:// — conversion simple.
  const httpUrl = LIVEKIT_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  return new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export const livekitService = {
  /** Génère le jeton LiveKit qui autorise cet utilisateur à rejoindre la
   *  salle de l'événement. Vérifie d'abord qu'il a le droit d'y être
   *  (créateur, billet valide, ou événement gratuit). L'hôte reçoit les
   *  droits de publication (audio/vidéo) ; les autres sont "abonnés" par
   *  défaut, sauf s'ils sont modérateurs (voir canPublishData). */
  async issueToken(userId: string, eventId: string) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound("Cet événement n'existe pas.");

    const user = await authRepository.findById(userId);
    if (!user) throw notFound("Utilisateur introuvable.");

    const isHost = event.creator_id === userId;
    const isModerator = await eventsRepository.isModerator(event.id, user.email);
    const hasTicket = event.price_cents === 0 || await ticketsRepository.userHasTicket(event.id, userId);

    if (!isHost && !hasTicket) {
      throw forbidden("Il te faut un billet valide pour entrer dans cette salle.");
    }
    if (event.locked && !isHost) {
      throw forbidden("Cette salle est verrouillée par l'hôte — plus personne ne peut entrer.");
    }

    // Le bridage se cale sur le PLAN DE L'HÔTE, pas celui du spectateur —
    // c'est la salle de l'hôte qui est plafonnée en durée et en capacité.
    const host = await authRepository.findById(event.creator_id);
    const limits = limitsFor(host?.plan ?? "FREE");

    if (!isHost) {
      const client = roomServiceClient();
      let currentCount = 0;
      try {
        currentCount = (await client.listParticipants(event.room_name)).length;
      } catch {
        // La salle n'existe pas encore côté LiveKit (personne connecté) —
        // on considère qu'elle est vide plutôt que de bloquer l'entrée.
        currentCount = 0;
      }
      if (currentCount >= limits.maxParticipants) {
        throw forbidden(`Cette salle a atteint sa capacité maximale (${limits.maxParticipants} personnes) pour le plan ${host?.plan ?? "FREE"} de l'organisateur.`);
      }
    }

    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = requireEnv();
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user.id,
      name: user.name,
      metadata: JSON.stringify({ isHost, isModerator }),
      // Plan FREE de l'hôte -> le jeton expire après la durée max (40 min
      // par défaut) : LiveKit déconnecte tout le monde à l'expiration.
      // C'est le mécanisme d'application de la limite de durée, pas juste
      // un chiffre affiché dans l'UI.
      ttl: limits.maxMeetingMinutes ? `${limits.maxMeetingMinutes}m` : "12h",
    });

    token.addGrant({
      room: event.room_name,
      roomJoin: true,
      canPublish: isHost,          // seul l'hôte diffuse écran/caméra par défaut
      canPublishData: true,        // tout le monde peut envoyer des messages de chat
      canSubscribe: true,
    });

    return {
      token: await token.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: event.room_name,
      isHost,
      isModerator,
      streamMode: event.stream_mode,
      planLimits: limits,
    };
  },

  /** Donne (ou retire) le droit de publier sa caméra/micro à un participant
   *  déjà connecté — utilisé quand l'hôte invite quelqu'un à co-animer, ou
   *  pour la modération (couper le micro d'un participant à distance). */
  async updatePublishPermission(actorUserId: string, eventId: string, targetIdentity: string, canPublish: boolean) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound();
    const actor = await authRepository.findById(actorUserId);
    const isHost = event.creator_id === actorUserId;
    const isModerator = actor ? await eventsRepository.isModerator(event.id, actor.email) : false;
    if (!isHost && !isModerator) throw forbidden("Seul l'hôte ou un modérateur peut faire ça.");
    if (targetIdentity === event.creator_id) throw badRequest("Impossible d'agir sur l'hôte.");

    const client = roomServiceClient();
    await client.updateParticipant(event.room_name, targetIdentity, undefined, {
      canPublish, canSubscribe: true, canPublishData: true,
    });
  },

  /** Vérifie que l'acteur est bien l'hôte ou un modérateur de cet événement,
   *  renvoie l'événement si oui. Utilisé par tous les contrôles hôte
   *  ci-dessous (verrouillage, exclusion, mute all). */
  async _assertCanModerate(actorUserId: string, eventId: string) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound("Cet événement n'existe pas.");
    const actor = await authRepository.findById(actorUserId);
    const isHost = event.creator_id === actorUserId;
    const isModerator = actor ? await eventsRepository.isModerator(event.id, actor.email) : false;
    if (!isHost && !isModerator) throw forbidden("Seul l'hôte ou un modérateur peut faire ça.");
    return event;
  },

  /** Verrouille/déverrouille la salle : plus personne ne peut obtenir de
   *  nouveau jeton d'entrée tant qu'elle est verrouillée (l'hôte garde
   *  toujours accès). */
  async setRoomLock(actorUserId: string, eventId: string, locked: boolean) {
    const event = await this._assertCanModerate(actorUserId, eventId);
    await eventsRepository.setLocked(event.id, locked);
  },

  /** Exclut définitivement un participant de la salle — contrairement à
   *  updatePublishPermission(false), il doit redemander un jeton pour
   *  revenir (et sera refusé si la salle est verrouillée). */
  async kickParticipant(actorUserId: string, eventId: string, targetIdentity: string) {
    const event = await this._assertCanModerate(actorUserId, eventId);
    if (targetIdentity === event.creator_id) throw badRequest("Impossible d'exclure l'hôte.");
    await roomServiceClient().removeParticipant(event.room_name, targetIdentity);
  },

  /** Coupe le micro (et la caméra) de tout le monde sauf l'hôte — utile en
   *  début de session ou pour reprendre la main sur une salle bruyante.
   *  ⚠️ Pas vérifiable dans cet environnement (pas d'accès réseau à LiveKit
   *  Cloud) — à confirmer une fois déployé, en particulier le nom exact du
   *  champ "type" renvoyé par listParticipants() selon la version du SDK. */
  async muteAll(actorUserId: string, eventId: string) {
    const event = await this._assertCanModerate(actorUserId, eventId);
    const client = roomServiceClient();
    const participants = await client.listParticipants(event.room_name);

    for (const participant of participants) {
      if (participant.identity === event.creator_id) continue;
      for (const track of participant.tracks ?? []) {
        await client.mutePublishedTrack(event.room_name, participant.identity, track.sid, true);
      }
    }
  },
};
