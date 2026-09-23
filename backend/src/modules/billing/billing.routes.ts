import { Router } from "express";
import { billingService } from "./billing.service.js";
import { PLAN_LIMITS } from "./plan-limits.js";
import { PLAN_PRICING } from "./billing.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const billingRouter = Router();

billingRouter.get("/billing/plans", (_req, res) => {
  res.json({ limits: PLAN_LIMITS, pricing: PLAN_PRICING });
});

billingRouter.get("/billing/me", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  res.json(await billingService.myPlan(req.userId!));
}));

billingRouter.post("/billing/upgrade", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { plan, provider, successUrl, cancelUrl } = req.body ?? {};
  const result = await billingService.createUpgradeCheckout(req.userId!, plan, provider, { successUrl, cancelUrl });
  res.json(result);
}));
