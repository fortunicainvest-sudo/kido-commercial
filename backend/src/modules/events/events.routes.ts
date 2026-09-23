import { Router } from "express";
import { eventsService } from "./events.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, optionalAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const eventsRouter = Router();

eventsRouter.get("/modules", (_req, res) => {
  res.json({ modules: eventsService.listModules() });
});

eventsRouter.get("/events", optionalAuth, asyncHandler(async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const events = await eventsService.explorer(category);
  res.json({ events });
}));

eventsRouter.get("/events/mine", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const events = await eventsService.mine(req.userId!);
  res.json({ events });
}));

eventsRouter.get("/events/:id", asyncHandler(async (req, res) => {
  const event = await eventsService.detail(req.params.id);
  res.json({ event });
}));

eventsRouter.post("/events", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const event = await eventsService.create(req.userId!, req.body ?? {});
  res.status(201).json({ event });
}));

eventsRouter.get("/events/:id/tiers", asyncHandler(async (req, res) => {
  res.json({ tiers: await eventsService.tiers(req.params.id) });
}));

eventsRouter.get("/events/:id/moderators", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const moderators = await eventsService.listModerators(req.userId!, req.params.id);
  res.json({ moderators });
}));

eventsRouter.delete("/events/:id/moderators/:modId", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const ok = await eventsService.removeModerator(req.userId!, req.params.id, req.params.modId);
  res.json({ ok });
}));
