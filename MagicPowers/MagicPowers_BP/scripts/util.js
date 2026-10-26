import { system, world } from "@minecraft/server";

// ---------------------------------------------------------------------------
// Vectores
// ---------------------------------------------------------------------------
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const length = (a) => Math.hypot(a.x, a.y, a.z);
export const dist = (a, b) => length(sub(a, b));
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const normalize = (a) => {
  const l = length(a);
  return l < 1e-6 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l);
};
export const lerp = (a, b, t) => add(a, scale(sub(b, a), t));
export const rand = (min, max) => min + Math.random() * (max - min);
export const jitter = (p, r) => ({ x: p.x + rand(-r, r), y: p.y + rand(-r, r), z: p.z + rand(-r, r) });

/** Gira un vector alrededor del eje Y (radianes). */
export function rotateY(v, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: v.x * c - v.z * s, y: v.y, z: v.x * s + v.z * c };
}

/** Centro aproximado del cuerpo de una entidad. */
export function bodyCenter(entity) {
  const feet = entity.location;
  const head = entity.getHeadLocation();
  return { x: feet.x, y: (feet.y + head.y) / 2, z: feet.z };
}

// ---------------------------------------------------------------------------
// Tareas por tick (efectos que duran varios ticks sin crear un intervalo cada uno)
// ---------------------------------------------------------------------------
const tasks = [];

/** step(edad) se llama cada tick; devuelve true cuando ha terminado. */
export function addTask(step, delay = 0) {
  tasks.push({ step, age: -delay });
}

export function runTasks() {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const t = tasks[i];
    let done = true;
    try {
      done = t.age < 0 ? false : t.step(t.age);
    } catch {
      done = true;
    }
    t.age++;
    if (done) tasks.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Efectos
// ---------------------------------------------------------------------------
export function particle(dim, id, loc) {
  try {
    dim.spawnParticle(id, loc);
  } catch {
    // Chunk sin cargar o fuera del mundo: se ignora.
  }
}

export function sound(dim, id, loc, volume = 1, pitch = 1) {
  try {
    dim.playSound(id, loc, { volume, pitch });
  } catch {
    // Ignorado
  }
}

/** Línea de partículas entre dos puntos. */
export function particleLine(dim, id, from, to, spacing = 0.35, spread = 0) {
  const d = dist(from, to);
  const n = Math.max(1, Math.ceil(d / spacing));
  for (let i = 0; i <= n; i++) {
    const p = lerp(from, to, i / n);
    particle(dim, id, spread ? jitter(p, spread) : p);
  }
}

/** Anillo horizontal de partículas. */
export function particleRing(dim, id, center, radius, count) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    particle(dim, id, { x: center.x + Math.cos(a) * radius, y: center.y, z: center.z + Math.sin(a) * radius });
  }
}

// ---------------------------------------------------------------------------
// Objetivos y daño
// ---------------------------------------------------------------------------
const FRIENDLY_TYPES = new Set([
  "minecraft:villager",
  "minecraft:villager_v2",
  "minecraft:wandering_trader",
  "minecraft:iron_golem",
  "minecraft:snow_golem",
  "minecraft:allay",
  "minecraft:npc",
  "minecraft:armor_stand",
]);
const EXCLUDE_TYPES = ["minecraft:item", "minecraft:xp_orb", "magicpowers:pebble", ...FRIENDLY_TYPES];
const EXCLUDE_FAMILIES = ["player", "inanimate", "projectile"];

/** Último golpe mágico recibido por cada entidad: id -> { pid, el, tick } */
export const lastHit = new Map();

export function isTarget(entity, player) {
  try {
    if (!entity.isValid || entity.id === player.id) return false;
    if (FRIENDLY_TYPES.has(entity.typeId)) return false;
    if (!entity.getComponent("minecraft:health")) return false;
    const tame = entity.getComponent("minecraft:tameable");
    if (tame?.isTamed) return false;
    const riding = player.getComponent("minecraft:riding");
    if (riding?.entityRidingOn?.id === entity.id) return false;
    return true;
  } catch {
    return false;
  }
}

export function targetsInRadius(dim, center, radius, player) {
  try {
    return dim
      .getEntities({ location: center, maxDistance: radius, excludeTypes: EXCLUDE_TYPES, excludeFamilies: EXCLUDE_FAMILIES })
      .filter((e) => isTarget(e, player));
  } catch {
    return [];
  }
}

