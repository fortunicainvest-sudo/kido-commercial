import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import type { Ticket } from "../lib/types";
import { formatPrice } from "../lib/format";

const ACCESS_COLOR: Record<string, string> = {
  STANDARD: "bg-panel-raised text-muted",
  VIP: "bg-live/20 text-live",
  SPEAKER: "bg-accent/20 text-accent-strong",
  STAFF: "bg-emerald-500/20 text-emerald-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente de paiement",
  valid: "Valide",
  used: "Utilisé",
  expired: "Expiré",
  cancelled: "Annulé",
};

export function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.get<{ tickets: Ticket[] }>("/tickets/mine").then((r) => setTickets(r.tickets));
  }, []);

  if (!tickets.length) {
    return <div className="mx-auto mt-24 max-w-md px-6 text-center text-muted">Tu n'as pas encore de billet.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-text">Mes billets</h1>
      <div className="mt-6 flex flex-col gap-4">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center gap-5 rounded-2xl bg-panel p-5">
            <div className="shrink-0 rounded-lg bg-white p-2">
              {t.passToken ? (
                <QRCodeSVG value={t.passToken} size={88} />
              ) : (
                <div className="flex h-[88px] w-[88px] items-center justify-center text-xs text-ink">
                  En attente
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ACCESS_COLOR[t.accessLevel]}`}>
                  {t.accessLevel}
                </span>
                <span className="text-xs text-muted">{STATUS_LABEL[t.status] ?? t.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Payé {formatPrice(t.pricePaidCents, t.currency)} · {new Date(t.createdAt).toLocaleDateString("fr-FR")}
              </p>
              {t.usedAt && (
                <p className="mt-0.5 text-xs text-faint">Scanné le {new Date(t.usedAt).toLocaleString("fr-FR")}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
