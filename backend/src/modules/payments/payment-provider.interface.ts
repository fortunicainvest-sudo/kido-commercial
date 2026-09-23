// Interface commune aux deux moyens de paiement (Stripe pour l'international,
// CinetPay pour la Côte d'Ivoire/UEMOA) — le reste de l'app ne connaît que
// cette interface, jamais les détails d'un fournisseur en particulier.

export interface CreateCheckoutParams {
  ticketId: string;
  amountCents: number;
  currency: string;      // "XOF", "EUR", "USD"...
  eventTitle: string;
  buyerEmail: string;
  buyerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;         // où rediriger l'acheteur pour payer
  providerReference: string;   // identifiant à stocker sur le ticket (pour retrouver le paiement)
}

export interface PaymentProvider {
  readonly name: "stripe" | "cinetpay";
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;
  /** Vérifie côté serveur qu'un paiement est bien confirmé — jamais faire
   *  confiance au seul contenu d'un webhook sans cette vérification. */
  verifyPayment(providerReference: string): Promise<{ paid: boolean }>;
}
