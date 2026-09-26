// /api/salas  —  Salas del multijugador de Super Invasores
//
// Este servidor solo PRESENTA a los jugadores: crea la sala con su código,
// guarda nombres y personajes, y reparte los mensajes de señalización que
// los navegadores necesitan para conectarse directamente entre sí (WebRTC).
// La partida en sí viaja de un dispositivo a otro, nunca por aquí: Vercel no
// puede mantener conexiones abiertas y sería lento y caro.
//
// GET  /api/salas?codigo=ABCDE                         -> datos de la sala
// GET  /api/salas?codigo=ABCDE&jugador=ID&token=T&desde=N
//                                                       -> sala + señales nuevas para ti
// POST /api/salas  { accion:'crear',  modo, nombre, heroe }
// POST /api/salas  { accion:'unirse', codigo, nombre, heroe }
// POST /api/salas  { accion:'heroe',  codigo, jugador, token, heroe }
// POST /api/salas  { accion:'senal',  codigo, jugador, token, para, tipo, datos }
// POST /api/salas  { accion:'empezar',codigo, jugador, token }
// POST /api/salas  { accion:'salir',  codigo, jugador, token }

import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'node:crypto';

const MODOS        = ['vs', 'doble'];
const HEROES       = ['alien', 'viltrum'];
const TIPOS_SENAL  = ['oferta', 'respuesta', 'candidato'];
const MAX_JUGADORES = 2;          // ambos modos son de a dos
const MAX_NOMBRE   = 14;
const MAX_DATOS    = 12000;       // una oferta WebRTC ronda 2-6 KB
const LETRAS       = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O ni 1/I
// Plazos fijos, escritos tal cual en las consultas (INTERVAL '...'): así no
// dependen de cómo cada motor deduzca el tipo de un parámetro.
//   - quien lleva 40 s sin dar señales de vida sale de la sala
//   - las salas se borran a las 3 horas de crearse

let _sql = null;
export function usarConexion(fn){ _sql = fn; }     // para las pruebas
function conexion() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  return neon(url);
}

