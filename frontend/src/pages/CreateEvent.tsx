import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { ModuleInfo, EventItem } from "../lib/types";

interface TierDraft { accessLevel: string; label: string; price: string; maxQuantity: string; }
const TIER_LEVELS = ["VIP", "SPEAKER", "STAFF"];

export function CreateEvent() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [moduleKey, setModuleKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [price, setPrice] = useState("0");
  const [maxSeats, setMaxSeats] = useState("");
  const [priv, setPriv] = useState(false);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ modules: ModuleInfo[] }>("/modules").then((r) => setModules(r.modules));
  }, []);

  const mod = modules.find((m) => m.key === moduleKey);

  useEffect(() => {
    if (mod?.forcedVisibility === "private") setPriv(true);
  }, [mod]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mod) return;
    setBusy(true);
    setError(null);
    try {
      const { event } = await api.post<{ event: EventItem }>("/events", {
        module: mod.key,
        title,
        description,
        coverUrl: coverUrl || undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        price: mod.ticketing ? Number(price) || 0 : 0,
        maxSeats: maxSeats ? Number(maxSeats) : null,
        visibility: priv ? "private" : "public",
        tiers: mod.ticketing && tiers.length
          ? tiers.filter((t) => t.accessLevel).map((t) => ({
              accessLevel: t.accessLevel,
              label: t.label || undefined,
              priceCents: Math.round((Number(t.price) || 0) * 100),
              maxQuantity: t.maxQuantity ? Number(t.maxQuantity) : null,
            }))
          : undefined,
      });
      navigate(`/evenements/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  if (!moduleKey) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-text">Que veux-tu créer ?</h1>
        <p className="mt-1 text-muted">Chaque type a ses propres réglages.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {modules.map((m) => (
            <button
              key={m.key}
              onClick={() => setModuleKey(m.key)}
              className="flex flex-col items-start gap-2 rounded-2xl bg-panel p-5 text-left transition-colors hover:bg-panel-raised"
            >
              <span className="text-2xl">{m.icon}</span>
              <span className="font-semibold text-text">{m.label}</span>
              <span className="text-xs text-muted">{m.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <button onClick={() => setModuleKey(null)} className="text-sm text-muted hover:text-text">← Changer de type</button>
      <h1 className="mt-3 text-2xl font-bold text-text">{mod?.icon} {mod?.label}</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Titre">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Image de couverture (URL)">
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className={inputClass} placeholder="https://..." />
        </Field>
        <Field label="Date de début">
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
        </Field>

        {mod?.ticketing && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix standard">
                <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Places max">
                <input type="number" min={1} value={maxSeats} onChange={(e) => setMaxSeats(e.target.value)} className={inputClass} placeholder="illimité" />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Niveaux d'accès supplémentaires (Kido Pass)</p>
                <button
                  type="button"
                  onClick={() => setTiers((t) => [...t, { accessLevel: "VIP", label: "", price: "", maxQuantity: "" }])}
                  className="text-sm font-semibold text-accent-strong"
                >
                  + Ajouter
                </button>
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="mt-2 grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2">
                  <select
                    value={tier.accessLevel}
                    onChange={(e) => setTiers((ts) => ts.map((t, j) => j === i ? { ...t, accessLevel: e.target.value } : t))}
                    className="rounded-lg border border-line bg-panel px-2 py-2 text-sm text-text"
                  >
                    {TIER_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    placeholder="Libellé" value={tier.label}
                    onChange={(e) => setTiers((ts) => ts.map((t, j) => j === i ? { ...t, label: e.target.value } : t))}
                    className="rounded-lg border border-line bg-panel px-2 py-2 text-sm text-text"
                  />
                  <input
                    type="number" min={0} placeholder="Prix" value={tier.price}
                    onChange={(e) => setTiers((ts) => ts.map((t, j) => j === i ? { ...t, price: e.target.value } : t))}
                    className="rounded-lg border border-line bg-panel px-2 py-2 text-sm text-text"
                  />
                  <input
                    type="number" min={1} placeholder="Quota" value={tier.maxQuantity}
                    onChange={(e) => setTiers((ts) => ts.map((t, j) => j === i ? { ...t, maxQuantity: e.target.value } : t))}
                    className="rounded-lg border border-line bg-panel px-2 py-2 text-sm text-text"
                  />
                  <button type="button" onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))} className="text-faint">✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox" checked={priv} disabled={mod?.forcedVisibility === "private"}
            onChange={(e) => setPriv(e.target.checked)}
          />
          Événement privé (accessible seulement par lien)
        </label>

        {error && <p className="text-sm text-live">{error}</p>}

        <button type="submit" disabled={busy} className="mt-2 rounded-lg bg-accent py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60">
          {busy ? "Création…" : "Créer l'événement"}
        </button>
      </form>
    </div>
  );
}

const inputClass = "mt-1.5 w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-text outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
