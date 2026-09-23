import { Router } from "express";
import { livekitService } from "./livekit.service.js";
import { recordingService } from "./recording.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const liveRouter = Router();

liveRouter.post("/events/:id/live/token", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const result = await livekitService.issueToken(req.userId!, req.params.id);
  res.json(result);
}));

liveRouter.post("/events/:id/live/permission", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { targetIdentity, canPublish } = req.body ?? {};
  await livekitService.updatePublishPermission(req.userId!, req.params.id, targetIdentity, !!canPublish);
  res.json({ ok: true });
}));

liveRouter.post("/events/:id/live/lock", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { locked } = req.body ?? {};
  await livekitService.setRoomLock(req.userId!, req.params.id, !!locked);
  res.json({ ok: true });
}));

liveRouter.post("/events/:id/live/kick", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { targetIdentity } = req.body ?? {};
  await livekitService.kickParticipant(req.userId!, req.params.id, targetIdentity);
  res.json({ ok: true });
}));

liveRouter.post("/events/:id/live/mute-all", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  await livekitService.muteAll(req.userId!, req.params.id);
  res.json({ ok: true });
}));

liveRouter.post("/events/:id/live/recording/start", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  res.json(await recordingService.start(req.userId!, req.params.id));
}));

liveRouter.post("/events/:id/live/recording/stop", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { egressId } = req.body ?? {};
  res.json(await recordingService.stop(req.userId!, req.params.id, egressId));
}));
