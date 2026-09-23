import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

interface PlanLimits {
  maxMeetingMinutes: number | null; maxParticipants: number;
  maxVideoQuality: string; cloudRecording: boolean; recordingStorageGb: number;
}
interface PlansResponse { limits: Record<string, PlanLimits>; pricing: Record<string, { XOF: number; EUR: number }>; }

const PLAN_ORDER = ["FREE", "PRO", "ENTERPRISE"] as const;

export function SubscriptionTab() {
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<PlansResponse>("/billing/plans").then(setPlans);
    refresh();
  }, []);

  async function upgrade(plan: "PRO" | "ENTERPRISE", provider: "stripe" | "cinetpay") {
    setBusyPlan(plan);
    setError(null);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>("/billing/upgrade", { plan, provider });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inattendue.");
      setBusyPlan(null);
    }
  }

  if (!plans) return <p className="text-muted">Chargement…</p>;

  return (
    <div>
      <p className="text-sm text-muted">
        Plan actuel : <span className="font-semibold text-text">{user?.plan}</span>
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const limits = plans.limits[plan];
          const isCurrent = user?.plan === plan;
          const priceXof = plan === "FREE" ? 0 : plans.pricing[plan]?.XOF ?? 0;
          return (
            <div key={plan} className={`rounded-2xl p-6 ${isCurrent ? "bg-panel-raised ring-1 ring-accent" : "bg-panel"}`}>
              <p className="text-lg font-bold text-text">{plan}</p>
              <p className="mt-1 text-2xl font-extrabold text-text">
                {priceXof ? `${priceXof.toLocaleString("fr-FR")} FCFA` : "Gratuit"}
                {priceXof > 0 && <span className="text-sm font-normal text-muted"> /30 jours</span>}
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted">
                <li>{limits.maxMeetingMinutes ? `${limits.maxMeetingMinutes} min max` : "Durée illimitée"}</li>
                <li>{limits.maxParticipants} participants max</li>
                <li>Vidéo {limits.maxVideoQuality}</li>
                <li>{limits.cloudRecording ? `Enregistrement cloud (${limits.recordingStorageGb} Go)` : "Pas d'enregistrement cloud"}</li>
              </ul>

              {isCurrent ? (
                <p className="mt-5 text-center text-sm font-medium text-accent-strong">Plan actuel</p>
              ) : plan === "FREE" ? null : (
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => upgrade(plan, "cinetpay")}
                    disabled={busyPlan === plan}
                    className="rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
                  >
                    Passer {plan} — Mobile Money
                  </button>
                  <button
                    onClick={() => upgrade(plan, "stripe")}
                    disabled={busyPlan === plan}
                    className="rounded-lg border border-line py-2 text-sm font-semibold text-text hover:border-accent disabled:opacity-60"
                  >
                    Passer {plan} — Carte bancaire
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm text-live">{error}</p>}
    </div>
  );
}
