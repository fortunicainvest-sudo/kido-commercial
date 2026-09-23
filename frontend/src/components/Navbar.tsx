import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

const LINKS = [
  { to: "/", label: "Explorer" },
  { to: "/videos", label: "Vidéos" },
  { to: "/creer", label: "Créer" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-10">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-text" onClick={() => setOpen(false)}>
            KIDO
          </Link>
          <nav className="hidden gap-6 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to} to={link.to} end={link.to === "/"}
                className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? "text-text" : "text-muted hover:text-text"}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link to="/billets" className="text-sm font-medium text-muted hover:text-text">Mes billets</Link>
              <Link to="/tableau-de-bord" className="text-sm font-medium text-muted hover:text-text">Tableau de bord</Link>
              <Link to="/compte" className="rounded-full bg-panel-raised px-3 py-1.5 text-sm font-semibold text-text">
                {user.name.split(" ")[0]}
              </Link>
              <button onClick={logout} className="text-sm text-faint hover:text-muted">Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="text-sm font-medium text-muted hover:text-text">Connexion</Link>
              <Link to="/inscription" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong">
                S'inscrire
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className={`h-0.5 w-5 bg-text transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-5 bg-text transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-5 bg-text transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-6 py-4 md:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to} to={link.to} end={link.to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-panel-raised text-text" : "text-muted"}`}
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <Link to="/billets" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted">Mes billets</Link>
              <Link to="/tableau-de-bord" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted">Tableau de bord</Link>
              <Link to="/compte" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted">{user.name}</Link>
              <button onClick={() => { logout(); setOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-faint">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted">Connexion</Link>
              <Link to="/inscription" onClick={() => setOpen(false)} className="mt-1 rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white">
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
