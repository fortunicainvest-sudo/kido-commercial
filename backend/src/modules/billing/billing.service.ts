import { subscriptionsRepository } from "./subscriptions.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { stripeProvider } from "../payments/stripe.provider.js";
import { cinetpayProvider } from "../payments/cinetpay.provider.js";
import type { PaymentProvider } from "../payments/payment-provider.interface.js";
import { badRequest, notFound } from "../../shared/http-error.js";

// ⚠️ Tarification provisoire — à ajuster avec les vrais prix voulus avant
// la mise en production. Facturation "à la période" (30 jours) via un
// paiement ponctuel, pas un abonnement récurrent Stripe/CinetPay natif :
// pour du vrai prélèvement automatique mensuel, il faudra passer par les
// objets "Subscription" natifs de Stripe (Price récurrent) — plus de
// travail d'intégration que ce qui est fait ici pour le MVP.
export const PLAN_PRICING: Record<"PRO" | "ENTERPRISE", { XOF: number; EUR: number }> = {
  PRO:        { XOF: 15_000_00 / 100, EUR: 25_00 / 100 }, // 15 000 FCFA ou 25 € / 30 jours
  ENTERPRISE: { XOF: 60_000_00 / 100, EUR: 100_00 / 100 }, // 60 000 FCFA ou 100 € / 30 jours
};

function providerFor(name: string): PaymentProvider {
  if (name === "stripe") return stripeProvider;
  if (name === "cinetpay") return cinetpayProvider;
  throw badRequest("Moyen de paiement inconnu.");
}

export const billingService = {
  async createUpgradeCheckout(userId: string, plan: "PRO" | "ENTERPRISE", providerName: "stripe" | "cinetpay", opts: { successUrl?: string; cancelUrl?: string } = {}) {
    if (!["PRO", "ENTERPRISE"].includes(plan)) throw badRequest("Plan invalide.");

    const user = await authRepository.findById(userId);
    if (!user) throw notFound("Utilisateur introuvable.");

    const currency = providerName === "cinetpay" ? "XOF" : "EUR";
    const amountCents = Math.round(PLAN_PRICING[plan][currency] * 100);

    const subscription = await subscriptionsRepository.createPending(
      userId, providerName === "stripe" ? "STRIPE" : "CINETPAY", plan
    );

    const provider = providerFor(providerName);
    const checkout = await provider.createCheckout({
      ticketId: subscription.id, // champ générique côté interface — sert ici de référence d'abonnement, pas de billet
      amountCents,
      currency,
      eventTitle: `Abonnement KIDO ${plan} — 30 jours`,
      buyerEmail: user.email,
      buyerName: user.name,
      successUrl: opts.successUrl || `${process.env.CORS_ORIGIN}/compte/abonnement?paiement=succes`,
      cancelUrl: opts.cancelUrl || `${process.env.CORS_ORIGIN}/compte/abonnement?paiement=annule`,
    });

    await subscriptionsRepository.setExternalReference(subscription.id, checkout.providerReference);
    return { checkoutUrl: checkout.checkoutUrl };
  },

  /** Appelé par les webhooks Stripe/CinetPay — idempotent comme pour les
   *  billets. Renvoie null si la référence ne correspond à aucun abonnement
   *  (dans ce cas l'appelant doit essayer côté billetterie à la place). */
  async confirmPayment(provider: "stripe" | "cinetpay", providerReference: string) {
    const providerKey = provider === "stripe" ? "STRIPE" : "CINETPAY";
    const subscription = await subscriptionsRepository.byProviderReference(providerKey, providerReference);
    if (!subscription) return null;
    if (subscription.status !== "PENDING") return subscription; // déjà traité
    return subscriptionsRepository.activate(subscription.id);
  },

  async myPlan(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw notFound();
    const subscription = await subscriptionsRepository.latestForUser(userId);
    return {
      plan: user.plan,
      currentPeriodEnd: subscription?.status === "ACTIVE" ? subscription.current_period_end : null,
    };
  },
};
