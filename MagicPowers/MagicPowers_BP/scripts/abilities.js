import { EntityDamageCause, system, world } from "@minecraft/server";
import {
  add,
  addTask,
  bodyCenter,
  dist,
  effect,
  groundAt,
  hurt,
  impulse,
  jitter,
  knockback,
  launchOrb,
  length,
  lookPoint,
  normalize,
  particle,
  particleLine,
  particleRing,
  rand,
  rotateY,
  scale,
  sound,
  sub,
  targetsInCone,
  targetsInRadius,
  isTarget,
} from "./util.js";

// ctx = { player, dim, level, mult }
// mult = multiplicador de daño según el nivel del libro.

const DOWN = { x: 0, y: -0.25, z: 0 };

// ===========================================================================
// FUEGO
// ===========================================================================

/** Llamarada: cono de fuego de 7 bloques. */
function flameBurst(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const range = 7;
  sound(dim, "mob.blaze.shoot", eye, 1, 0.85);
  addTask((age) => {
    const d0 = age * 1.6;
    const d1 = Math.min(range, d0 + 1.6);
    for (let d = d0; d <= d1; d += 0.4) {
      const c = add(add(eye, scale(dir, d + 0.7)), DOWN);
      const spread = 0.12 + d * 0.2;
      particle(dim, "magicpowers:flame", jitter(c, spread));
      particle(dim, "magicpowers:flame", jitter(c, spread));
    }
    return d1 >= range;
  });
  for (const t of targetsInCone(player, range, 28)) {
    hurt(t, 5 * mult, player, "fire", EntityDamageCause.fire);
    try {
      t.setOnFire(3 + level, true);
    } catch {
      // Ignorado
    }
  }
}

/** Meteoro Ígneo: bola de fuego que explota (no rompe bloques). */
function meteor(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  sound(dim, "mob.ghast.fireball", eye, 1, 1);
  launchOrb({
    player,
    dim,
    start: add(eye, scale(dir, 0.8)),
    dir,
    speed: 1.3,
    maxDistance: 40,
    onTrail: (a, b) => {
      particleLine(dim, "magicpowers:flame", a, b, 0.3, 0.18);
      particle(dim, "magicpowers:flame", b);
    },
    onHit: (p) => {
      const radius = 4 + (level >= 4 ? 1 : 0);
      particle(dim, "minecraft:huge_explosion_lab_misc_emitter", p);
      particle(dim, "magicpowers:fire_burst", p);
      particle(dim, "magicpowers:fire_burst", add(p, { x: 0, y: 0.5, z: 0 }));
      sound(dim, "random.explode", p, 1.2, 0.9);
      for (const t of targetsInRadius(dim, p, radius + 1, player)) {
        const d = dist(bodyCenter(t), p);
        if (d > radius + 0.5) continue;
        const falloff = 1 - Math.min(1, d / radius) * 0.5;
        hurt(t, 10 * mult * falloff, player, "fire", EntityDamageCause.entityExplosion);
        try {
          t.setOnFire(4 + level, true);
        } catch {
          // Ignorado
        }
        knockback(t, sub(t.location, p), 1.1, 0.45);
      }
    },
  });
}

// ===========================================================================
// HIELO
// ===========================================================================

/** Fragmento Glacial: esquirla que ralentiza (3 esquirlas desde nivel 4). */
function iceShard(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const offsets = level >= 4 ? [-0.12, 0, 0.12] : [0];
  sound(dim, "mob.snowgolem.shoot", eye, 1, 0.8);
  sound(dim, "random.glass", eye, 0.4, 1.8);
  for (const off of offsets) {
    const d = normalize(rotateY(dir, off));
    launchOrb({
      player,
      dim,
      start: add(eye, scale(d, 0.8)),
      dir: d,
      speed: 1.8,
      maxDistance: 30,
      onTrail: (a, b) => particleLine(dim, "magicpowers:frost", a, b, 0.45, 0.05),
      onHit: (p, target) => {
        particle(dim, "magicpowers:frost_burst", p);
        sound(dim, "random.glass", p, 0.7, 1.4);
        if (target) {
          hurt(target, 6 * mult, player, "ice", EntityDamageCause.freezing);
          effect(target, "slowness", 80, 2);
        }
      },
    });
  }
}

