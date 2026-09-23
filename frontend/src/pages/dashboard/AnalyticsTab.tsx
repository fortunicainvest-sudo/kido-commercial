import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/format";

interface Analytics {
  totalRevenueCents: number;
  ticketsSold: number;
  checkedIn: number;
  attendanceRate: number;
  revenueByDay: { day: string; revenueCents: number }[];
}

export function AnalyticsTab() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    api.get<Analytics>("/dashboard/analytics").then(setData);
  }, []);

  if (!data) return <p className="text-muted">Chargement…</p>;

  const max = Math.max(...data.revenueByDay.map((d) => d.revenueCents), 1);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Revenus totaux" value={formatPrice(data.totalRevenueCents, "XOF")} />
        <Stat label="Billets vendus" value={String(data.ticketsSold)} />
        <Stat label="Taux de présence" value={`${Math.round(data.attendanceRate * 100)}%`} />
      </div>

      <div className="mt-6 rounded-2xl bg-panel p-6">
        <p className="mb-4 text-sm font-semibold text-muted">Revenus par jour</p>
        {data.revenueByDay.length === 0 ? (
          <p className="text-muted">Pas encore de vente.</p>
        ) : (
          <div className="flex h-40 items-end gap-1.5">
            {data.revenueByDay.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-accent transition-colors group-hover:bg-accent-strong"
                  style={{ height: `${Math.max((d.revenueCents / max) * 100, 4)}%` }}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted opacity-0 group-hover:opacity-100">
                  {formatPrice(d.revenueCents, "XOF")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
    </div>
  );
}
