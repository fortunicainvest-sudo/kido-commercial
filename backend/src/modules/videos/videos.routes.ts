import { Router } from "express";
import { videosService } from "./videos.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const videosRouter = Router();

videosRouter.get("/videos", asyncHandler(async (_req, res) => {
  res.json({ videos: await videosService.feed() });
}));

videosRouter.get("/videos/:id", asyncHandler(async (req, res) => {
  res.json({ video: await videosService.view(req.params.id) });
}));

videosRouter.post("/videos/upload-url", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { contentType } = req.body ?? {};
  res.json(await videosService.requestUpload(req.userId!, contentType));
}));

videosRouter.post("/videos", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  res.status(201).json({ video: await videosService.publish(req.userId!, req.body ?? {}) });
}));

videosRouter.post("/videos/:id/like", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await videosService.like(req.userId!, req.params.id);
  res.json({ ok: true });
}));

videosRouter.delete("/videos/:id/like", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await videosService.unlike(req.userId!, req.params.id);
  res.json({ ok: true });
}));
