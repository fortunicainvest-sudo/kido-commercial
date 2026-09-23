import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../shared/http-error.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error("[erreur non gérée]", err);
  res.status(500).json({ error: "Une erreur interne est survenue." });
}
