-- Schéma initial KIDO commercial. Conçu pour Postgres (Neon en prod).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,                 -- NULL si connexion uniquement via OAuth
  google_id       TEXT UNIQUE,
  avatar_url      TEXT,
  bio             TEXT,
  country         TEXT,                 -- ISO 3166-1 alpha-2, pour orienter le bon moyen de paiement
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module          TEXT NOT NULL,        -- concert | reunion | cinema | conference | match | prive
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  cover_url       TEXT,
  trailer_url     TEXT,
  starts_at       TIMESTAMPTZ,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'XOF',
  max_seats       INTEGER,
  seats_sold      INTEGER NOT NULL DEFAULT 0,
  visibility      TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  stream_mode     TEXT NOT NULL DEFAULT 'ecran'  CHECK (stream_mode IN ('ecran','camera','les_deux','audio')),
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  room_name       TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seats_not_oversold CHECK (max_seats IS NULL OR seats_sold <= max_seats)
);
CREATE INDEX idx_events_visibility ON events(visibility, status, starts_at);
CREATE INDEX idx_events_creator ON events(creator_id);

CREATE TABLE event_moderators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE TABLE tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code              TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','valid','used','expired','cancelled')),
  price_paid_cents  INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'XOF',
  payment_provider  TEXT CHECK (payment_provider IN ('stripe','cinetpay','free')),
  payment_reference TEXT,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_id);
CREATE UNIQUE INDEX idx_tickets_payment_ref ON tickets(payment_provider, payment_reference) WHERE payment_reference IS NOT NULL;

CREATE TABLE follows (
  creator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, follower_id)
);

CREATE TABLE videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_event_id  UUID REFERENCES events(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  storage_key       TEXT NOT NULL,
  thumbnail_key     TEXT,
  duration_seconds  INTEGER,
  status            TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed')),
  like_count        INTEGER NOT NULL DEFAULT 0,
  view_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_creator ON videos(creator_id);
CREATE INDEX idx_videos_status ON videos(status, created_at DESC);

CREATE TABLE video_likes (
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
