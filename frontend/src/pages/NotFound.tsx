import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-sm px-6 text-center">
      <h1 className="text-2xl font-bold text-text">Page introuvable</h1>
      <p className="mt-2 text-muted">Ce lien ne mène nulle part — ou plus nulle part.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 font-semibold text-white">
        Retour à l'explorateur
      </Link>
    </div>
  );
}
