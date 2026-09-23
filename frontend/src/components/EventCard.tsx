import { Link } from "react-router-dom";
import type { EventItem } from "../lib/types";
import { formatPrice, formatDate } from "../lib/format";

const MODULE_ICON: Record<string, string> = {
  concert: "🎤", reunion: "🗣️", cinema: "🎬", conference: "🎓", match: "⚽", prive: "🔒",
};

export function EventCard({ event }: { event: EventItem }) {
  const isLive = event.status === "live";
  return (
    <Link
      to={`/evenements/${event.id}`}
      className="group relative w-[240px] shrink-0 overflow-hidden rounded-xl bg-panel transition-transform duration-200 ease-out hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-panel-raised">
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            {MODULE_ICON[event.module] ?? "🎫"}
          </div>
        )}
        {isLive && (
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-ink/80 px-2 py-1 text-[11px] font-semibold text-live backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-live" />
            En direct
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-text">{event.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {formatDate(event.startsAt)} · {formatPrice(event.priceCents, event.currency)}
        </p>
      </div>
    </Link>
  );
}
