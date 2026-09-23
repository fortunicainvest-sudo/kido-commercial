import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom, GridLayout, ParticipantTile, ControlBar, RoomAudioRenderer,
  useTracks, useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { api, ApiError } from "../lib/api";
import { PublicChat } from "../components/PublicChat";
import { RaiseHand } from "../components/RaiseHand";

interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  isHost: boolean;
  isModerator: boolean;
  streamMode: string;
}

export function LiveRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.post<TokenResponse>(`/events/${id}/live/token`)
      .then(setSession)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de rejoindre cette salle."));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center">
        <p className="text-live">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-muted underline">Retour</button>
      </div>
    );
  }

  if (!session) {
    return <div className="flex h-[70vh] items-center justify-center text-muted">Connexion à la salle…</div>;
  }

  return (
    <div className="h-[calc(100vh-73px)] bg-ink" data-lk-theme="default">
      <LiveKitRoom
        token={session.token}
        serverUrl={session.url}
        connect
        video={session.isHost}
        audio={session.isHost}
        onDisconnected={() => navigate(`/evenements/${id}`)}
        className="flex h-full flex-col"
      >
        {session.isHost && <HostToolbar eventId={id!} />}
        {session.isHost && <RaiseHand isHost />}

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col">
            {session.streamMode === "audio" ? <AudioOnlyView /> : <VideoView />}
            <div className="flex items-center justify-center gap-3 border-t border-line px-3 py-2">
              <ControlBar variation="minimal" controls={{ chat: false, screenShare: session.isHost }} />
              {!session.isHost && <RaiseHand isHost={false} />}
            </div>
          </div>
          <div className="hidden w-80 shrink-0 border-l border-line md:block">
            <PublicChat eventId={id!} />
          </div>
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/** Grille vidéo standard — écran partagé et/ou caméra selon ce que l'hôte
 *  publie. On n'utilise pas le préfab <VideoConference/> de LiveKit
 *  volontairement : il embarque son propre chat non filtré côté serveur —
 *  voir la note dans PublicChat.tsx. */
function VideoView() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  return (
    <div className="flex-1 p-2">
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

/** Mode "Réunion" : pas d'écran à regarder, juste la voix. */
function AudioOnlyView() {
  const participants = useParticipants();
  return (
    <div className="flex flex-1 flex-wrap content-start gap-3 p-6">
      {participants.map((p) => (
        <div key={p.identity} className="flex flex-col items-center gap-2 rounded-xl bg-panel px-5 py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-panel-raised text-lg font-bold text-text">
            {(p.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm text-text">{p.name || "Invité"}</span>
        </div>
      ))}
    </div>
  );
}

/** Barre d'outils hôte : verrouillage de salle, coupure générale des micros,
 *  et exclusion individuelle. Rendue à l'intérieur de <LiveKitRoom> pour
 *  avoir accès à la liste des participants en direct. */
function HostToolbar({ eventId }: { eventId: string }) {
  const participants = useParticipants();
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  async function toggleRecording() {
    setBusy(true);
    setRecordError(null);
    try {
      if (egressId) {
        await api.post(`/events/${eventId}/live/recording/stop`, { egressId });
        setEgressId(null);
      } else {
        const res = await api.post<{ egressId: string }>(`/events/${eventId}/live/recording/start`, {});
        setEgressId(res.egressId);
      }
    } catch (err) {
      setRecordError(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLock() {
    setBusy(true);
    try {
      await api.post(`/events/${eventId}/live/lock`, { locked: !locked });
      setLocked((l) => !l);
    } finally {
      setBusy(false);
    }
  }

  async function muteAll() {
    setBusy(true);
    try {
      await api.post(`/events/${eventId}/live/mute-all`, {});
    } finally {
      setBusy(false);
    }
  }

  async function kick(identity: string) {
    if (!confirm("Exclure cette personne de la salle ?")) return;
    await api.post(`/events/${eventId}/live/kick`, { targetIdentity: identity });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2.5">
      <div className="flex gap-2">
        <button
          onClick={toggleLock} disabled={busy}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${locked ? "bg-live/20 text-live" : "bg-panel-raised text-muted"}`}
        >
          {locked ? "Salle verrouillée" : "Verrouiller la salle"}
        </button>
        <button onClick={muteAll} disabled={busy} className="rounded-full bg-panel-raised px-3 py-1.5 text-xs font-semibold text-muted">
          Couper tous les micros
        </button>
        <button
          onClick={toggleRecording} disabled={busy}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${egressId ? "bg-live/20 text-live" : "bg-panel-raised text-muted"}`}
        >
          {egressId ? "● Arrêter l'enregistrement" : "Enregistrer (PRO)"}
        </button>
        {recordError && <span className="text-xs text-live">{recordError}</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {participants.filter((p) => !p.isLocal).map((p) => (
          <button
            key={p.identity}
            onClick={() => kick(p.identity)}
            title="Exclure"
            className="rounded-full bg-panel-raised px-2.5 py-1 hover:bg-live/20 hover:text-live"
          >
            {p.name || "Invité"} ✕
          </button>
        ))}
      </div>
    </div>
  );
}
