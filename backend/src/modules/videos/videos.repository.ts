import { pool } from "../../db/pool.js";

export interface VideoRow {
  id: string;
  creator_id: string;
  source_event_id: string | null;
  title: string;
  description: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  status: string;
  like_count: number;
  view_count: number;
  created_at: Date;
  creator_name?: string;
  creator_avatar?: string | null;
}

export const videosRepository = {
  async create(data: {
    creatorId: string; title: string; description: string | null;
    storageKey: string; sourceEventId?: string | null;
  }): Promise<VideoRow> {
    const { rows } = await pool.query<VideoRow>(
      `INSERT INTO videos (creator_id, title, description, storage_key, source_event_id, status)
       VALUES ($1,$2,$3,$4,$5,'ready') RETURNING *`,
      [data.creatorId, data.title, data.description, data.storageKey, data.sourceEventId ?? null]
    );
    return rows[0];
  },

  async feed(limit = 40): Promise<VideoRow[]> {
    const { rows } = await pool.query<VideoRow>(
      `SELECT v.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM videos v JOIN users u ON u.id = v.creator_id
       WHERE v.status = 'ready'
       ORDER BY v.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async byId(id: string): Promise<VideoRow | null> {
    const { rows } = await pool.query<VideoRow>(
      `SELECT v.*, u.name AS creator_name, u.avatar_url AS creator_avatar
       FROM videos v JOIN users u ON u.id = v.creator_id
       WHERE v.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async incrementView(id: string): Promise<void> {
    await pool.query("UPDATE videos SET view_count = view_count + 1 WHERE id = $1", [id]);
  },

  async like(videoId: string, userId: string): Promise<void> {
    const { rowCount } = await pool.query(
      "INSERT INTO video_likes (video_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [videoId, userId]
    );
    if (rowCount) await pool.query("UPDATE videos SET like_count = like_count + 1 WHERE id = $1", [videoId]);
  },

  async unlike(videoId: string, userId: string): Promise<void> {
    const { rowCount } = await pool.query(
      "DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2",
      [videoId, userId]
    );
    if (rowCount) await pool.query("UPDATE videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1", [videoId]);
  },
};
