import { pool } from "../../db/pool.js";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  provider: string;
  external_subscription_id: string | null;
  status: string;
  plan: string;
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const subscriptionsRepository = {
  async createPending(userId: string, provider: "STRIPE" | "CINETPAY", plan: "PRO" | "ENTERPRISE"): Promise<SubscriptionRow> {
    const { rows } = await pool.query<SubscriptionRow>(
      `INSERT INTO subscriptions (user_id, provider, plan, status) VALUES ($1,$2,$3,'PENDING') RETURNING *`,
      [userId, provider, plan]
    );
    return rows[0];
  },

  async setExternalReference(id: string, reference: string): Promise<void> {
    await pool.query("UPDATE subscriptions SET external_subscription_id = $1 WHERE id = $2", [reference, id]);
  },

  async byProviderReference(provider: string, reference: string): Promise<SubscriptionRow | null> {
    const { rows } = await pool.query<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE provider = $1 AND external_subscription_id = $2",
      [provider, reference]
    );
    return rows[0] ?? null;
  },

  /** Active l'abonnement ET applique le plan sur l'utilisateur, dans la
   *  même transaction — les deux doivent réussir ensemble ou pas du tout. */
  async activate(id: string, periodDays = 30): Promise<SubscriptionRow | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<SubscriptionRow>(
        `UPDATE subscriptions SET status = 'ACTIVE', current_period_end = now() + ($1 || ' days')::interval, updated_at = now()
         WHERE id = $2 AND status = 'PENDING' RETURNING *`,
        [periodDays, id]
      );
      const subscription = rows[0];
      if (subscription) {
        await client.query("UPDATE users SET plan = $1 WHERE id = $2", [subscription.plan, subscription.user_id]);
      }
      await client.query("COMMIT");
      return subscription ?? null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async latestForUser(userId: string): Promise<SubscriptionRow | null> {
    const { rows } = await pool.query<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    return rows[0] ?? null;
  },
};
