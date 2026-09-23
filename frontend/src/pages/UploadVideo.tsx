import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export function UploadVideo() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<"idle" | "uploading" | "publishing">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);

    try {
      setProgress("uploading");
      const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>("/videos/upload-url", {
        contentType: file.type,
      });

      // Upload direct navigateur → R2, le fichier ne transite jamais par
      // notre serveur (voir storage.service.ts côté backend).
      const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("L'envoi du fichier vers le stockage a échoué.");

      setProgress("publishing");
      const { video } = await api.post<{ video: { id: string } }>("/videos", { title, description, storageKey: key });
      navigate(`/videos?v=${video.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Erreur inattendue.");
      setProgress("idle");
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold text-text">Publier une vidéo</h1>
      <p className="mt-1 text-sm text-muted">Format mp4, webm ou mov.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="file" accept="video/mp4,video/webm,video/quicktime" required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-panel-raised file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text"
        />
        <input
          required placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3.5 py-2.5 text-text outline-none focus:border-accent"
        />
        <textarea
          rows={3} placeholder="Description (facultatif)" value={description} onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3.5 py-2.5 text-text outline-none focus:border-accent"
        />

        {error && <p className="text-sm text-live">{error}</p>}

        <button
          type="submit" disabled={progress !== "idle" || !file}
          className="rounded-lg bg-accent py-3 font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {progress === "uploading" ? "Envoi en cours…" : progress === "publishing" ? "Publication…" : "Publier"}
        </button>
      </form>
    </div>
  );
}