/** Objetivos dentro de un cono delante del jugador. */
export function targetsInCone(player, range, halfAngleDeg) {
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const cos = Math.cos((halfAngleDeg * Math.PI) / 180);
  return targetsInRadius(player.dimension, eye, range + 1, player).filter((e) => {
    const to = sub(bodyCenter(e), eye);
    const d = length(to);
    if (d < 1.2) return true; // pegado al jugador
    return d <= range + 0.5 && dot(normalize(to), dir) >= cos;
  });
}

export function hurt(target, amount, player, el, cause) {
  try {
    if (!target.isValid) return false;
    lastHit.set(target.id, { pid: player.id, el, tick: system.currentTick });
    return target.applyDamage(amount, { cause, damagingEntity: player });
  } catch {
    return false;
  }
}

export function knockback(target, dirXZ, horizontal, vertical) {
  try {
    const d = normalize({ x: dirXZ.x, y: 0, z: dirXZ.z });
    target.applyKnockback({ x: d.x * horizontal, z: d.z * horizontal }, vertical);
  } catch {
    // Algunas entidades (jefes) no aceptan empuje.
  }
}

export function impulse(target, vec) {
  try {
    target.applyImpulse(vec);
  } catch {
    // Ignorado
  }
}

export function effect(target, id, ticks, amplifier = 0) {
  try {
    target.addEffect(id, ticks, { amplifier, showParticles: true });
  } catch {
    // Ignorado
  }
}

/** Punto al que mira el jugador (bloque o distancia máxima). */
export function lookPoint(player, maxDistance) {
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance, includePassableBlocks: false });
    if (hit) {
      const p = add(hit.block.location, hit.faceLocation);
      return sub(p, scale(dir, 0.3));
    }
  } catch {
    // Ignorado
  }
  return add(eye, scale(dir, maxDistance));
}

/** Busca un suelo cerca de 'loc' (para efectos que nacen en el suelo). */
export function groundAt(dim, loc) {
  try {
    const block = dim.getBlockFromRay(add(loc, { x: 0, y: 1, z: 0 }), { x: 0, y: -1, z: 0 }, {
      maxDistance: 12,
      includePassableBlocks: false,
    });
    if (block) return { x: loc.x, y: block.block.location.y + 1, z: loc.z };
  } catch {
    // Ignorado
  }
  return loc;
}

/**
 * Proyectil simulado por script (sin entidad): avanza cada tick, comprueba
 * bloques y entidades con raycasts y llama a onHit al chocar.
 */
export function launchOrb(opts) {
  const { player, dim, dir, speed, maxDistance, onTrail, onHit } = opts;
  let pos = opts.start;
  let travelled = 0;
  const pid = player.id;
  addTask(() => {
    if (!player.isValid) return true;
    const step = Math.min(speed, maxDistance - travelled);
    let hitEntity;
    let hitDist = step;
    try {
      const hits = dim.getEntitiesFromRay(pos, dir, { maxDistance: step + 0.3, ignoreBlockCollision: false });
      hits.sort((a, b) => a.distance - b.distance);
      for (const h of hits) {
        if (h.entity.id !== pid && isTarget(h.entity, player) && h.distance < hitDist + 0.3) {
          hitEntity = h.entity;
          hitDist = Math.min(h.distance, step);
          break;
        }
      }
    } catch {
      // Ignorado
    }
    let blockDist;
    try {
      const b = dim.getBlockFromRay(pos, dir, { maxDistance: step, includePassableBlocks: false, includeLiquidBlocks: false });
      if (b) blockDist = dist(pos, add(b.block.location, b.faceLocation));
    } catch {
      blockDist = 0; // fuera del mundo / chunk sin cargar
    }
    if (blockDist !== undefined && (!hitEntity || blockDist < hitDist)) {
      const p = add(pos, scale(dir, Math.max(0, blockDist - 0.2)));
      onTrail?.(pos, p);
      onHit(p, undefined);
      return true;
    }
    if (hitEntity) {
      const p = add(pos, scale(dir, hitDist));
      onTrail?.(pos, p);
      onHit(p, hitEntity);
      return true;
    }
    const next = add(pos, scale(dir, step));
    onTrail?.(pos, next);
    pos = next;
    travelled += step;
    if (travelled >= maxDistance - 1e-3) {
      onHit(pos, undefined);
      return true;
    }
    return false;
  });
}

export function playerById(id) {
  try {
    return world.getEntity(id);
  } catch {
    return undefined;
  }
}
