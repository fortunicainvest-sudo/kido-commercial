import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { EventItem } from "../../lib/types";
import { formatDate, formatPrice } from "../../lib/format";

export function EventsTab() {
  const [events, setEvents] = useState<EventItem[] | null>(null);

  useEffect(() => {
    api.get<{ events: EventItem[] }>("/events/mine").then((r) => setEvents(r.events));
  }, []);

  if (events === null) return <p className="text-muted">Chargement…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{events.length} événement(s) créé(s)</p>
        <Link to="/creer" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
          + Nouvel événement
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between rounded-xl bg-panel p-4">
            <div>
              <p className="font-semibold text-text">{ev.title}</p>
              <p className="text-sm text-muted">
                {formatDate(ev.startsAt)} · {formatPrice(ev.priceCents, ev.currency)} · {ev.seatsSold} vendu(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/evenements/${ev.id}`} className="rounded-full bg-panel-raised px-3 py-1.5 text-xs font-semibold text-text">
                Voir
              </Link>
              <Link to={`/scanner/${ev.id}`} className="rounded-full bg-panel-raised px-3 py-1.5 text-xs font-semibold text-text">
                Scanner
              </Link>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-muted">Tu n'as encore rien créé.</p>}
      </div>
    </div>
  );
}