/** Nova Helada: onda que congela enemigos y el agua cercana. */
function frostNova(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const radius = 6 + (level >= 4 ? 1 : 0);
  sound(dim, "random.glass", feet, 1, 0.6);
  sound(dim, "mob.player.hurt_freeze", feet, 1, 0.8);
  const base = add(feet, { x: 0, y: 0.3, z: 0 });
  addTask((age) => {
    const r = 0.8 + age * 1.1;
    particleRing(dim, "magicpowers:frost", base, r, Math.floor(r * 7));
    particleRing(dim, "magicpowers:frost", add(base, { x: 0, y: 0.8, z: 0 }), r * 0.9, Math.floor(r * 4));
    return r >= radius;
  });
  for (const t of targetsInRadius(dim, feet, radius, player)) {
    hurt(t, 7 * mult, player, "ice", EntityDamageCause.freezing);
    effect(t, "slowness", 100, 4);
    effect(t, "weakness", 100, 0);
    particle(dim, "magicpowers:frost_burst", bodyCenter(t));
  }
  freezeWater(dim, feet, radius);
}

function freezeWater(dim, center, radius) {
  const cx = Math.floor(center.x);
  const cy = Math.floor(center.y);
  const cz = Math.floor(center.z);
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      if (x * x + z * z > radius * radius) continue;
      for (let y = -2; y <= 1; y++) {
        try {
          const b = dim.getBlock({ x: cx + x, y: cy + y, z: cz + z });
          if (!b || b.typeId !== "minecraft:water") continue;
          if (b.permutation.getState("liquid_depth") !== 0) continue; // solo agua quieta
          const above = b.above();
          if (above && above.isAir) b.setType("minecraft:frosted_ice"); // se derrite sola, como Paso Helado
        } catch {
          // Ignorado
        }
      }
    }
  }
}

// ===========================================================================
// VIENTO
// ===========================================================================

/** Ráfaga: cono de viento que empuja con fuerza. */
function gust(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const range = 8;
  sound(dim, "wind_charge.burst", eye, 1, 1.1);
  sound(dim, "mob.breeze.shoot", eye, 0.7, 1);
  addTask((age) => {
    const d0 = age * 2;
    const d1 = Math.min(range, d0 + 2);
    for (let d = d0; d <= d1; d += 0.5) {
      const c = add(add(eye, scale(dir, d + 0.6)), DOWN);
      particle(dim, "magicpowers:wind", jitter(c, 0.15 + d * 0.18));
    }
    if (d1 >= range) particle(dim, "minecraft:wind_explosion_emitter", add(eye, scale(dir, range * 0.6)));
    return d1 >= range;
  });
  for (const t of targetsInCone(player, range, 32)) {
    hurt(t, 3 * mult, player, "wind", EntityDamageCause.entityAttack);
    knockback(t, dir, 2.4 + 0.3 * level, 0.55);
    particle(dim, "minecraft:breeze_wind_explosion_emitter", bodyCenter(t));
  }
}

/** Tornado: torbellino que avanza, atrae y eleva enemigos. */
function tornado(ctx) {
  const { player, dim, mult, level } = ctx;
  const flat = normalize({ x: player.getViewDirection().x, y: 0, z: player.getViewDirection().z });
  const start = groundAt(dim, lookPoint(player, 12));
  const duration = 80 + level * 10;
  const pullRadius = 5;
  sound(dim, "mob.breeze.inhale", start, 1.2, 0.8);
  addTask((age) => {
    if (!player.isValid) return true;
    const c = add(start, scale(flat, age * 0.06));
    // Espiral de viento
    for (let k = 0; k < 2; k++) {
      for (let h = 0; h <= 4.5; h += 0.75) {
        const r = 0.4 + h * 0.32;
        const a = age * 0.55 + h * 0.9 + k * Math.PI;
        particle(dim, "magicpowers:wind", { x: c.x + Math.cos(a) * r, y: c.y + h, z: c.z + Math.sin(a) * r });
      }
    }
    if (age % 20 === 0) sound(dim, "mob.breeze.whirl", c, 1, 0.8);
    for (const t of targetsInRadius(dim, add(c, { x: 0, y: 1.5, z: 0 }), pullRadius, player)) {
      const to = sub(c, t.location);
      const flatTo = { x: to.x, y: 0, z: to.z };
      const d = length(flatTo);
      const inward = d > 0.3 ? scale(normalize(flatTo), Math.min(0.12, 0.04 * d)) : { x: 0, y: 0, z: 0 };
      const tangent = d > 0.3 ? scale(normalize({ x: -flatTo.z, y: 0, z: flatTo.x }), 0.08) : { x: 0, y: 0, z: 0 };
      const up = t.location.y < c.y + 3 ? 0.13 : 0.02;
      impulse(t, add(add(inward, tangent), { x: 0, y: up, z: 0 }));
      if (age % 10 === 0) hurt(t, 2 * mult, player, "wind", EntityDamageCause.entityAttack);
    }
    return age >= duration;
  });
}

