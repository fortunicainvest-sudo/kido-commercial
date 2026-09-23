import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { VideoItem } from "../lib/types";

export function VideoFeed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [active, setActive] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<{ videos: VideoItem[] }>("/videos").then((r) => {
      setVideos(r.videos);
      const targetId = searchParams.get("v");
      const idx = targetId ? r.videos.findIndex((v) => v.id === targetId) : -1;
      if (idx >= 0) setActive(idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleLike(video: VideoItem) {
    if (!user) return;
    const isLiked = !!liked[video.id];
    setLiked((l) => ({ ...l, [video.id]: !isLiked }));
    setVideos((vs) => vs.map((v) => v.id === video.id ? { ...v, likeCount: v.likeCount + (isLiked ? -1 : 1) } : v));
    try {
      if (isLiked) await api.del(`/videos/${video.id}/like`);
      else await api.post(`/videos/${video.id}/like`);
    } catch {
      // on ne fait pas échouer l'UI pour un like — l'état repart en sync au prochain chargement
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6">
      <div className="mb-4 flex w-full items-center justify-between">
        <h1 className="text-lg font-bold text-text">Vidéos</h1>
        {user && (
          <Link to="/videos/nouvelle" className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white">
            + Ajouter
          </Link>
        )}
      </div>

      {!videos.length ? (
        <p className="mt-16 text-center text-muted">Aucune vidéo pour l'instant.</p>
      ) : (
        <>
          <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-panel">
            <video key={videos[active].id} src={videos[active].url} controls autoPlay className="h-full w-full object-cover" />
          </div>
          <div className="mt-4 flex w-full items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{videos[active].title}</p>
              <p className="text-sm text-muted">{videos[active].creator.name} · {videos[active].viewCount} vues</p>
            </div>
            <button
              onClick={() => toggleLike(videos[active])}
              disabled={!user}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${liked[videos[active].id] ? "bg-live/20 text-live" : "bg-panel-raised text-muted"}`}
            >
              ♥ {videos[active].likeCount}
            </button>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              disabled={active === 0} onClick={() => setActive((i) => i - 1)}
              className="rounded-full bg-panel-raised px-4 py-2 text-sm text-text disabled:opacity-40"
            >
              ← Précédente
            </button>
            <button
              disabled={active === videos.length - 1} onClick={() => setActive((i) => i + 1)}
              className="rounded-full bg-panel-raised px-4 py-2 text-sm text-text disabled:opacity-40"
            >
              Suivante →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
