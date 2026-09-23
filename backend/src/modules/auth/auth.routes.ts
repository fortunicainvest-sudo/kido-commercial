import { Router } from "express";
import { authService } from "./auth.service.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password, country } = req.body ?? {};
  const result = await authService.register(name, email, password, country);
  res.status(201).json(result);
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  const result = await authService.login(email, password);
  res.json(result);
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await authService.me(req.userId!);
  res.json({ user });
}));
