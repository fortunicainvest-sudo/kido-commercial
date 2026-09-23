// Intégration CinetPay (API "Checkout" v2) — couvre Orange Money, MTN Money,
// Moov Money, Wave et carte bancaire en un seul contrat pour la Côte
// d'Ivoire / UEMOA.
//
// ⚠️ Les noms de champs ci-dessous suivent la documentation publique de
// CinetPay v2 au moment de l'écriture. Comme ce projet n'a pas d'accès
// réseau vers cinetpay.com pour tester en conditions réelles, vérifie ces
// champs contre ton propre tableau de bord marchand avant la mise en
// production — en particulier les champs "channels" et le format exact
// de la réponse de /v2/payment/check.
import type { PaymentProvider, CreateCheckoutParams, CheckoutResult } from "./payment-provider.interface.js";
import { nanoid } from "nanoid";

const BASE_URL = "https://api-checkout.cinetpay.com/v2";

function requireEnv() {
  const { CINETPAY_API_KEY, CINETPAY_SITE_ID } = process.env;
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    throw new Error("CINETPAY_API_KEY / CINETPAY_SITE_ID manquants — configure ton compte marchand dans .env");
  }
  return { apikey: CINETPAY_API_KEY, site_id: CINETPAY_SITE_ID };
}

export const cinetpayProvider: PaymentProvider = {
  name: "cinetpay",

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const { apikey, site_id } = requireEnv();
    const transactionId = `kido-${nanoid(16)}`;

    const res = await fetch(`${BASE_URL}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey,
        site_id,
        transaction_id: transactionId,
        amount: params.amountCents / 100, // CinetPay attend un montant en unité principale, pas en centimes
        currency: params.currency,        // "XOF" typiquement
        description: `Billet — ${params.eventTitle}`,
        customer_name: params.buyerName,
        customer_email: params.buyerEmail,
        notify_url: `${process.env.PUBLIC_API_URL}/api/payments/cinetpay/webhook`,
        return_url: params.successUrl,
        channels: "ALL",
        metadata: params.ticketId,
      }),
    });

    const data = await res.json() as { code?: string; message?: string; data?: { payment_url?: string } };
    if (data.code !== "201" || !data.data?.payment_url) {
      throw new Error(`CinetPay a refusé la création du paiement : ${data.message ?? "réponse inattendue"}`);
    }

    return { checkoutUrl: data.data.payment_url, providerReference: transactionId };
  },

  async verifyPayment(providerReference: string): Promise<{ paid: boolean }> {
    const { apikey, site_id } = requireEnv();
    const res = await fetch(`${BASE_URL}/payment/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, site_id, transaction_id: providerReference }),
    });
    const data = await res.json() as { data?: { status?: string } };
    return { paid: data.data?.status === "ACCEPTED" };
  },
};