function limpiarNombre(v) {
  if (typeof v !== 'string') return null;
  const n = v.replace(/[\u0000-\u001F<>&"'`\\]/g, '')
             .replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);
  return n.length ? n : null;
}
function limpiarCodigo(v) {
  if (typeof v !== 'string') return null;
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (c.length === 5 && [...c].every(ch => LETRAS.includes(ch))) ? c : null;
}
function azar(n, alfabeto) {
  const b = randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += alfabeto[b[i] % alfabeto.length];
  return s;
}
const nuevoId    = () => azar(10, 'abcdefghijkmnpqrstuvwxyz23456789');
const nuevoToken = () => randomBytes(18).toString('hex');

// Comprueba que quien habla es de verdad ese jugador de esa sala.
async function autenticar(sql, codigo, jugador, token) {
  if (!codigo || typeof jugador !== 'string' || typeof token !== 'string') return null;
  const r = await sql`SELECT id, anfitrion FROM sala_jugadores
                      WHERE codigo = ${codigo} AND id = ${jugador} AND token = ${token}`;
  return r[0] || null;
}

async function datosSala(sql, codigo) {
  const s = await sql`SELECT codigo, modo, estado FROM salas WHERE codigo = ${codigo}`;
  if (!s[0]) return null;
  const j = await sql`SELECT id, nombre, heroe, anfitrion FROM sala_jugadores
                      WHERE codigo = ${codigo} ORDER BY unido ASC`;
  return { ...s[0], jugadores: j };
}

// Quita a quien lleva rato sin dar señales. Si era el anfitrión, la sala se cierra.
async function barrerAusentes(sql, codigo) {
  const idos = await sql`DELETE FROM sala_jugadores
                         WHERE codigo = ${codigo}
                           AND visto < NOW() - INTERVAL '40 seconds'
                         RETURNING anfitrion`;
  if (idos.some(j => j.anfitrion)) await sql`DELETE FROM salas WHERE codigo = ${codigo}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sql = conexion();

    if (req.method === 'GET') {
      const codigo = limpiarCodigo(req.query.codigo);
      if (!codigo) return res.status(400).json({ error: 'Código de sala no válido' });
      await barrerAusentes(sql, codigo);
      let senales = [];
      const quien = await autenticar(sql, codigo, req.query.jugador, req.query.token);
      if (quien) {
        await sql`UPDATE sala_jugadores SET visto = NOW() WHERE id = ${quien.id}`;
        const desde = Math.max(0, parseInt(req.query.desde, 10) || 0);
        senales = await sql`SELECT id, de_id, tipo, datos FROM sala_senales
                            WHERE para_id = ${quien.id} AND id > ${desde}
                            ORDER BY id ASC LIMIT 60`;
        senales = senales.map(s => ({ ...s, id: Number(s.id) }));
      }
      const sala = await datosSala(sql, codigo);
      if (!sala) return res.status(404).json({ error: 'La sala no existe o se cerró' });
      return res.status(200).json({ sala, senales });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    let b = req.body;
    if (typeof b === 'string') {
      try { b = JSON.parse(b || '{}'); } catch (e) { b = null; }
    }
    if (!b || typeof b !== 'object') return res.status(400).json({ error: 'Cuerpo inválido' });

    if (b.accion === 'crear') {
      const modo = MODOS.includes(b.modo) ? b.modo : null;
      const nombre = limpiarNombre(b.nombre);
      const heroe = HEROES.includes(b.heroe) ? b.heroe : 'alien';
      if (!modo) return res.status(400).json({ error: 'Modo no válido' });
      if (!nombre) return res.status(400).json({ error: 'Escribe tu nombre' });
      await sql`DELETE FROM salas WHERE creada < NOW() - INTERVAL '3 hours'`;
      // un código libre; con 32^5 combinaciones casi nunca hace falta repetir
      let codigo = null;
      for (let i = 0; i < 8 && !codigo; i++) {
        const c = azar(5, LETRAS);
        const ya = await sql`SELECT 1 FROM salas WHERE codigo = ${c}`;
        if (!ya.length) codigo = c;
      }
      if (!codigo) return res.status(503).json({ error: 'No hay códigos libres, prueba otra vez' });
      const id = nuevoId(), token = nuevoToken();
      await sql`INSERT INTO salas (codigo, modo) VALUES (${codigo}, ${modo})`;
      await sql`INSERT INTO sala_jugadores (id, codigo, token, nombre, heroe, anfitrion)
                VALUES (${id}, ${codigo}, ${token}, ${nombre}, ${heroe}, TRUE)`;
      return res.status(200).json({ codigo, modo, jugador: id, token, anfitrion: true });
    }

    if (b.accion === 'unirse') {
      const codigo = limpiarCodigo(b.codigo);
      const nombre = limpiarNombre(b.nombre);
      const heroe = HEROES.includes(b.heroe) ? b.heroe : 'alien';
      if (!codigo) return res.status(400).json({ error: 'Código de sala no válido' });
      if (!nombre) return res.status(400).json({ error: 'Escribe tu nombre' });
      await barrerAusentes(sql, codigo);
      const sala = await datosSala(sql, codigo);
      if (!sala) return res.status(404).json({ error: 'No existe ninguna sala con ese código' });
      if (sala.estado !== 'espera') return res.status(409).json({ error: 'Esa partida ya empezó' });
      if (sala.jugadores.length >= MAX_JUGADORES) return res.status(409).json({ error: 'La sala está llena' });
      const id = nuevoId(), token = nuevoToken();
      await sql`INSERT INTO sala_jugadores (id, codigo, token, nombre, heroe, anfitrion)
                VALUES (${id}, ${codigo}, ${token}, ${nombre}, ${heroe}, FALSE)`;
      return res.status(200).json({ codigo, modo: sala.modo, jugador: id, token, anfitrion: false });
    }

    // A partir de aquí, todo exige ser un jugador de la sala.
    const codigo = limpiarCodigo(b.codigo);
    const quien = await autenticar(sql, codigo, b.jugador, b.token);
    if (!quien) return res.status(403).json({ error: 'No perteneces a esa sala' });
    await sql`UPDATE sala_jugadores SET visto = NOW() WHERE id = ${quien.id}`;

    if (b.accion === 'heroe') {
      const heroe = HEROES.includes(b.heroe) ? b.heroe : null;
      if (!heroe) return res.status(400).json({ error: 'Personaje no válido' });
      await sql`UPDATE sala_jugadores SET heroe = ${heroe} WHERE id = ${quien.id}`;
      return res.status(200).json({ ok: true });
    }

    if (b.accion === 'senal') {
      if (!TIPOS_SENAL.includes(b.tipo)) return res.status(400).json({ error: 'Señal no válida' });
      if (typeof b.datos !== 'string' || b.datos.length > MAX_DATOS)
        return res.status(400).json({ error: 'Señal demasiado grande' });
      const para = await sql`SELECT id FROM sala_jugadores WHERE codigo = ${codigo} AND id = ${b.para}`;
      if (!para[0]) return res.status(404).json({ error: 'Ese jugador ya no está' });
      await sql`INSERT INTO sala_senales (codigo, de_id, para_id, tipo, datos)
                VALUES (${codigo}, ${quien.id}, ${b.para}, ${b.tipo}, ${b.datos})`;
      return res.status(200).json({ ok: true });
    }

    if (b.accion === 'empezar') {
      if (!quien.anfitrion) return res.status(403).json({ error: 'Solo el anfitrión puede empezar' });
      await sql`UPDATE salas SET estado = 'jugando' WHERE codigo = ${codigo}`;
      return res.status(200).json({ ok: true });
    }

    if (b.accion === 'salir') {
      if (quien.anfitrion) await sql`DELETE FROM salas WHERE codigo = ${codigo}`;
      else await sql`DELETE FROM sala_jugadores WHERE id = ${quien.id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción desconocida' });
  } catch (e) {
    console.error('salas:', e);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
