import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getToken } from "../lib/api";

interface ChatMsg { author: string; text: string; at: number }
const SOCKET_URL = (import.meta.env.VITE_API_URL || "https://kido-backend.onrender.com/api").replace(/\/api$/, "");

/** Chat PUBLIC de la salle — tout le monde dans l'événement le voit, et
 *  c'est pour ça qu'il passe par notre backend (voir modules/realtime/socket.ts)
 *  plutôt que par le canal de données LiveKit : c'est le seul moyen d'y
 *  appliquer le filtre anti-insultes côté serveur. Ce composant ne doit
 *  jamais servir de base à un futur chat privé — un tel chat devra rester
 *  hors de ce filtre, donc probablement sur un canal séparé. */
export function PublicChat({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [presence, setPresence] = useState(0);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token: getToken() } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", eventId, (res: { ok: boolean }) => {
        if (!res.ok) console.warn("Impossible de rejoindre le chat public.");
      });
    });
    socket.on("chat_message", (msg: ChatMsg) => setMessages((m) => [...m, msg]));
    socket.on("presence", (p: { count: number }) => setPresence(p.count));

    return () => { socket.disconnect(); };
  }, [eventId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat_message", text);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-text">Chat public</p>
        <p className="text-xs text-muted">{presence} personne(s) dans la salle</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-text">{m.author} </span>
            <span className="text-muted">{m.text}</span>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écrire un message…"
          className="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button onClick={send} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
          Envoyer
        </button>
      </div>
    </div>
  );
}
