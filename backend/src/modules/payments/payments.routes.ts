import { Router, raw, json } from "express";
import { ticketsService } from "../tickets/tickets.service.js";
import { billingService } from "../billing/billing.service.js";
import { constructStripeEvent } from "./stripe.provider.js";
import { cinetpayProvider } from "./cinetpay.provider.js";
import { asyncHandler } from "../../shared/async-handler.js";

export const paymentsRouter = Router();

/** Une même référence de paiement peut correspondre à un billet OU à un
 *  abonnement — on tente les deux plutôt que de faire porter au webhook la
 *  connaissance de ce qu'il confirme. */
async function confirmAnyPayment(provider: "stripe" | "cinetpay", reference: string) {
  const ticket = await ticketsService.confirmPayment(provider, reference);
  if (ticket) return;
  await billingService.confirmPayment(provider, reference);
}

// Stripe exige le corps BRUT (non parsé en JSON) pour vérifier la signature —
// cette route doit être montée AVANT tout express.json() global, ou avec son
// propre middleware raw() comme ici (voir server.ts).
paymentsRouter.post("/payments/stripe/webhook", raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") return res.status(400).send("Signature manquante.");

  let event;
  try {
    event = constructStripeEvent(req.body as Buffer, signature);
  } catch (err) {
    console.error("[stripe webhook] signature invalide :", err);
    return res.status(400).send("Signature invalide.");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string };
    await confirmAnyPayment("stripe", session.id);
  }

  res.json({ received: true });
}));

// CinetPay envoie une simple notification POST (non signée) — on ne fait
// jamais confiance à son contenu seul : on rappelle leur API de vérification
// avant de valider quoi que ce soit (voir cinetpay.provider.ts::verifyPayment).
paymentsRouter.post("/payments/cinetpay/webhook", json(), asyncHandler(async (req, res) => {
  const transactionId = req.body?.cpm_trans_id || req.body?.transaction_id;
  if (!transactionId) return res.status(400).json({ error: "transaction_id manquant." });

  const { paid } = await cinetpayProvider.verifyPayment(transactionId);
  if (paid) {
    await confirmAnyPayment("cinetpay", transactionId);
  }

  res.json({ received: true });
}));
