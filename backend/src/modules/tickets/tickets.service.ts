import { ticketsRepository, type TicketRow } from "./tickets.repository.js";
import { eventsRepository } from "../events/events.repository.js";
import { tiersRepository } from "../tiers/tiers.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { stripeProvider } from "../payments/stripe.provider.js";
import { cinetpayProvider } from "../payments/cinetpay.provider.js";
import type { PaymentProvider } from "../payments/payment-provider.interface.js";
import { badRequest, notFound, forbidden } from "../../shared/http-error.js";
import { pool } from "../../db/pool.js";
import { signKidoPass, verifyKidoPass } from "./kido-pass.js";

type AccessLevel = "STANDARD" | "VIP" | "SPEAKER" | "STAFF";
const ACCESS_LEVELS: AccessLevel[] = ["STANDARD", "VIP", "SPEAKER", "STAFF"];

function providerFor(name: string): PaymentProvider {
  if (name === "stripe") return stripeProvider;
  if (name === "cinetpay") return cinetpayProvider;
  throw badRequest("Moyen de paiement inconnu — choisis 'stripe' ou 'cinetpay'.");
}

export function publicTicket(t: TicketRow) {
  return {
    id: t.id,
    eventId: t.event_id,
    code: t.code,
    accessLevel: t.access_level,
    // Le contenu à encoder dans le QR code du Kido Pass — null tant que le
    // paiement n'est pas confirmé (voir issueKidoPass ci-dessous).
    passToken: t.pass_token,
    status: t.status,
    pricePaidCents: t.price_paid_cents,
    currency: t.currency,
    usedAt: t.used_at,
    createdAt: t.created_at,
  };
}

/** Signe et attache le Kido Pass dès qu'un billet devient valide — jamais
 *  avant, un pass ne doit exister que pour une place réellement acquise. */
async function issueKidoPass(ticket: TicketRow): Promise<TicketRow> {
  const token = signKidoPass({ ticketId: ticket.id, eventId: ticket.event_id, accessLevel: ticket.access_level });
  await ticketsRepository.setPassToken(ticket.id, token);
  return { ...ticket, pass_token: token };
}

