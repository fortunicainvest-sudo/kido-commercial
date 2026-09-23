import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { EventItem, VideoItem } from "../lib/types";
import { EventCard } from "../components/EventCard";
import { Rail } from "../components/Rail";
import { formatDate, formatPrice } from "../lib/format";

const CATEGORY_RAILS: { title: string; category?: string }[] = [
  { title: "En ce moment" },
  { title: "Concerts", category: "musique" },
  { title: "Cinéma", category: "cinema" },
  { title: "Conférences", category: "conference" },
  { title: "Sport", category: "sport" },
];

export function Explorer() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ events: EventItem[] }>("/events"),
      api.get<{ videos: VideoItem[] }>("/videos"),
    ])
      .then(([e, v]) => { setEvents(e.events); setVideos(v.videos); })
      .finally(() => setLoading(false));
  }, []);

  const hero = events[0];
  const byCategory = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const list = map.get(ev.category) ?? [];
      list.push(ev);
      map.set(ev.category, list);
    }
    return map;
  }, [events]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted">
        Chargement…
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="mx-auto mt-24 max-w-md px-6 text-center">
        <h1 className="text-2xl font-bold text-text">Aucun événement pour l'instant</h1>
        <p className="mt-2 text-muted">
          Sois la première personne à en créer un.
        </p>
        <Link to="/creer" className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 font-semibold text-white">
          Créer un événement
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {hero && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex h-[62vh] min-h-[420px] w-full items-end overflow-hidden"
        >
          <div className="absolute inset-0">
            {hero.coverUrl ? (
              <img src={hero.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-panel-raised to-ink" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          </div>
          <div className="relative z-10 max-w-xl px-6 pb-12 md:px-10">
            {hero.status === "live" && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-live/15 px-3 py-1 text-xs font-semibold text-live">
                <span className="h-1.5 w-1.5 rounded-full bg-live" /> En direct maintenant
              </span>
            )}
            <h1 className="text-4xl font-extrabold leading-tight text-text md:text-5xl">{hero.title}</h1>
            <p className="mt-3 line-clamp-2 text-muted">{hero.description}</p>
            <p className="mt-2 text-sm text-muted">
              {formatDate(hero.startsAt)} · {formatPrice(hero.priceCents, hero.currency)}
            </p>
            <Link
              to={`/evenements/${hero.id}`}
              className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              {hero.status === "live" ? "Rejoindre le direct" : "Voir l'événement"}
            </Link>
          </div>
        </motion.section>
      )}

      <Rail title="En ce moment">
        {events.slice(0, 12).map((ev) => <EventCard key={ev.id} event={ev} />)}
      </Rail>

      {CATEGORY_RAILS.filter((r) => r.category).map((rail) => {
        const list = byCategory.get(rail.category!);
        if (!list?.length) return null;
        return (
          <Rail key={rail.category} title={rail.title}>
            {list.map((ev) => <EventCard key={ev.id} event={ev} />)}
          </Rail>
        );
      })}

      {videos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 px-6 text-lg font-bold text-text md:px-10">Vidéos de la communauté</h2>
          <div className="rail flex gap-4 overflow-x-auto px-6 pb-2 md:px-10">
            {videos.slice(0, 12).map((v) => (
              <Link key={v.id} to={`/videos?v=${v.id}`} className="w-[220px] shrink-0">
                <div className="aspect-video overflow-hidden rounded-lg bg-panel-raised">
                  {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 truncate text-sm text-text">{v.title}</p>
                <p className="truncate text-xs text-muted">{v.creator.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
