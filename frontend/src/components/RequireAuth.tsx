import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

/** Protège une route : attend de savoir si quelqu'un est connecté avant de
 *  décider quoi que ce soit (sinon un utilisateur connecté se ferait
 *  rediriger pendant la fraction de seconde où /auth/me est encore en
 *  vol), puis redirige vers /connexion en gardant la page visée. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-muted">Chargement…</div>;
  }
  if (!user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
