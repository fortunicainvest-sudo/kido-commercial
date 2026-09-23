-- Ajustements sur `subscriptions` pour supporter le flux "en attente de
-- paiement" avant confirmation (même logique que les billets : on crée la
-- ligne PENDING avant d'appeler le prestataire, on la complète après).
ALTER TABLE subscriptions ALTER COLUMN external_subscription_id DROP NOT NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'PRO'
  CHECK (plan IN ('PRO','ENTERPRISE'));
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('PENDING','ACTIVE','CANCELED','PAST_DUE'));

-- L'unicité (provider, external_subscription_id) doit tolérer plusieurs
-- lignes PENDING avec une valeur NULL en attendant la référence réelle.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_external_subscription_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_ref
  ON subscriptions(provider, external_subscription_id) WHERE external_subscription_id IS NOT NULL;