export const ticketsService = {
  /** Point d'entrée unique pour "je veux une place". Gratuit → place
   *  immédiatement valide. Payant → place "pending" + lien de paiement à
   *  finaliser chez le fournisseur choisi. */
  async reserve(userId: string, eventId: string, opts: { provider?: string; successUrl?: string; cancelUrl?: string; accessLevel?: string }) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound("Cet événement n'existe pas.");
    if (event.status === "cancelled") throw badRequest("Cet événement a été annulé.");

    const already = await ticketsRepository.userHasTicket(eventId, userId);
    if (already) throw badRequest("Tu as déjà une place pour cet événement.");

    // Si l'événement définit des paliers (VIP/SPEAKER/STAFF à prix
    // différents), c'est le palier choisi qui fixe le prix et le quota —
    // sinon on garde l'ancien comportement : un seul prix/quota sur
    // l'événement lui-même, palier STANDARD par défaut.
    const accessLevel: AccessLevel = ACCESS_LEVELS.includes(opts.accessLevel as AccessLevel)
      ? (opts.accessLevel as AccessLevel) : "STANDARD";
    const tier = await tiersRepository.byAccessLevel(eventId, accessLevel);

    const priceCents = tier ? tier.price_cents : event.price_cents;
    const seatReserved = tier
      ? await tiersRepository.tryReserveSeat(tier.id)
      : await eventsRepository.tryReserveSeat(eventId);
    if (!seatReserved) throw badRequest("Il n'y a plus de places disponibles pour ce niveau d'accès.");

    const releaseSeat = () => tier ? tiersRepository.releaseSeat(tier.id) : eventsRepository.releaseSeat(eventId);

    try {
      if (priceCents === 0) {
        const ticket = await ticketsRepository.create({
          eventId, buyerId: userId, status: "valid", priceCents: 0, currency: event.currency, provider: "free", accessLevel,
        });
        return { ticket: publicTicket(await issueKidoPass(ticket)), checkoutUrl: null };
      }

      if (!opts.provider) throw badRequest("Choisis un moyen de paiement : 'stripe' ou 'cinetpay'.");
      const provider = providerFor(opts.provider);
      const buyer = await authRepository.findById(userId);
      if (!buyer) throw notFound("Utilisateur introuvable.");

      const ticket = await ticketsRepository.create({
        eventId, buyerId: userId, status: "pending", priceCents, currency: event.currency,
        provider: provider.name, accessLevel,
      });

      const checkout = await provider.createCheckout({
        ticketId: ticket.id,
        amountCents: priceCents,
        currency: event.currency,
        eventTitle: tier?.label ? `${event.title} — ${tier.label}` : event.title,
        buyerEmail: buyer.email,
        buyerName: buyer.name,
        successUrl: opts.successUrl || `${process.env.CORS_ORIGIN}/events/${eventId}?paiement=succes`,
        cancelUrl: opts.cancelUrl || `${process.env.CORS_ORIGIN}/events/${eventId}?paiement=annule`,
      });

      await attachPaymentReference(ticket.id, checkout.providerReference);
      return { ticket: publicTicket({ ...ticket, payment_reference: checkout.providerReference }), checkoutUrl: checkout.checkoutUrl };
    } catch (err) {
      // Le paiement n'a pas pu être initié : on rend la place tout de suite
      // plutôt que de la garder bloquée pour rien.
      await releaseSeat();
      throw err;
    }
  },

  /** Appelé par les webhooks Stripe/CinetPay une fois le paiement confirmé.
   *  Idempotent : rejouer le même événement plusieurs fois ne pose pas de souci. */
  async confirmPayment(providerName: "stripe" | "cinetpay", providerReference: string) {
    const ticket = await ticketsRepository.byProviderReference(providerName, providerReference);
    if (!ticket) return null;
    if (ticket.status !== "pending") return ticket; // déjà traité
    const valid = await ticketsRepository.markValid(ticket.id);
    if (!valid) return null;
    return issueKidoPass(valid);
  },

  async cancelUnpaid(ticketId: string) {
    const ticket = await ticketsRepository.markCancelled(ticketId);
    if (ticket) await eventsRepository.releaseSeat(ticket.event_id);
    return ticket;
  },

  /** Réservé au créateur/modérateur — le compteur affiché en haut du scanner. */
  async statsForEvent(actorUserId: string, eventId: string) {
    const event = await eventsRepository.byId(eventId);
    if (!event) throw notFound();
    const actor = await authRepository.findById(actorUserId);
    const isHost = event.creator_id === actorUserId;
    const isModerator = actor ? await eventsRepository.isModerator(event.id, actor.email) : false;
    if (!isHost && !isModerator) throw forbidden("Réservé au créateur ou à un modérateur.");
    return ticketsRepository.statsForEvent(eventId);
  },

  /** Onglet "Billetterie & ventes" + export CSV du dashboard organisateur. */
  async forCreator(creatorId: string) {
    const rows = await ticketsRepository.forCreator(creatorId);
    return rows.map((t) => ({
      ...publicTicket(t),
      eventTitle: t.event_title,
      buyerName: t.buyer_name,
      buyerEmail: t.buyer_email,
    }));
  },

  /** Onglet "Analytique & revenus" : total encaissé, taux de présence,
   *  et série journalière pour le graphique. */
  async analyticsForCreator(creatorId: string) {
    const [all, byDay] = await Promise.all([
      ticketsRepository.forCreator(creatorId),
      ticketsRepository.revenueByDay(creatorId),
    ]);
    const sold = all.filter((t) => t.status === "valid" || t.status === "used");
    const checkedIn = all.filter((t) => t.status === "used");
    return {
      totalRevenueCents: sold.reduce((sum, t) => sum + t.price_paid_cents, 0),
      ticketsSold: sold.length,
      checkedIn: checkedIn.length,
      attendanceRate: sold.length ? checkedIn.length / sold.length : 0,
      revenueByDay: byDay.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
    };
  },

  async mine(userId: string) {
    const rows = await ticketsRepository.byBuyer(userId);
    return rows.map(publicTicket);
  },

  /** Vérifie un Kido Pass scanné (le contenu brut du QR code). Deux niveaux
   *  de contrôle : la signature JWT (authenticité — quelqu'un n'a pas
   *  fabriqué un faux pass), puis le statut en base (anti-rejeu — ce pass
   *  n'a pas déjà servi). Réservé au créateur/modérateur de l'événement. */
  async verifyPass(actorUserId: string, token: string) {
    let payload;
    try {
      payload = verifyKidoPass(token);
    } catch {
      throw badRequest("Pass invalide ou falsifié.");
    }

    const ticket = await ticketsRepository.byId(payload.ticketId);
    if (!ticket || ticket.pass_token !== token) throw badRequest("Pass invalide ou falsifié.");

    return this.checkIn(actorUserId, ticket.code);
  },

  /** Scanner QR : réservé au créateur de l'événement ou à un modérateur
   *  invité (même vérification que pour l'accès à la salle live). Ne marque
   *  utilisée qu'une place valide, jamais deux fois. */
  async checkIn(actorUserId: string, code: string) {
    const ticket = await ticketsRepository.byCode(code);
    if (!ticket) throw notFound("Billet introuvable.");

    const event = await eventsRepository.byId(ticket.event_id);
    if (!event) throw notFound("Événement introuvable.");

    const actor = await authRepository.findById(actorUserId);
    const isCreator = event.creator_id === actorUserId;
    const isModerator = actor ? await eventsRepository.isModerator(event.id, actor.email) : false;
    if (!isCreator && !isModerator) throw forbidden("Seul le créateur ou un modérateur peut scanner les billets.");

    if (ticket.status === "used") {
      const heure = ticket.used_at ? new Date(ticket.used_at).toLocaleTimeString("fr-FR") : "une heure inconnue";
      throw badRequest(`Pass déjà validé à ${heure}.`);
    }
    if (ticket.status !== "valid") throw badRequest("Ce billet n'est pas valide.");

    const used = await ticketsRepository.markUsed(ticket.id);
    return publicTicket(used!);
  },
};

// Petit helper local pour poser la référence de paiement après coup (le
// ticket est créé avant d'appeler le fournisseur, car on a besoin de son id
// pour le passer en métadonnée à Stripe/CinetPay).
async function attachPaymentReference(ticketId: string, reference: string) {
  await pool.query("UPDATE tickets SET payment_reference = $1 WHERE id = $2", [reference, ticketId]);
}
