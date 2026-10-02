-- Ranking global de Invasión Tentacular: CRÍA, VILTRUMITA, DRAGÓN,
-- MÁQUINA ABERRANTE y MAGO ABERRANTE.
--
-- Cómo usarlo: pega TODO este archivo en el SQL Editor de Neon y pulsa Run.
-- Se puede ejecutar tantas veces como quieras. Si ya tenías la tabla creada,
-- solo añade lo que falte: no borra ni cambia ningún puntaje.
--
-- Cada jugador tiene UN registro por personaje y mapa: el de su mejor partida.
-- Todos comparten la tabla `scores`, pero cada personaje y cada mapa tiene su
-- propio ranking (se separan por las columnas `hero` y `mapa`), como en el juego.

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

-- Cada mapa (CIUDAD, MUNDO ALIENÍGENA y CASTIGO DIVINO) tiene su propio
-- ranking. Los puntajes que ya existían son de la ciudad.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS mapa VARCHAR(12) NOT NULL DEFAULT 'ciudad';
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_mapa_valido;
ALTER TABLE scores ADD CONSTRAINT scores_mapa_valido
  CHECK (mapa IN ('ciudad', 'alien', 'infierno')) NOT VALID;

-- Un solo puntaje por jugador, personaje y mapa. Sin esto, el ON CONFLICT
-- del endpoint no tendría contra qué comparar. (El índice antiguo, por
-- jugador y personaje, impediría tener marca en varios mapas: se quita.)
DROP INDEX IF EXISTS scores_jugador_heroe_idx;
CREATE UNIQUE INDEX IF NOT EXISTS scores_jugador_heroe_mapa_idx
  ON scores (player_name, hero, mapa);

-- El ranking se consulta por personaje y mapa, ordenado por puntaje.
DROP INDEX IF EXISTS scores_hero_top_idx;
CREATE INDEX IF NOT EXISTS scores_hero_mapa_top_idx
  ON scores (hero, mapa, score DESC, created_at ASC);

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
  FROM scores WHERE hero = 'alien' AND mapa = 'ciudad'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_viltrum AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'viltrum' AND mapa = 'ciudad'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_dragon AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'dragon' AND mapa = 'ciudad'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_maquina AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'maquina' AND mapa = 'ciudad'
  ORDER BY score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_mago AS
  SELECT RANK() OVER (ORDER BY score DESC) AS puesto,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE hero = 'mago' AND mapa = 'ciudad'
  ORDER BY score DESC, created_at ASC;


-- Los otros dos mapas, con todos los personajes juntos (columna `heroe`).
CREATE OR REPLACE VIEW ranking_mapa_alien AS
  SELECT RANK() OVER (PARTITION BY hero ORDER BY score DESC) AS puesto, hero AS heroe,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE mapa = 'alien'
  ORDER BY hero, score DESC, created_at ASC;

CREATE OR REPLACE VIEW ranking_mapa_infierno AS
  SELECT RANK() OVER (PARTITION BY hero ORDER BY score DESC) AS puesto, hero AS heroe,
         player_name AS jugador, score AS puntaje, device AS dispositivo, created_at AS fecha
  FROM scores WHERE mapa = 'infierno'
  ORDER BY hero, score DESC, created_at ASC;


-- ---------------------------------------------------------------------------
-- COMPROBACIÓN (opcional): cuántos jugadores hay en cada ranking.
-- ---------------------------------------------------------------------------
-- SELECT mapa, hero, COUNT(*) AS jugadores, MAX(score) AS mejor
--   FROM scores GROUP BY mapa, hero ORDER BY mapa, hero;


-- ---------------------------------------------------------------------------
-- MIGRACIÓN (solo si ya tenías la tabla con puntajes repetidos por jugador)
-- Deja la mejor marca de cada jugador, personaje y mapa, y borra el resto.
-- ---------------------------------------------------------------------------
-- DELETE FROM scores a USING scores b
--  WHERE a.player_name = b.player_name
--    AND a.hero = b.hero
--    AND a.mapa = b.mapa
--    AND (a.score < b.score OR (a.score = b.score AND a.id > b.id));
-- CREATE UNIQUE INDEX IF NOT EXISTS scores_jugador_heroe_mapa_idx
--   ON scores (player_name, hero, mapa);
