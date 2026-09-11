-- Tabla del ranking global de Invasión Tentacular.
-- Se ejecuta una sola vez en el SQL Editor de Neon.

CREATE TABLE IF NOT EXISTS scores (
  id          BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(14)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0 AND score <= 5000000),
  hero        VARCHAR(16)  NOT NULL DEFAULT 'alien',
  device      VARCHAR(8)   NOT NULL DEFAULT 'pc',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- El ranking se consulta siempre ordenado por puntaje: este índice lo resuelve
-- sin recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS scores_top_idx ON scores (score DESC, created_at ASC);
