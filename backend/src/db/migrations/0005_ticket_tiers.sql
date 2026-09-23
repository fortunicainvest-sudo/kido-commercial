-- Tarification multi-niveaux : un événement peut définir plusieurs
-- catégories de pass (STANDARD/VIP/SPEAKER/STAFF), chacune avec son propre
-- prix et son propre quota. Un événement qui n'en définit aucune garde
-- l'ancien comportement (un seul prix/quota porté par `events`).
CREATE TABLE ticket_tiers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  access_level   TEXT NOT NULL CHECK (access_level IN ('STANDARD','VIP','SPEAKER','STAFF')),
  label          TEXT,
  price_cents    INTEGER NOT NULL DEFAULT 0,
  max_quantity   INTEGER,             -- NULL = illimité
  quantity_sold  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, access_level),
  CONSTRAINT tier_not_oversold CHECK (max_quantity IS NULL OR quantity_sold <= max_quantity)
);
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);
