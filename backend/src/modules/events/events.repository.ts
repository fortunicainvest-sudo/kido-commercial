import { pool } from "../../db/pool.js";
import { nanoid } from "nanoid";

export interface EventRow {
  id: string;
  creator_id: string;
  module: string;
  title: string;
  description: string | null;
  category: string;
  cover_url: string | null;
  trailer_url: string | null;
  starts_at: Date | null;
  price_cents: number;
  currency: string;
  max_seats: number | null;
  seats_sold: number;
  visibility: string;
  stream_mode: string;
  status: string;
  room_name: string;
  locked: boolean;
  created_at: Date;
  creator_name?: string;
  creator_avatar?: string | null;
}

export interface CreateEventInput {
  creatorId: string;
  module: string;
  title: string;
  description: string | null;
  category: string;
  coverUrl: string | null;
  trailerUrl: string | null;
  startsAt: Date | null;
  priceCents: number;
  currency: string;
  maxSeats: number | null;
  visibility: string;
  streamMode: string;
}

export const eventsRepository = {
  async create(data: CreateEventInput): Promise<EventRow> {
    const roomName = `kido-${nanoid(12)}`;
    const { rows } = await pool.query<EventRow>(
      `INSERT INTO events
        (creator_id, module, title, description, category, cover_url, trailer_url,
         starts_at, price_cents, currency, max_seats, visibility, stream_mode, room_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [data.creatorId, data.module, data.title, data.description, data.category, data.coverUrl,
       data.trailerUrl, data.startsAt, data.priceCents, data.currency, data.maxSeats,
       data.visibility, data.streamMode, roomName]
    );
    return rows[0];
  },

  async byId(id: string): Promise<EventRow | null> {
    const { rows } = await pool.query<EventRow>(
      `SELECT e.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM events e JOIN users u ON u.id = e.creator_id
       WHERE e.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async listPublic(opts: { category?: string; limit?: number } = {}): Promise<EventRow[]> {
    const conditions = ["e.visibility = 'public'", "e.status != 'cancelled'"];
    const params: unknown[] = [];
    if (opts.category) {
      params.push(opts.category);
      conditions.push(`e.category = $${params.length}`);
    }
    params.push(opts.limit ?? 60);
    const { rows } = await pool.query<EventRow>(
      `SELECT e.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM events e JOIN users u ON u.id = e.creator_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY e.starts_at ASC NULLS LAST, e.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return rows;
  },

  async byCreator(creatorId: string): Promise<EventRow[]> {
    const { rows } = await pool.query<EventRow>(
      `SELECT e.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM events e JOIN users u ON u.id = e.creator_id
       WHERE e.creator_id = $1 ORDER BY e.created_at DESC`,
      [creatorId]
    );
    return rows;
  },

  /** Réserve une place de façon atomique : incrémente seats_sold seulement
   *  si ça ne dépasse pas max_seats. La contrainte CHECK en base est le
   *  dernier filet de sécurité, celle-ci évite l'échec bruyant en usage normal. */
  async tryReserveSeat(eventId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE events SET seats_sold = seats_sold + 1
       WHERE id = $1 AND (max_seats IS NULL OR seats_sold < max_seats)`,
      [eventId]
    );
    return (rowCount ?? 0) > 0;
  },

  async releaseSeat(eventId: string): Promise<void> {
    await pool.query(
      "UPDATE events SET seats_sold = GREATEST(seats_sold - 1, 0) WHERE id = $1",
      [eventId]
    );
  },

  async addModerators(eventId: string, invites: { email: string; name: string | null }[]): Promise<void> {
    for (const invite of invites.slice(0, 10)) {
      await pool.query(
        `INSERT INTO event_moderators (event_id, email, name) VALUES ($1,$2,$3)
         ON CONFLICT (event_id, email) DO NOTHING`,
        [eventId, invite.email.toLowerCase(), invite.name]
      );
    }
  },

  async moderators(eventId: string) {
    const { rows } = await pool.query(
      "SELECT id, email, name FROM event_moderators WHERE event_id = $1 ORDER BY created_at ASC",
      [eventId]
    );
    return rows;
  },

  async removeModerator(eventId: string, modId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      "DELETE FROM event_moderators WHERE id = $1 AND event_id = $2",
      [modId, eventId]
    );
    return (rowCount ?? 0) > 0;
  },

  async isModerator(eventId: string, email: string): Promise<boolean> {
    const { rows } = await pool.query(
      "SELECT 1 FROM event_moderators WHERE event_id = $1 AND email = $2",
      [eventId, email.toLowerCase()]
    );
    return rows.length > 0;
  },

  async setLocked(eventId: string, locked: boolean): Promise<void> {
    await pool.query("UPDATE events SET locked = $1 WHERE id = $2", [locked, eventId]);
  },
};
