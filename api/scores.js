// /api/scores  —  Ranking global de Invasión Tentacular
//
// GET  /api/scores?limit=10  -> { ok:true, scores:[...] }
// POST /api/scores           -> { ok:true, id }   body JSON:
//                               { player_name, score, hero, device }
//
// La cadena de conexión NUNCA viaja al navegador: vive solo aquí, en la
// variable de entorno DATABASE_URL de Vercel.

import { neon } from '@neondatabase/serverless';

const MAX_SCORE   = 5000000;   // techo defensivo: por encima se rechaza
const MAX_NOMBRE  = 14;
const HEROES      = ['alien', 'viltrum'];
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
      let limit = parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 10;
      if (limit > 50) limit = 50;

      const filas = await sql`
        SELECT id, player_name, score, hero, device, created_at
        FROM scores
        ORDER BY score DESC, created_at ASC
        LIMIT ${limit}
      `;
      return res.status(200).json({ ok: true, scores: filas });
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

      const [fila] = await sql`
        INSERT INTO scores (player_name, score, hero, device)
        VALUES (${nombre}, ${score}, ${hero}, ${device})
        RETURNING id
      `;
      return res.status(201).json({ ok: true, id: fila.id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('[api/scores]', err && err.message);
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
}
