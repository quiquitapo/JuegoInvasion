-- Ranking global de Invasión Tentacular: CRÍA, VILTRUMITA, DRAGÓN,
-- MÁQUINA ABERRANTE y MAGO ABERRANTE.
--
-- Cómo usarlo: pega TODO este archivo en el SQL Editor de Neon y pulsa Run.
-- Se puede ejecutar tantas veces como quieras. Si ya tenías la tabla creada,
-- solo añade lo que falte: no borra ni cambia ningún puntaje.
--
-- Cada jugador tiene UN registro por personaje: el de su mejor partida. Los
-- cinco personajes comparten la tabla `scores`, pero cada uno tiene su propio
-- ranking (se separan por la columna `hero`), igual que en el juego.

CREATE TABLE IF NOT EXISTS scores (
  id          BIGSERIAL PRIMARY KEY,
  player_name VARCHAR(14)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0 AND score <= 5000000),
  hero        VARCHAR(16)  NOT NULL DEFAULT 'alien',   -- 'alien' | 'viltrum' | 'dragon' | 'maquina' | 'mago'
  device      VARCHAR(8)   NOT NULL DEFAULT 'pc',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Solo se aceptan los cinco personajes del juego. NOT VALID: se exige a todo
-- lo que se guarde a partir de ahora sin revisar lo antiguo, así que nunca
-- falla sobre una base que ya tenga puntajes.
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_hero_valido;
ALTER TABLE scores ADD CONSTRAINT scores_hero_valido
  CHECK (hero IN ('alien', 'viltrum', 'dragon', 'maquina', 'mago')) NOT VALID;

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
-- UNA "TABLA" DE PUNTAJES POR PERSONAJE
-- Vistas de solo lectura para mirar cada ranking desde Neon (Tables → Views,
-- o con SELECT * FROM ranking_dragon;). El juego no las necesita: consulta
-- `scores` filtrando por personaje. El puesto se calcula igual que en el
-- juego: los empatados comparten puesto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW ranking_alien AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'alien'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_viltrum AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'viltrum'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_dragon AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'dragon'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_maquina AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'maquina'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_mago AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'mago'
  ORDER BY score DESC, created_at ASC;


-- ---------------------------------------------------------------------------
-- COMPROBACIÓN (opcional): cuántos jugadores hay en cada ranking.
-- ---------------------------------------------------------------------------
-- SELECT hero, COUNT(*) AS jugadores, MAX(score) AS mejor
--   FROM scores GROUP BY hero ORDER BY hero;


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
