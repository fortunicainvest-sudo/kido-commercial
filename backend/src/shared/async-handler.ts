import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Évite le try/catch répété dans chaque route Express avec async/await. */
export function asyncHandler(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
