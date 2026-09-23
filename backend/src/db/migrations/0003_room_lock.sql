-- Verrouillage de salle (empêche toute nouvelle entrée, l'hôte peut toujours
-- rentrer/sortir) — un simple drapeau applicatif, pas une primitive LiveKit.
ALTER TABLE events ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;
