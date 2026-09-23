-- Ajouts pour la version commerciale : rôle utilisateur, plan d'abonnement
-- (bridage des fonctionnalités), Kido Pass (niveau d'accès + jeton signé),
-- et table des abonnements. Casse volontairement alignée sur prisma/schema.prisma
-- (valeurs en MAJUSCULES pour role/plan/access_level) pour que la bascule
-- vers Prisma plus tard n'exige aucune migration de données.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER'
  CHECK (role IN ('USER','HOST','ADMIN'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'FREE'
  CHECK (plan IN ('FREE','PRO','ENTERPRISE'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'STANDARD'
  CHECK (access_level IN ('STANDARD','VIP','SPEAKER','STAFF'));
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pass_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_pass_token ON tickets(pass_token) WHERE pass_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                 TEXT NOT NULL CHECK (provider IN ('STRIPE','CINETPAY')),
  external_subscription_id TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN ('ACTIVE','CANCELED','PAST_DUE')),
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