// ===========================================================================
// ELECTRICIDAD
// ===========================================================================

/** Dibuja un rayo en zigzag entre dos puntos. */
function bolt(dim, a, b, jag = 0.35, id = "magicpowers:spark") {
  const d = dist(a, b);
  const n = Math.max(2, Math.ceil(d / 1.1));
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const base = add(a, scale(sub(b, a), i / n));
    const p = i === n ? b : jitter(base, jag);
    particleLine(dim, id, prev, p, 0.22);
    prev = p;
  }
}

/** Rayo en Cadena: rayo que salta entre varios enemigos. */
function chainLightning(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const range = 22;
  let first;
  try {
    const hits = player.getEntitiesFromViewDirection({ maxDistance: range });
    hits.sort((a, b) => a.distance - b.distance);
    first = hits.find((h) => isTarget(h.entity, player))?.entity;
  } catch {
    // Ignorado
  }
  if (!first) {
    // Ayuda de puntería: el enemigo más cercano en un cono estrecho
    first = targetsInCone(player, range, 10).sort((a, b) => dist(a.location, eye) - dist(b.location, eye))[0];
  }
  const origin = add(eye, add(scale(dir, 0.6), DOWN));
  sound(dim, "firework.twinkle", eye, 1, 1.4);
  sound(dim, "random.fizz", eye, 0.6, 2);
  if (!first) {
    const p = lookPoint(player, range);
    bolt(dim, origin, p);
    particle(dim, "magicpowers:spark_burst", p);
    return;
  }
  const jumps = 1 + Math.floor(level / 2);
  const chain = [first];
  for (let i = 0; i < jumps; i++) {
    const last = chain[chain.length - 1];
    const next = targetsInRadius(dim, last.location, 7, player)
      .filter((e) => !chain.some((c) => c.id === e.id))
      .sort((a, b) => dist(a.location, last.location) - dist(b.location, last.location))[0];
    if (!next) break;
    chain.push(next);
  }
  let from = origin;
  chain.forEach((target, i) => {
    const a = from;
    addTask(() => {
      if (!target.isValid) return true;
      const p = bodyCenter(target);
      bolt(dim, a, p);
      particle(dim, "magicpowers:spark_burst", p);
      particle(dim, "minecraft:electric_spark_particle", p);
      hurt(target, 7 * mult * Math.pow(0.8, i), player, "lightning", EntityDamageCause.lightning);
      effect(target, "slowness", 20, 2);
      if (i > 0) sound(dim, "firework.twinkle", p, 0.8, 1.6);
      return true;
    }, i * 2);
    from = bodyCenter(target);
  });
}

/** Tormenta: rayos del cielo sobre los enemigos cercanos. */
function thunderstorm(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const strikes = 2 + level;
  const targets = targetsInRadius(dim, feet, 14, player)
    .sort((a, b) => dist(a.location, feet) - dist(b.location, feet))
    .slice(0, strikes);
  sound(dim, "ambient.weather.thunder", feet, 0.6, 1.2);
  sound(dim, "item.trident.thunder", feet, 0.8, 1);
  const points = targets.length
    ? targets.map((t) => ({ target: t }))
    : [0, 1, 2].map(() => ({ point: add(lookPoint(player, 14), { x: rand(-2, 2), y: 0, z: rand(-2, 2) }) }));
  points.forEach((entry, i) => {
    addTask(() => {
      const { target } = entry;
      if (target && !target.isValid) return true;
      const p = target ? target.location : groundAt(dim, entry.point);
      strike(dim, p);
      if (target) {
        hurt(target, 12 * mult, player, "lightning", EntityDamageCause.lightning);
        knockback(target, sub(target.location, feet), 0.3, 0.35);
      }
      return true;
    }, 4 + i * 5);
  });
}

function strike(dim, p) {
  const top = add(p, { x: rand(-1.5, 1.5), y: 14, z: rand(-1.5, 1.5) });
  // Guardamos el trazado para que el rayo "parpadee" 3 ticks con la misma forma.
  const pts = [top];
  const n = 10;
  for (let i = 1; i < n; i++) pts.push(jitter(add(top, scale(sub(p, top), i / n)), 0.6));
  pts.push(p);
  sound(dim, "ambient.weather.lightning.impact", p, 1, 1);
  particle(dim, "magicpowers:spark_burst", add(p, { x: 0, y: 0.3, z: 0 }));
  particle(dim, "minecraft:electric_spark_particle", p);
  addTask((age) => {
    for (let i = 1; i < pts.length; i++) particleLine(dim, "magicpowers:spark", pts[i - 1], pts[i], 0.3);
    return age >= 2;
  });
}

