import Stripe from "stripe";
import type { PaymentProvider, CreateCheckoutParams, CheckoutResult } from "./payment-provider.interface.js";

let client: Stripe | null = null;
function getClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY manquant — configure ta clé Stripe (test ou live) dans .env");
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const stripe = getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.buyerEmail,
      line_items: [{
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountCents,
          product_data: { name: `Billet — ${params.eventTitle}` },
        },
        quantity: 1,
      }],
      metadata: { ticketId: params.ticketId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
    return { checkoutUrl: session.url, providerReference: session.id };
  },

  async verifyPayment(providerReference: string): Promise<{ paid: boolean }> {
    const stripe = getClient();
    const session = await stripe.checkout.sessions.retrieve(providerReference);
    return { paid: session.payment_status === "paid" };
  },
};

/** Utilisé par le webhook : vérifie la signature Stripe sur le corps brut
 *  de la requête (Express doit être configuré en express.raw() sur cette
 *  route précise — voir payments.routes.ts). */
export function constructStripeEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const stripe = getClient();
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET manquant.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
