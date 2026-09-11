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

-- El ranking se consulta por personaje y ordenado por puntaje: este índice
-- resuelve las dos tablas (cría y viltrumita) sin recorrer todo.
CREATE INDEX IF NOT EXISTS scores_hero_top_idx ON scores (hero, score DESC, created_at ASC);

-- Y este, para el ranking conjunto si alguna vez se usa.
CREATE INDEX IF NOT EXISTS scores_top_idx ON scores (score DESC, created_at ASC);
