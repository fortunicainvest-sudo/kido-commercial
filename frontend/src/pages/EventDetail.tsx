import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { EventItem, Tier } from "../lib/types";
import { formatDate, formatPrice } from "../lib/format";

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<{ event: EventItem }>(`/events/${id}`).then((r) => setEvent(r.event));
    api.get<{ tiers: Tier[] }>(`/events/${id}/tiers`).then((r) => {
      setTiers(r.tiers);
      if (r.tiers.length) setSelectedTier(r.tiers[0].accessLevel);
    });
  }, [id]);

  const activeTier = tiers.find((t) => t.accessLevel === selectedTier) ?? null;
  const effectivePriceCents = activeTier ? activeTier.priceCents : event?.priceCents ?? 0;

  async function reserve(provider?: "stripe" | "cinetpay") {
    if (!event) return;
    if (!user) { navigate("/connexion"); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ checkoutUrl: string | null }>(`/events/${event.id}/tickets/reserve`, {
        provider, accessLevel: selectedTier || undefined,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  if (!event) return <div className="flex h-[60vh] items-center justify-center text-muted">Chargement…</div>;

  const isFree = effectivePriceCents === 0;
  const isFull = activeTier ? activeTier.quantityLeft === 0 : event.seatsLeft === 0;
  const isHost = user?.id === event.creator.id;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl bg-panel-raised">
        {event.coverUrl && <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text">{event.title}</h1>
          <p className="mt-1 text-muted">
            {formatDate(event.startsAt)} · organisé par {event.creator.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text">{formatPrice(effectivePriceCents, event.currency)}</p>
          {event.maxSeats && !tiers.length && <p className="text-sm text-muted">{event.seatsLeft} place(s) restante(s)</p>}
        </div>
      </div>

      {event.description && <p className="mt-6 max-w-xl leading-relaxed text-muted">{event.description}</p>}

      {tiers.length > 0 && !isHost && event.status !== "live" && (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Choisis ton niveau d'accès</p>
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTier(t.accessLevel)}
              disabled={t.quantityLeft === 0}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                selectedTier === t.accessLevel ? "border-accent bg-accent-soft" : "border-line bg-panel hover:border-line"
              }`}
            >
              <span>
                <span className="font-semibold text-text">{t.label || t.accessLevel}</span>
                <span className="ml-2 text-xs text-muted">
                  {t.quantityLeft === 0 ? "Épuisé" : t.quantityLeft !== null ? `${t.quantityLeft} restante(s)` : ""}
                </span>
              </span>
              <span className="font-semibold text-text">{formatPrice(t.priceCents, event.currency)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-panel p-6">
        {isHost || event.status === "live" ? (
          <button
            onClick={() => navigate(`/salle/${event.id}`)}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-white hover:bg-accent-strong"
          >
            {isHost ? "Ouvrir ma salle" : "Rejoindre le direct"}
          </button>
        ) : done ? (
          <p className="text-center font-medium text-live">
            Ta place est confirmée — retrouve ton Kido Pass dans « Mes billets ».
          </p>
        ) : isFull ? (
          <p className="text-center text-muted">Complet.</p>
        ) : isFree ? (
          <button
            onClick={() => reserve()}
            disabled={busy}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "…" : "Réserver ma place gratuite"}
          </button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => reserve("cinetpay")}
              disabled={busy}
              className="flex-1 rounded-lg bg-accent py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
            >
              Mobile Money / CinetPay
            </button>
            <button
              onClick={() => reserve("stripe")}
              disabled={busy}
              className="flex-1 rounded-lg border border-line py-3 font-semibold text-text hover:border-accent disabled:opacity-60"
            >
              Carte bancaire
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-live">{error}</p>}
      </div>
    </div>
  );
}
