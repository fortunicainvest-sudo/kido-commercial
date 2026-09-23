import { pool } from "../../db/pool.js";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  role: string;
  plan: string;
  stripe_customer_id: string | null;
  created_at: Date;
}

export const authRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async create(data: { name: string; email: string; passwordHash: string; country?: string | null }): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, country)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.email.toLowerCase(), data.passwordHash, data.country ?? null]
    );
    return rows[0];
  },
};
