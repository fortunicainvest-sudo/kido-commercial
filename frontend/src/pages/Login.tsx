import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-text">Content de te revoir</h1>
      <p className="mt-1 text-sm text-muted">Connecte-toi pour retrouver tes salles.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-muted">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted">Mot de passe</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-text outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-live">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="mt-2 rounded-lg bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ? <Link to="/inscription" className="text-accent-strong">Inscris-toi</Link>
      </p>
    </div>
  );
}
