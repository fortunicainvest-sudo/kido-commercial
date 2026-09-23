import { pool } from "../../db/pool.js";

export interface TierRow {
  id: string;
  event_id: string;
  access_level: string;
  label: string | null;
  price_cents: number;
  max_quantity: number | null;
  quantity_sold: number;
  created_at: Date;
}

export const tiersRepository = {
  async createMany(eventId: string, tiers: { accessLevel: string; label?: string; priceCents: number; maxQuantity: number | null }[]): Promise<void> {
    for (const t of tiers) {
      await pool.query(
        `INSERT INTO ticket_tiers (event_id, access_level, label, price_cents, max_quantity)
         VALUES ($1,$2,$3,$4,$5)`,
        [eventId, t.accessLevel, t.label ?? null, t.priceCents, t.maxQuantity]
      );
    }
  },

  async forEvent(eventId: string): Promise<TierRow[]> {
    const { rows } = await pool.query<TierRow>(
      "SELECT * FROM ticket_tiers WHERE event_id = $1 ORDER BY price_cents ASC",
      [eventId]
    );
    return rows;
  },

  async byAccessLevel(eventId: string, accessLevel: string): Promise<TierRow | null> {
    const { rows } = await pool.query<TierRow>(
      "SELECT * FROM ticket_tiers WHERE event_id = $1 AND access_level = $2",
      [eventId, accessLevel]
    );
    return rows[0] ?? null;
  },

  /** Même logique que eventsRepository.tryReserveSeat, mais par palier. */
  async tryReserveSeat(tierId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE ticket_tiers SET quantity_sold = quantity_sold + 1
       WHERE id = $1 AND (max_quantity IS NULL OR quantity_sold < max_quantity)`,
      [tierId]
    );
    return (rowCount ?? 0) > 0;
  },

  async releaseSeat(tierId: string): Promise<void> {
    await pool.query(
      "UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE id = $1",
      [tierId]
    );
  },
};
