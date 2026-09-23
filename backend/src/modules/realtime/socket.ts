// Chat texte + présence pour les salles live. Le son/la vidéo passent par
// LiveKit (voir modules/live) — Socket.io ne porte ici que ce que LiveKit ne
// fait pas nativement bien : le chat texte affiché dans l'UI et le compteur
// de spectateurs.
import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { eventsRepository } from "../events/events.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { ticketsRepository } from "../tickets/tickets.repository.js";
import { containsProfanity, censor } from "./profanity-filter.js";

interface SocketData {
  userId?: string;
  userName?: string;
  roomName?: string;
}

function authenticate(socket: Socket<any, any, any, SocketData>) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export function registerRealtime(io: Server) {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.data.userId = authenticate(socket) ?? undefined;

    socket.on("join_room", async (eventId: string, callback: (res: { ok: boolean; error?: string }) => void) => {
      try {
        const event = await eventsRepository.byId(eventId);
        if (!event) return callback({ ok: false, error: "Événement introuvable." });

        const isHost = socket.data.userId === event.creator_id;
        const hasTicket = event.price_cents === 0
          || (socket.data.userId ? await ticketsRepository.userHasTicket(event.id, socket.data.userId) : false);

        if (!isHost && !hasTicket) return callback({ ok: false, error: "Billet requis." });

        const user = socket.data.userId ? await authRepository.findById(socket.data.userId) : null;
        socket.data.userName = user?.name || "Invité";
        socket.data.roomName = event.room_name;

        await socket.join(event.room_name);
        io.to(event.room_name).emit("presence", { count: io.sockets.adapter.rooms.get(event.room_name)?.size ?? 1 });
        callback({ ok: true });
      } catch (err) {
        console.error("[socket join_room]", err);
        callback({ ok: false, error: "Erreur serveur." });
      }
    });

    // Ce canal est le chat PUBLIC de la salle (tout le monde dans
    // l'événement le voit) — c'est le seul endroit où le filtre
    // anti-insultes s'applique, volontairement. Un futur chat vocal ou
    // écrit privé (entre amis, en messages directs) ne doit jamais passer
    // par ce filtre : les échanges privés restent hors de toute
    // modération automatique.
    socket.on("chat_message", (text: string) => {
      const room = socket.data.roomName;
      if (!room || typeof text !== "string" || !text.trim()) return;

      const trimmed = text.trim().slice(0, 500);
      const flagged = containsProfanity(trimmed);

      io.to(room).emit("chat_message", {
        author: socket.data.userName || "Invité",
        text: flagged ? censor(trimmed) : trimmed,
        at: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      const room = socket.data.roomName;
      if (room) {
        // Laisse le temps à l'adapter de retirer le socket avant de recompter.
        setImmediate(() => {
          io.to(room).emit("presence", { count: io.sockets.adapter.rooms.get(room)?.size ?? 0 });
        });
      }
    });
  });
}
