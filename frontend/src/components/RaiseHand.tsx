import { useEffect, useState } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";

interface RaiseHandPayload { identity: string; name: string; raised: boolean }

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Signal "lever la main" — passe par le canal de données LiveKit (pas par
 *  notre chat filtré : ce n'est pas du texte libre, juste un booléen, donc
 *  aucune question de modération ici). */
export function RaiseHand({ isHost }: { isHost: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const [raised, setRaised] = useState(false);
  const [queue, setQueue] = useState<RaiseHandPayload[]>([]);

  const { send, message } = useDataChannel("raise-hand");

  useEffect(() => {
    if (!message) return;
    try {
      const payload = JSON.parse(decoder.decode(message.payload)) as RaiseHandPayload;
      setQueue((q) => {
        const withoutThis = q.filter((p) => p.identity !== payload.identity);
        return payload.raised ? [...withoutThis, payload] : withoutThis;
      });
    } catch {
      /* message mal formé, on l'ignore */
    }
  }, [message]);

  function toggle() {
    const next = !raised;
    setRaised(next);
    send(
      encoder.encode(JSON.stringify({ identity: localParticipant.identity, name: localParticipant.name || "Invité", raised: next } satisfies RaiseHandPayload)),
      { reliable: true }
    );
  }

  if (isHost) {
    if (!queue.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2">
        <span className="text-xs font-semibold text-live">✋ Mains levées :</span>
        {queue.map((p) => (
          <span key={p.identity} className="rounded-full bg-live/15 px-2.5 py-1 text-xs font-medium text-live">
            {p.name || "Invité"}
          </span>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${raised ? "bg-live/20 text-live" : "bg-panel-raised text-muted"}`}
    >
      ✋ {raised ? "Main levée" : "Lever la main"}
    </button>
  );
}
