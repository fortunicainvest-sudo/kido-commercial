import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/format";

interface DashboardTicket {
  id: string; eventTitle: string; buyerName: string; buyerEmail: string;
  accessLevel: string; status: string; pricePaidCents: number; currency: string; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", valid: "Validé", used: "Utilisé", expired: "Expiré", cancelled: "Annulé",
};

function toCsv(tickets: DashboardTicket[]): string {
  const header = ["Événement", "Acheteur", "Email", "Niveau", "Statut", "Prix", "Date"];
  const rows = tickets.map((t) => [
    t.eventTitle, t.buyerName, t.buyerEmail, t.accessLevel, STATUS_LABEL[t.status] ?? t.status,
    (t.pricePaidCents / 100).toString(), new Date(t.createdAt).toLocaleDateString("fr-FR"),
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function TicketingTab() {
  const [tickets, setTickets] = useState<DashboardTicket[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api.get<{ tickets: DashboardTicket[] }>("/dashboard/tickets").then((r) => setTickets(r.tickets));
  }, []);

  if (tickets === null) return <p className="text-muted">Chargement…</p>;

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "kido-billetterie.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "valid", "used", "pending", "cancelled"].map((s) => (
            <button
              key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-accent text-white" : "bg-panel-raised text-muted"}`}
            >
              {s === "all" ? "Tous" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-text">
          Exporter en CSV
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="p-3">Événement</th><th className="p-3">Acheteur</th>
              <th className="p-3">Niveau</th><th className="p-3">Statut</th><th className="p-3">Prix</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-line/60 text-text last:border-0">
                <td className="p-3">{t.eventTitle}</td>
                <td className="p-3">{t.buyerName}</td>
                <td className="p-3">{t.accessLevel}</td>
                <td className="p-3">{STATUS_LABEL[t.status] ?? t.status}</td>
                <td className="p-3">{formatPrice(t.pricePaidCents, t.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-muted">Aucun billet.</p>}
      </div>
    </div>
  );
}
