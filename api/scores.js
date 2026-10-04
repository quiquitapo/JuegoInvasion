// /api/scores  —  Ranking global de Invasión Tentacular
//
// GET  /api/scores?limit=25&hero=alien&mapa=ciudad   -> tabla del personaje en ese mapa
// GET  /api/scores?hero=alien&mapa=alien&name=ZORA    -> posición de ese jugador
// POST /api/scores                                    -> guarda / mejora un puntaje
//
// Cada jugador tiene UN registro por personaje y mapa: el de su mejor
// partida. Si envía uno peor, se le dice y no se toca la tabla. Sin `mapa`,
// se entiende la ciudad (así siguen funcionando las versiones anteriores).
//
// La cadena de conexión NUNCA viaja al navegador: vive solo aquí, en la
// variable de entorno DATABASE_URL de Vercel.

import { neon } from '@neondatabase/serverless';
import { nombreInapropiado } from './_nombres.js';

const MAX_SCORE    = 5000000;   // techo defensivo: por encima se rechaza
const MAX_NOMBRE   = 14;
const HEROES       = ['alien', 'viltrum', 'dragon', 'maquina', 'mago'];
const DISPOSITIVOS = ['pc', 'movil'];
const MAPAS        = ['ciudad', 'alien', 'infierno'];

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
      const mapa = MAPAS.includes(req.query.mapa) ? req.query.mapa : 'ciudad';
      const nombre = limpiarNombre(req.query.name);

      // --- consulta de posición: ¿en qué puesto estoy? ---
      if (nombre && hero) {
        const [mio] = await sql`
          SELECT score FROM scores WHERE player_name = ${nombre} AND hero = ${hero} AND mapa = ${mapa}
        `;
        if (!mio) return res.status(200).json({ ok: true, encontrado: false });

        const [{ mejores }] = await sql`
          SELECT COUNT(*)::int AS mejores FROM scores
          WHERE hero = ${hero} AND mapa = ${mapa} AND score > ${mio.score}
        `;
        const [{ total }] = await sql`
          SELECT COUNT(*)::int AS total FROM scores WHERE hero = ${hero} AND mapa = ${mapa}
        `;
        return res.status(200).json({
          ok: true, encontrado: true, hero, mapa,
          score: mio.score, rank: mejores + 1, total
        });
      }

      // --- tabla ---
      let limit = parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 25;
      if (limit > 100) limit = 100;

      const filas = hero
        ? await sql`
            SELECT id, player_name, score, hero, mapa, device, created_at
            FROM scores WHERE hero = ${hero} AND mapa = ${mapa}
            ORDER BY score DESC, created_at ASC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, player_name, score, hero, mapa, device, created_at
            FROM scores WHERE mapa = ${mapa}
            ORDER BY score DESC, created_at ASC
            LIMIT ${limit}
          `;
      // un nombre inapropiado que se hubiera colado antes no se muestra
      for (const f of filas) if (nombreInapropiado(f.player_name)) f.player_name = '???';
      return res.status(200).json({ ok: true, hero, mapa, scores: filas });
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
      if (nombreInapropiado(nombre)) {
        return res.status(400).json({ ok: false, error: 'Nombre inapropiado' });
      }

      const score = Number(body.score);
      if (!Number.isFinite(score) || !Number.isInteger(score) ||
          score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ ok: false, error: 'Puntaje inválido' });
      }

      const hero = HEROES.includes(body.hero) ? body.hero : 'alien';
      const device = DISPOSITIVOS.includes(body.device) ? body.device : 'pc';
      const mapa = MAPAS.includes(body.mapa) ? body.mapa : 'ciudad';

      // Un registro por jugador, personaje y mapa, con su mejor marca. La base
      // de datos decide: si el nuevo no supera al guardado, no se toca nada.
      const [fila] = await sql`
        INSERT INTO scores (player_name, score, hero, device, mapa)
        VALUES (${nombre}, ${score}, ${hero}, ${device}, ${mapa})
        ON CONFLICT (player_name, hero, mapa) DO UPDATE
          SET score = EXCLUDED.score,
              device = EXCLUDED.device,
              created_at = NOW()
          WHERE scores.score < EXCLUDED.score
        RETURNING id, score
      `;

      // Sin fila devuelta, el puntaje no superaba al que ya tenía.
      const [actual] = await sql`
        SELECT score FROM scores WHERE player_name = ${nombre} AND hero = ${hero} AND mapa = ${mapa}
      `;
      const mejor = actual ? actual.score : score;

      const [{ mejores }] = await sql`
        SELECT COUNT(*)::int AS mejores FROM scores
        WHERE hero = ${hero} AND mapa = ${mapa} AND score > ${mejor}
      `;
      const [{ total }] = await sql`
        SELECT COUNT(*)::int AS total FROM scores WHERE hero = ${hero} AND mapa = ${mapa}
      `;

      return res.status(fila ? 201 : 200).json({
        ok: true,
        mejorado: !!fila,
        score: mejor,
        rank: mejores + 1,
        total,
        hero,
        mapa
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[api/scores]', err && err.message);
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
}
