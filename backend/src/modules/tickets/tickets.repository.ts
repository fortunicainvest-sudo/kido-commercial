import { pool } from "../../db/pool.js";
import { nanoid } from "nanoid";

export interface TicketRow {
  id: string;
  event_id: string;
  buyer_id: string;
  code: string;
  access_level: string;
  pass_token: string | null;
  status: string;
  price_paid_cents: number;
  currency: string;
  payment_provider: string | null;
  payment_reference: string | null;
  used_at: Date | null;
  created_at: Date;
}

export const ticketsRepository = {
  async create(data: {
    eventId: string; buyerId: string; status: "pending" | "valid";
    priceCents: number; currency: string;
    provider: "stripe" | "cinetpay" | "free" | null; reference?: string | null;
    accessLevel?: "STANDARD" | "VIP" | "SPEAKER" | "STAFF";
  }): Promise<TicketRow> {
    const code = nanoid(24);
    const { rows } = await pool.query<TicketRow>(
      `INSERT INTO tickets (event_id, buyer_id, code, status, price_paid_cents, currency, payment_provider, payment_reference, access_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [data.eventId, data.buyerId, code, data.status, data.priceCents, data.currency, data.provider,
       data.reference ?? null, data.accessLevel ?? "STANDARD"]
    );
    return rows[0];
  },

  async setPassToken(id: string, token: string): Promise<void> {
    await pool.query("UPDATE tickets SET pass_token = $1 WHERE id = $2", [token, id]);
  },

  async byId(id: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>("SELECT * FROM tickets WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async byProviderReference(provider: string, reference: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>(
      "SELECT * FROM tickets WHERE payment_provider = $1 AND payment_reference = $2",
      [provider, reference]
    );
    return rows[0] ?? null;
  },

  async byCode(code: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>("SELECT * FROM tickets WHERE code = $1", [code]);
    return rows[0] ?? null;
  },

  async byBuyer(buyerId: string): Promise<TicketRow[]> {
    const { rows } = await pool.query<TicketRow>(
      "SELECT * FROM tickets WHERE buyer_id = $1 ORDER BY created_at DESC",
      [buyerId]
    );
    return rows;
  },

  /** true si l'utilisateur a déjà une place valide/utilisée pour cet événement. */
  async userHasTicket(eventId: string, buyerId: string): Promise<boolean> {
    const { rows } = await pool.query(
      "SELECT 1 FROM tickets WHERE event_id = $1 AND buyer_id = $2 AND status IN ('valid','used')",
      [eventId, buyerId]
    );
    return rows.length > 0;
  },

  async markValid(id: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>(
      "UPDATE tickets SET status = 'valid' WHERE id = $1 AND status = 'pending' RETURNING *",
      [id]
    );
    return rows[0] ?? null;
  },

  async markUsed(id: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>(
      "UPDATE tickets SET status = 'used', used_at = now() WHERE id = $1 AND status = 'valid' RETURNING *",
      [id]
    );
    return rows[0] ?? null;
  },

  async markCancelled(id: string): Promise<TicketRow | null> {
    const { rows } = await pool.query<TicketRow>(
      "UPDATE tickets SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING *",
      [id]
    );
    return rows[0] ?? null;
  },

  /** Tous les billets vendus sur les événements de ce créateur — pour
   *  l'onglet "Billetterie & ventes" et l'export CSV du dashboard. */
  async forCreator(creatorId: string): Promise<(TicketRow & { event_title: string; buyer_name: string; buyer_email: string })[]> {
    const { rows } = await pool.query(
      `SELECT t.*, e.title AS event_title, u.name AS buyer_name, u.email AS buyer_email
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       JOIN users u ON u.id = t.buyer_id
       WHERE e.creator_id = $1
       ORDER BY t.created_at DESC`,
      [creatorId]
    );
    return rows;
  },

  /** Revenus encaissés (billets valides/utilisés uniquement) par jour, pour
   *  le graphique de l'onglet "Analytique & revenus". */
  async revenueByDay(creatorId: string): Promise<{ day: string; revenue_cents: string }[]> {
    const { rows } = await pool.query(
      `SELECT to_char(t.created_at, 'YYYY-MM-DD') AS day, sum(t.price_paid_cents) AS revenue_cents
       FROM tickets t JOIN events e ON e.id = t.event_id
       WHERE e.creator_id = $1 AND t.status IN ('valid','used')
       GROUP BY day ORDER BY day ASC`,
      [creatorId]
    );
    return rows;
  },

  /** Pour le compteur en direct du scanner : "Entrées validées / Billets vendus". */
  async statsForEvent(eventId: string): Promise<{ sold: number; checkedIn: number }> {
    const { rows } = await pool.query<{ sold: string; checked_in: string }>(
      `SELECT
         count(*) FILTER (WHERE status IN ('valid','used')) AS sold,
         count(*) FILTER (WHERE status = 'used') AS checked_in
       FROM tickets WHERE event_id = $1`,
      [eventId]
    );
    return { sold: Number(rows[0].sold), checkedIn: Number(rows[0].checked_in) };
  },

  /** Places "pending" plus vieilles que N minutes : le paiement a été
   *  abandonné, on les expire pour libérer la place. À appeler depuis une
   *  tâche planifiée (cron) — pas encore câblé dans ce livrable. */
  async findStalePending(olderThanMinutes = 20): Promise<TicketRow[]> {
    const { rows } = await pool.query<TicketRow>(
      `SELECT * FROM tickets WHERE status = 'pending' AND created_at < now() - ($1 || ' minutes')::interval`,
      [olderThanMinutes]
    );
    return rows;
  },
};