// ===========================================================================
// GRAVEDAD
// ===========================================================================

/** Daño de cada piedra lanzada: id de la entidad -> { pid, dmg } */
export const pebbleData = new Map();

/** Lluvia de Piedras: lanza pequeñas piedras (5 desde nivel 3). */
function stoneVolley(ctx) {
  const { player, dim, mult, level } = ctx;
  const count = level >= 3 ? 5 : 3;
  for (let i = 0; i < count; i++) {
    addTask(() => {
      if (!player.isValid) return true;
      const eye = player.getHeadLocation();
      const dir = player.getViewDirection();
      const d = normalize(add(rotateY(dir, rand(-0.09, 0.09)), { x: 0, y: rand(-0.03, 0.06), z: 0 }));
      try {
        const stone = dim.spawnEntity("magicpowers:pebble", add(eye, scale(d, 1.1)));
        const proj = stone.getComponent("minecraft:projectile");
        if (proj) {
          proj.owner = player;
          proj.shoot(scale(d, 1.9));
        }
        pebbleData.set(stone.id, { pid: player.id, dmg: 4 * mult });
        addTask((age) => {
          if (!stone.isValid || age > 30) return true;
          particle(dim, "magicpowers:gravity", stone.location);
          return false;
        });
      } catch {
        // Ignorado
      }
      sound(dim, "mob.irongolem.throw", eye, 0.7, 1.4 + i * 0.05);
      return true;
    }, i * 2);
  }
}

/** Colapso: eleva a los enemigos hacia un punto y los aplasta contra el suelo. */
function collapse(ctx) {
  const { player, dim, mult, level } = ctx;
  const center = groundAt(dim, lookPoint(player, 10));
  const radius = 6 + (level >= 4 ? 1 : 0);
  const targets = targetsInRadius(dim, center, radius + 1, player);
  const core = add(center, { x: 0, y: 3, z: 0 });
  sound(dim, "mob.evocation_illager.prepare_attack", center, 1, 0.6);
  sound(dim, "block.end_portal.spawn", center, 0.4, 1.6);
  addTask((age) => {
    if (age < 20) {
      particleRing(dim, "magicpowers:gravity", add(center, { x: 0, y: 0.2, z: 0 }), radius * (1 - age / 20), 16);
      particle(dim, "magicpowers:gravity", jitter(core, 0.4));
      particle(dim, "magicpowers:gravity", jitter(core, 0.4));
      for (const t of targets) {
        if (!t.isValid) continue;
        const to = sub(center, t.location);
        const flatTo = { x: to.x, y: 0, z: to.z };
        const d = length(flatTo);
        const inward = d > 0.5 ? scale(normalize(flatTo), Math.min(0.1, 0.03 * d)) : { x: 0, y: 0, z: 0 };
        impulse(t, add(inward, { x: 0, y: age < 14 ? 0.14 : 0.02, z: 0 }));
        if (age % 3 === 0) particle(dim, "magicpowers:gravity", t.location);
      }
      return false;
    }
    // ¡Aplastamiento!
    sound(dim, "mace.heavy_smash_ground", center, 1.2, 0.8);
    sound(dim, "random.explode", center, 0.6, 0.6);
    particle(dim, "magicpowers:gravity_burst", center);
    particle(dim, "minecraft:dust_plume", center);
    particleRing(dim, "magicpowers:gravity", add(center, { x: 0, y: 0.2, z: 0 }), 2, 14);
    particleRing(dim, "magicpowers:gravity", add(center, { x: 0, y: 0.2, z: 0 }), 4, 24);
    for (const t of targets) {
      if (!t.isValid) continue;
      try {
        t.clearVelocity();
      } catch {
        // Ignorado
      }
      impulse(t, { x: 0, y: -3, z: 0 });
      hurt(t, 9 * mult, player, "gravity", EntityDamageCause.entityAttack);
    }
    return true;
  });
}

export const ABILITIES = {
  fire: [flameBurst, meteor],
  ice: [iceShard, frostNova],
  wind: [gust, tornado],
  lightning: [chainLightning, thunderstorm],
  gravity: [stoneVolley, collapse],
};

/** Limpieza periódica de datos de piedras que ya no existen. */
system.runInterval(() => {
  for (const id of pebbleData.keys()) {
    let alive = false;
    try {
      alive = !!world.getEntity(id)?.isValid;
    } catch {
      // Ignorado
    }
    if (!alive) pebbleData.delete(id);
  }
}, 200);
