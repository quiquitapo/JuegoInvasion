-- Salas del multijugador de Super Invasores.
--
-- Cómo usarlo: pega TODO este archivo en el SQL Editor de Neon y pulsa Run
-- (además de schema.sql). Se puede ejecutar tantas veces como quieras: si
-- las tablas ya existen, solo añade lo que falte.
--
-- El servidor NO transmite la partida: solo presenta a los jugadores. Guarda
-- la sala, quién está dentro (y con qué personaje: cría, viltrumita, dragón,
-- máquina o mago) y los mensajes de "señalización" que los dos navegadores necesitan
-- intercambiar para conectarse directamente entre sí (WebRTC). Una vez
-- conectados, el juego viaja de un dispositivo al otro sin pasar por aquí.

CREATE TABLE IF NOT EXISTS salas (
  codigo    VARCHAR(6)   PRIMARY KEY,
  modo      VARCHAR(8)   NOT NULL,                    -- 'vs' | 'doble'
  estado    VARCHAR(10)  NOT NULL DEFAULT 'espera',   -- 'espera' | 'jugando'
  creada    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sala_jugadores (
  id         VARCHAR(12)  PRIMARY KEY,
  codigo     VARCHAR(6)   NOT NULL REFERENCES salas(codigo) ON DELETE CASCADE,
  token      VARCHAR(40)  NOT NULL,                   -- secreto de ese jugador
  nombre     VARCHAR(14)  NOT NULL,
  heroe      VARCHAR(16)  NOT NULL DEFAULT 'alien',   -- 'alien' | 'viltrum' | 'dragon' | 'maquina' | 'mago'
  anfitrion  BOOLEAN      NOT NULL DEFAULT FALSE,
  unido      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  visto      TIMESTAMPTZ  NOT NULL DEFAULT NOW()      -- última vez que dio señales de vida
);
CREATE INDEX IF NOT EXISTS sala_jugadores_codigo_idx ON sala_jugadores (codigo);

-- Solo los cinco personajes del juego. NOT VALID: no revisa lo que ya hubiera
-- guardado, así que nunca falla sobre una base existente.
ALTER TABLE sala_jugadores DROP CONSTRAINT IF EXISTS sala_jugadores_heroe_valido;
ALTER TABLE sala_jugadores ADD CONSTRAINT sala_jugadores_heroe_valido
  CHECK (heroe IN ('alien', 'viltrum', 'dragon', 'maquina', 'mago')) NOT VALID;

CREATE TABLE IF NOT EXISTS sala_senales (
  id       BIGSERIAL    PRIMARY KEY,
  codigo   VARCHAR(6)   NOT NULL REFERENCES salas(codigo) ON DELETE CASCADE,
  de_id    VARCHAR(12)  NOT NULL,
  para_id  VARCHAR(12)  NOT NULL,
  tipo     VARCHAR(12)  NOT NULL,                     -- 'oferta' | 'respuesta' | 'candidato'
  datos    TEXT         NOT NULL,
  creada   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sala_senales_para_idx ON sala_senales (para_id, id);
