import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

import { authRouter } from "./modules/auth/auth.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { ticketsRouter } from "./modules/tickets/tickets.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { liveRouter } from "./modules/live/live.routes.js";
import { videosRouter } from "./modules/videos/videos.routes.js";
import { billingRouter } from "./modules/billing/billing.routes.js";
import { registerRealtime } from "./modules/realtime/socket.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[config] variable d'environnement manquante : ${key}`);
    process.exit(1);
  }
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));

// IMPORTANT : le webhook Stripe a besoin du corps BRUT pour vérifier la
// signature — on le monte donc AVANT express.json() global, sans quoi le
// body serait déjà consommé/parsé en JSON et la vérification échouerait.
app.use("/api", paymentsRouter);

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api", eventsRouter);
app.use("/api", ticketsRouter);
app.use("/api", liveRouter);
app.use("/api", videosRouter);
app.use("/api", billingRouter);

app.use(errorMiddleware);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});
registerRealtime(io);

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`Kido API — serveur démarré sur http://localhost:${port} (${process.env.NODE_ENV || "development"})`);
});
