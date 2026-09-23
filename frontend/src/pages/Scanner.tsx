import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api, ApiError } from "../lib/api";
import type { Ticket } from "../lib/types";

type Feedback = { kind: "success" | "error"; message: string; detail?: string } | null;

// Deux petits sons synthétisés (pas de fichier audio à charger) — un bip clair
// pour un accès validé, un buzz grave pour un refus.
function playTone(freq: number, durationMs: number) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
  osc.onended = () => ctx.close();
}

export function Scanner() {
  const { id: eventId } = useParams();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [stats, setStats] = useState<{ sold: number; checkedIn: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (eventId) {
      api.get<{ sold: number; checkedIn: number }>(`/events/${eventId}/tickets/stats`).then(setStats).catch(() => {});
    }
  }, [eventId, feedback]);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (busyRef.current) return;
          busyRef.current = true;
          try {
            const { ticket } = await api.post<{ ticket: Ticket }>("/tickets/verify-pass", { token: decodedText });
            playTone(880, 150);
            setFeedback({ kind: "success", message: "Accès validé", detail: ticket.accessLevel });
          } catch (err) {
            playTone(160, 300);
            setFeedback({ kind: "error", message: err instanceof ApiError ? err.message : "Pass invalide." });
          } finally {
            setTimeout(() => { busyRef.current = false; }, 1500);
          }
        },
        () => {} // erreurs de décodage image-par-image, ignorées (bruit normal)
      )
      .catch(() => setFeedback({ kind: "error", message: "Impossible d'accéder à la caméra." }));

    return () => { scanner.stop().catch(() => {}); };
  }, []);

  return (
    <div className="mx-auto max-w-md px-6 py-8 text-center">
      <h1 className="text-xl font-bold text-text">Scanner d'entrée</h1>
      {stats && (
        <p className="mt-1 text-sm text-muted">
          {stats.checkedIn} / {stats.sold} entrées validées
        </p>
      )}

      <div id="qr-reader" className="mx-auto mt-5 overflow-hidden rounded-2xl" />

      {feedback && (
        <div
          className={`mt-5 rounded-xl p-5 font-semibold ${
            feedback.kind === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-live/15 text-live"
          }`}
        >
          {feedback.message}
          {feedback.detail && <div className="mt-1 text-sm opacity-80">{feedback.detail}</div>}
        </div>
      )}
    </div>
  );
}
