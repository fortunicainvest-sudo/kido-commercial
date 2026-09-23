import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { unauthorized } from "../shared/http-error.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

/** Lit le Bearer token, attache userId à la requête. Bloque si absent/invalide. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized());

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    next(unauthorized("Session expirée, reconnecte-toi."));
  }
}

/** Comme requireAuth, mais laisse passer sans compte — utile pour les routes
 *  publiques qui personnalisent juste la réponse si quelqu'un est connecté. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      req.userId = payload.sub;
    } catch {
      /* token invalide : on continue simplement sans utilisateur connecté */
    }
  }
  next();
}
