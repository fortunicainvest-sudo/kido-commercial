import { Router } from "express";
import { ticketsService } from "./tickets.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const ticketsRouter = Router();

ticketsRouter.post("/events/:id/tickets/reserve", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { provider, successUrl, cancelUrl, accessLevel } = req.body ?? {};
  const result = await ticketsService.reserve(req.userId!, req.params.id, { provider, successUrl, cancelUrl, accessLevel });
  res.status(201).json(result);
}));

ticketsRouter.get("/tickets/mine", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const tickets = await ticketsService.mine(req.userId!);
  res.json({ tickets });
}));

ticketsRouter.get("/events/:id/tickets/stats", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const stats = await ticketsService.statsForEvent(req.userId!, req.params.id);
  res.json(stats);
}));

ticketsRouter.get("/dashboard/tickets", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  res.json({ tickets: await ticketsService.forCreator(req.userId!) });
}));

ticketsRouter.get("/dashboard/analytics", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  res.json(await ticketsService.analyticsForCreator(req.userId!));
}));

ticketsRouter.post("/tickets/check-in", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { code } = req.body ?? {};
  const ticket = await ticketsService.checkIn(req.userId!, code);
  res.json({ ticket });
}));

// Utilisé par le scanner : le QR encode le Kido Pass (JWT), pas juste le code.
ticketsRouter.post("/tickets/verify-pass", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { token } = req.body ?? {};
  const ticket = await ticketsService.verifyPass(req.userId!, token);
  res.json({ ticket });
}));
