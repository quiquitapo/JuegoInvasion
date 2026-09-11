// /api/scores  —  Ranking global de Invasión Tentacular
//
// GET  /api/scores?limit=25&hero=alien          -> tabla del personaje
// GET  /api/scores?hero=alien&name=ZORA         -> posición de ese jugador
// POST /api/scores                              -> guarda / mejora un puntaje
//
// Cada jugador tiene UN registro por personaje: el de su mejor partida. Si
// envía uno peor, se le dice y no se toca la tabla.
//
// La cadena de conexión NUNCA viaja al navegador: vive solo aquí, en la
// variable de entorno DATABASE_URL de Vercel.

import { neon } from '@neondatabase/serverless';

const MAX_SCORE    = 5000000;   // techo defensivo: por encima se rechaza
const MAX_NOMBRE   = 14;
const HEROES       = ['alien', 'viltrum'];
const DISPOSITIVOS = ['pc', 'movil'];

function conexion() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  return neon(url);
}

// Deja el nombre en algo publicable: sin etiquetas, sin espacios raros y corto.
function limpiarNombre(v) {
  if (typeof v !== 'string') return null;
  const n = v.replace(/[\u0000-\u001F<>&"'`\\]/g, '')
             .replace(/\s+/g, ' ')
             .trim()
             .slice(0, MAX_NOMBRE);
  return n.length ? n : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const sql = conexion();

    if (req.method === 'GET') {
      const hero = HEROES.includes(req.query.hero) ? req.query.hero : null;
      const nombre = limpiarNombre(req.query.name);

      // --- consulta de posición: ¿en qué puesto estoy? ---
      if (nombre && hero) {
        const [mio] = await sql`
          SELECT score FROM scores WHERE player_name = ${nombre} AND hero = ${hero}
        `;
        if (!mio) return res.status(200).json({ ok: true, encontrado: false });

        const [{ mejores }] = await sql`
          SELECT COUNT(*)::int AS mejores FROM scores
          WHERE hero = ${hero} AND score > ${mio.score}
        `;
        const [{ total }] = await sql`
          SELECT COUNT(*)::int AS total FROM scores WHERE hero = ${hero}
        `;
        return res.status(200).json({
          ok: true, encontrado: true, hero,
          score: mio.score, rank: mejores + 1, total
        });
      }

      // --- tabla ---
      let limit = parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 25;
      if (limit > 100) limit = 100;

      const filas = hero
        ? await sql`
            SELECT id, player_name, score, hero, device, created_at
            FROM scores WHERE hero = ${hero}
            ORDER BY score DESC, created_at ASC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, player_name, score, hero, device, created_at
            FROM scores
            ORDER BY score DESC, created_at ASC
            LIMIT ${limit}
          `;
      return res.status(200).json({ ok: true, hero, scores: filas });
    }

    if (req.method === 'POST') {
      // El cuerpo puede llegar ya parseado o como texto, según el runtime.
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ ok: false, error: 'Cuerpo inválido' });
      }

      const nombre = limpiarNombre(body.player_name);
      if (!nombre) {
        return res.status(400).json({ ok: false, error: 'Nombre inválido' });
      }

      const score = Number(body.score);
      if (!Number.isFinite(score) || !Number.isInteger(score) ||
          score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ ok: false, error: 'Puntaje inválido' });
      }

      const hero = HEROES.includes(body.hero) ? body.hero : 'alien';
      const device = DISPOSITIVOS.includes(body.device) ? body.device : 'pc';

      // Un registro por jugador y personaje, con su mejor marca. La base de
      // datos decide: si el nuevo no supera al guardado, no se toca nada.
      const [fila] = await sql`
        INSERT INTO scores (player_name, score, hero, device)
        VALUES (${nombre}, ${score}, ${hero}, ${device})
        ON CONFLICT (player_name, hero) DO UPDATE
          SET score = EXCLUDED.score,
              device = EXCLUDED.device,
              created_at = NOW()
          WHERE scores.score < EXCLUDED.score
        RETURNING id, score
      `;

      // Sin fila devuelta, el puntaje no superaba al que ya tenía.
      const [actual] = await sql`
        SELECT score FROM scores WHERE player_name = ${nombre} AND hero = ${hero}
      `;
      const mejor = actual ? actual.score : score;

      const [{ mejores }] = await sql`
        SELECT COUNT(*)::int AS mejores FROM scores
        WHERE hero = ${hero} AND score > ${mejor}
      `;
      const [{ total }] = await sql`
        SELECT COUNT(*)::int AS total FROM scores WHERE hero = ${hero}
      `;

      return res.status(fila ? 201 : 200).json({
        ok: true,
        mejorado: !!fila,
        score: mejor,
        rank: mejores + 1,
        total,
        hero
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[api/scores]', err && err.message);
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
}
