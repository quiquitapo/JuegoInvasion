-- Tabla del ranking global de Invasión Tentacular.
-- Se ejecuta una sola vez en el SQL Editor de Neon.
--
-- Cada jugador tiene UN registro por personaje: el de su mejor partida.

CREATE TABLE IF NOT EXISTS scores (
  id          BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(14)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0 AND score <= 5000000),
  hero        VARCHAR(16)  NOT NULL DEFAULT 'alien',
  device      VARCHAR(8)   NOT NULL DEFAULT 'pc',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Un solo puntaje por jugador y personaje. Sin esto, el ON CONFLICT del
-- endpoint no tendría contra qué comparar.
CREATE UNIQUE INDEX IF NOT EXISTS scores_jugador_heroe_idx
  ON scores (player_name, hero);

-- El ranking se consulta por personaje y ordenado por puntaje.
CREATE INDEX IF NOT EXISTS scores_hero_top_idx
  ON scores (hero, score DESC, created_at ASC);

-- Y este, para el ranking conjunto si alguna vez se usa.
CREATE INDEX IF NOT EXISTS scores_top_idx ON scores (score DESC, created_at ASC);


-- ---------------------------------------------------------------------------
-- MIGRACIÓN (solo si ya tenías la tabla con puntajes repetidos por jugador)
-- Deja la mejor marca de cada jugador y personaje, y borra el resto.
-- ---------------------------------------------------------------------------
-- DELETE FROM scores a USING scores b
--  WHERE a.player_name = b.player_name
--    AND a.hero = b.hero
--    AND (a.score < b.score OR (a.score = b.score AND a.id > b.id));
-- CREATE UNIQUE INDEX IF NOT EXISTS scores_jugador_heroe_idx
--   ON scores (player_name, hero);
