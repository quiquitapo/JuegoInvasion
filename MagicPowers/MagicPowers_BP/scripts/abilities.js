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
  isTarget,
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
} from "./util.js";

// ctx = { player, dim, level, mult, kind }  (kind = libro que lanza el hechizo)
// mult = multiplicador de daño según el nivel del libro. Los daños de nivel 1
// están pensados para matar a un zombi (20 de vida) con 2-3 hechizos básicos.

const DOWN = { x: 0, y: -0.25, z: 0 };
const UP = (y) => ({ x: 0, y, z: 0 });

function flatDir(player) {
  const d = player.getViewDirection();
  return normalize({ x: d.x, y: 0, z: d.z });
}

function setFire(target, seconds) {
  try {
    target.setOnFire(seconds, true);
  } catch {
    // Ignorado
  }
}

/** Animación de un cono que avanza (llamarada, ráfaga…). */
function coneWave(dim, eye, dir, range, speed, id, perStep = 2, spreadBase = 0.12, spreadGrow = 0.2) {
  addTask((age) => {
    const d0 = age * speed;
    const d1 = Math.min(range, d0 + speed);
    for (let d = d0; d <= d1; d += 0.4) {
      const c = add(add(eye, scale(dir, d + 0.7)), DOWN);
      for (let k = 0; k < perStep; k++) particle(dim, id, jitter(c, spreadBase + d * spreadGrow));
    }
    return d1 >= range;
  });
}

// ===========================================================================
// FUEGO
// ===========================================================================

/** 1. Llamarada: cono de fuego de 7 bloques. */
function flameBurst(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  sound(dim, "mob.blaze.shoot", eye, 1, 0.85, 0.05);
  sound(dim, "fire.ignite", eye, 1, 0.9);
  coneWave(dim, eye, dir, 7, 1.6, "magicpowers:flame");
  for (const t of targetsInCone(player, 7, 28)) {
    hurt(t, 9 * mult, ctx, EntityDamageCause.fire);
    setFire(t, 3 + level);
    sound(dim, "fire.fire", t.location, 0.8, 1.2);
  }
}

function fireExplosion(ctx, p, radius, damage, loud = 1) {
  const { player, dim, level } = ctx;
  if (loud >= 1) particle(dim, "minecraft:huge_explosion_lab_misc_emitter", p);
  particle(dim, "magicpowers:fire_burst", p);
  particle(dim, "magicpowers:fire_burst", add(p, UP(0.5)));
  sound(dim, "random.explode", p, 1.1 * loud, 0.95, 0.1);
  sound(dim, "item.firecharge.use", p, 0.8 * loud, 0.8);
  for (const t of targetsInRadius(dim, p, radius + 1, player)) {
    const d = dist(bodyCenter(t), p);
    if (d > radius + 0.5) continue;
    const falloff = 1 - Math.min(1, d / radius) * 0.4;
    hurt(t, damage * falloff, ctx, EntityDamageCause.entityExplosion);
    setFire(t, 3 + level);
    knockback(t, sub(t.location, p), 1.0, 0.45);
  }
}

/** 2. Meteoro Ígneo: bola de fuego que explota (no rompe bloques). */
function meteor(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  sound(dim, "mob.ghast.fireball", eye, 1, 1, 0.05);
  launchOrb({
    player,
    dim,
    start: add(eye, scale(dir, 0.8)),
    dir,
    speed: 1.3,
    maxDistance: 40,
    onTick: (pos, age) => {
      if (age % 6 === 0) sound(dim, "fire.fire", pos, 0.6, 1.4);
    },
    onTrail: (a, b) => {
      particleLine(dim, "magicpowers:flame", a, b, 0.3, 0.18);
      particle(dim, "magicpowers:flame", b);
    },
    onHit: (p) => fireExplosion(ctx, p, 4 + (level >= 4 ? 1 : 0), 14 * mult),
  });
}

/** 3. Erupción: anillo de fuego que lanza por los aires a quien esté cerca. */
function eruption(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const radius = 5 + (level >= 4 ? 1 : 0);
  sound(dim, "mob.blaze.breathe", feet, 1, 0.7);
  sound(dim, "bucket.empty_lava", feet, 1, 0.8);
  sound(dim, "random.explode", feet, 0.6, 1.4);
  particle(dim, "magicpowers:fire_burst", add(feet, UP(0.3)));
  addTask((age) => {
    const r = 0.8 + age * 1.1;
    particleRing(dim, "magicpowers:flame", add(feet, UP(0.2)), r, Math.floor(r * 8));
    particleRing(dim, "magicpowers:flame", add(feet, UP(0.9)), r * 0.8, Math.floor(r * 4));
    if (age === 2) sound(dim, "liquid.lavapop", feet, 1, 0.8);
    return r >= radius;
  });
  for (const t of targetsInRadius(dim, feet, radius, player)) {
    hurt(t, 10 * mult, ctx, EntityDamageCause.fire);
    setFire(t, 4 + level);
    knockback(t, sub(t.location, feet), 1.2, 0.8);
  }
}

/** 4. Lluvia de Meteoros: meteoros caen del cielo sobre la zona a la que miras. */
function meteorRain(ctx) {
  const { player, dim, mult, level } = ctx;
  const center = groundAt(dim, lookPoint(player, 26));
  const back = scale(flatDir(player), -4);
  const count = 6 + level;
  sound(dim, "mob.ghast.charge", player.location, 1, 0.7);
  sound(dim, "ambient.weather.thunder", center, 0.5, 1.6);
  for (let i = 0; i < count; i++) {
    addTask(() => {
      const target = groundAt(dim, add(center, { x: rand(-5, 5), y: 0, z: rand(-5, 5) }));
      const start = add(add(target, back), UP(18));
      sound(dim, "mob.blaze.shoot", add(target, UP(6)), 0.7, 0.6, 0.1);
      addTask((age) => {
        const t = Math.min(1, (age + 1) / 10);
        const prev = add(start, scale(sub(target, start), Math.max(0, t - 0.1)));
        const cur = add(start, scale(sub(target, start), t));
        particleLine(dim, "magicpowers:flame", prev, cur, 0.35, 0.25);
        if (t >= 1) {
          fireExplosion(ctx, add(target, UP(0.3)), 2.5, 9 * mult, 0.6);
          return true;
        }
        return false;
      });
      return true;
    }, i * 5);
  }
}

// ===========================================================================
// HIELO
// ===========================================================================

/** 1. Fragmento Glacial: esquirla que ralentiza (3 esquirlas desde nivel 4). */
function iceShard(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const offsets = level >= 4 ? [-0.12, 0, 0.12] : [0];
  sound(dim, "mob.snowgolem.shoot", eye, 1, 0.8, 0.05);
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
        sound(dim, "random.glass", p, 0.7, 1.4, 0.15);
        if (target) {
          hurt(target, 10 * mult, ctx, EntityDamageCause.freezing);
          effect(target, "slowness", 60, 2);
          sound(dim, "mob.player.hurt_freeze", p, 0.6, 1.2);
        }
      },
    });
  }
}

/** 2. Estacas de Hielo: una fila de estacas brota del suelo hacia delante. */
function iceSpikes(ctx) {
  const { player, dim, mult, level } = ctx;
  const flat = flatDir(player);
  const origin = player.location;
  const length = 10 + (level >= 4 ? 3 : 0);
  const hit = new Set();
  let lastY = origin.y;
  sound(dim, "break.large_amethyst_bud", origin, 1, 0.7);
  sound(dim, "mob.snowgolem.shoot", origin, 0.8, 0.6);
  addTask((age) => {
    const i = age + 1;
    const p = groundAt(dim, add(add(origin, scale(flat, i * 1.1)), UP(1)));
    if (p.y > lastY + 1.6) return true; // choca contra una pared
    lastY = p.y;
    particle(dim, "magicpowers:ice_spike", add(p, UP(0.1)));
    particle(dim, "magicpowers:ice_spike", add(add(p, rotateY(flat, Math.PI / 2)), { x: 0, y: 0.05, z: 0 }));
    particle(dim, "magicpowers:frost_burst", add(p, UP(0.4)));
    sound(dim, "random.glass", p, 0.55, 1.4, 0.2);
    if (i % 3 === 0) sound(dim, "break.medium_amethyst_bud", p, 0.8, 0.8);
    for (const t of targetsInRadius(dim, add(p, UP(0.6)), 2.1, player)) {
      if (hit.has(t.id)) continue;
      hit.add(t.id);
      hurt(t, 11 * mult, ctx, EntityDamageCause.freezing);
      knockback(t, flat, 0.3, 0.65);
      effect(t, "slowness", 60, 2);
    }
    return i >= length;
  });
}

/** 3. Congelación: congela a los enemigos cercanos y el agua de alrededor. */
function deepFreeze(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const radius = 7 + (level >= 4 ? 1 : 0);
  sound(dim, "mob.player.hurt_freeze", feet, 1, 0.7);
  sound(dim, "random.glass", feet, 1, 0.5);
  sound(dim, "bucket.empty_powder_snow", feet, 1, 0.8);
  const base = add(feet, UP(0.3));
  addTask((age) => {
    const r = 0.8 + age * 1.3;
    particleRing(dim, "magicpowers:frost", base, r, Math.floor(r * 7));
    particleRing(dim, "magicpowers:frost", add(base, UP(0.8)), r * 0.9, Math.floor(r * 4));
    if (age === 2) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        particle(dim, "magicpowers:ice_spike", groundAt(dim, add(feet, { x: Math.cos(a) * 2.5, y: 1, z: Math.sin(a) * 2.5 })));
      }
    }
    return r >= radius;
  });
  for (const t of targetsInRadius(dim, feet, radius, player)) {
    hurt(t, 9 * mult, ctx, EntityDamageCause.freezing);
    // Congelado: casi no puede moverse ni atacar
    effect(t, "slowness", 80, 6);
    effect(t, "mining_fatigue", 80, 2);
    effect(t, "weakness", 80, 1);
    particle(dim, "magicpowers:frost_burst", bodyCenter(t));
    particle(dim, "magicpowers:ice_spike", t.location);
    sound(dim, "hit.powder_snow", t.location, 1, 0.8);
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

/** 4. Ventisca: tormenta de nieve que hiere y frena a quien entre en ella. */
function blizzard(ctx) {
  const { player, dim, mult, level } = ctx;
  const center = groundAt(dim, lookPoint(player, 18));
  const radius = 5 + (level >= 4 ? 1 : 0);
  const duration = 100 + level * 10;
  sound(dim, "mob.breeze.inhale", center, 1, 0.5);
  sound(dim, "bucket.empty_powder_snow", center, 1, 0.6);
  addTask((age) => {
    if (!player.isValid) return true;
    for (let k = 0; k < 7; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      particle(dim, "magicpowers:snowfall", {
        x: center.x + Math.cos(a) * r,
        y: center.y + rand(3, 6),
        z: center.z + Math.sin(a) * r,
      });
    }
    const swirl = age * 0.4;
    particle(dim, "magicpowers:wind", { x: center.x + Math.cos(swirl) * radius * 0.7, y: center.y + 1.2, z: center.z + Math.sin(swirl) * radius * 0.7 });
    if (age % 20 === 0) {
      sound(dim, "mob.breeze.whirl", center, 0.9, 0.5);
      sound(dim, "step.powder_snow", center, 1, 0.7);
    }
    if (age % 10 === 0) {
      for (const t of targetsInRadius(dim, add(center, UP(1)), radius + 0.5, player)) {
        hurt(t, 4 * mult, ctx, EntityDamageCause.freezing);
        effect(t, "slowness", 30, 2);
        particle(dim, "magicpowers:frost_burst", bodyCenter(t));
        sound(dim, "random.glass", t.location, 0.4, 1.6, 0.2);
      }
    }
    return age >= duration;
  });
}

// ===========================================================================
// VIENTO
// ===========================================================================

/** 1. Ráfaga: cono de viento que empuja con fuerza. */
function gust(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  const range = 8;
  sound(dim, "wind_charge.burst", eye, 1, 1.1, 0.05);
  sound(dim, "mob.breeze.shoot", eye, 0.7, 1);
  coneWave(dim, eye, dir, range, 2, "magicpowers:wind", 1, 0.15, 0.18);
  particle(dim, "minecraft:wind_explosion_emitter", add(eye, scale(dir, range * 0.6)));
  for (const t of targetsInCone(player, range, 32)) {
    hurt(t, 6 * mult, ctx, EntityDamageCause.entityAttack);
    knockback(t, dir, 2.4 + 0.3 * level, 0.55);
    particle(dim, "minecraft:breeze_wind_explosion_emitter", bodyCenter(t));
  }
}

/** 2. Salto de Viento: te impulsa hacia delante y planeas sin daño de caída. */
function windLeap(ctx) {
  const { player, dim, mult, level } = ctx;
  const flat = flatDir(player);
  const feet = player.location;
  sound(dim, "mob.breeze.jump", feet, 1, 1, 0.05);
  sound(dim, "breeze_wind_charge.burst", feet, 1, 1.2);
  particle(dim, "minecraft:wind_explosion_emitter", feet);
  for (const t of targetsInRadius(dim, feet, 3.5, player)) {
    hurt(t, 5 * mult, ctx, EntityDamageCause.entityAttack);
    knockback(t, sub(t.location, feet), 1.6, 0.4);
  }
  try {
    player.applyKnockback({ x: flat.x * (2.4 + 0.2 * level), z: flat.z * (2.4 + 0.2 * level) }, 0.75);
  } catch {
    // Ignorado
  }
  effect(player, "slow_falling", 70, 0);
  addTask((age) => {
    if (!player.isValid) return true;
    particle(dim, "magicpowers:wind", jitter(player.location, 0.3));
    particle(dim, "magicpowers:wind", jitter(add(player.location, UP(1)), 0.3));
    return age >= 14;
  });
}

/** 3. Cuchillas de Viento: tres cuchillas que atraviesan a los enemigos. */
function windBlades(ctx) {
  const { player, dim, mult } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  sound(dim, "item.trident.throw", eye, 1, 1.4, 0.05);
  sound(dim, "mob.breeze.shoot", eye, 0.6, 1.6);
  for (const off of [-0.22, 0, 0.22]) {
    const d = normalize(rotateY(dir, off));
    launchOrb({
      player,
      dim,
      start: add(eye, add(scale(d, 0.8), DOWN)),
      dir: d,
      speed: 2,
      maxDistance: 18,
      pierce: true,
      onTrail: (a, b) => particleLine(dim, "magicpowers:wind", a, b, 0.5, 0.08),
      onEntity: (t, p) => {
        hurt(t, 9 * mult, ctx, EntityDamageCause.entityAttack);
        knockback(t, d, 0.6, 0.2);
        sound(dim, "item.trident.hit", p, 0.8, 1.3, 0.1);
      },
      onHit: (p) => particle(dim, "minecraft:wind_explosion_emitter", p),
    });
  }
}

/** 4. Tornado: torbellino que avanza, atrae y eleva enemigos. */
function tornado(ctx) {
  const { player, dim, mult, level } = ctx;
  const flat = flatDir(player);
  const start = groundAt(dim, lookPoint(player, 12));
  const duration = 80 + level * 10;
  sound(dim, "mob.breeze.inhale", start, 1.2, 0.8);
  sound(dim, "wind_charge.burst", start, 1, 0.6);
  addTask((age) => {
    if (!player.isValid) return true;
    const c = add(start, scale(flat, age * 0.06));
    for (let k = 0; k < 2; k++) {
      for (let h = 0; h <= 4.5; h += 0.75) {
        const r = 0.4 + h * 0.32;
        const a = age * 0.55 + h * 0.9 + k * Math.PI;
        particle(dim, "magicpowers:wind", { x: c.x + Math.cos(a) * r, y: c.y + h, z: c.z + Math.sin(a) * r });
      }
    }
    if (age % 20 === 0) sound(dim, "mob.breeze.whirl", c, 1, 0.8);
    for (const t of targetsInRadius(dim, add(c, UP(1.5)), 5, player)) {
      const to = sub(c, t.location);
      const flatTo = { x: to.x, y: 0, z: to.z };
      const d = length(flatTo);
      const inward = d > 0.3 ? scale(normalize(flatTo), Math.min(0.12, 0.04 * d)) : UP(0);
      const tangent = d > 0.3 ? scale(normalize({ x: -flatTo.z, y: 0, z: flatTo.x }), 0.08) : UP(0);
      impulse(t, add(add(inward, tangent), UP(t.location.y < c.y + 3 ? 0.13 : 0.02)));
      if (age % 10 === 0) hurt(t, 3 * mult, ctx, EntityDamageCause.entityAttack);
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
    const p = i === n ? b : jitter(add(a, scale(sub(b, a), i / n)), jag);
    particleLine(dim, id, prev, p, 0.22);
    prev = p;
  }
}

function zap(ctx, from, target, damage) {
  const { player, dim } = ctx;
  const p = bodyCenter(target);
  bolt(dim, from, p);
  particle(dim, "magicpowers:spark_burst", p);
  hurt(target, damage, ctx, EntityDamageCause.lightning);
  sound(dim, "firework.twinkle", p, 0.7, 1.6, 0.2);
}

/** 1. Rayo en Cadena: rayo que salta entre varios enemigos. */
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
  const chain = [first];
  for (let i = 0; i < 1 + Math.floor(level / 2); i++) {
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
      zap(ctx, a, target, 10 * mult * Math.pow(0.8, i));
      particle(dim, "minecraft:electric_spark_particle", bodyCenter(target));
      effect(target, "slowness", 20, 2);
      return true;
    }, i * 2);
    from = bodyCenter(target);
  });
}

/** 2. Pulso Estático: descarga a tu alrededor que aturde. */
function staticPulse(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const center = bodyCenter(player);
  const radius = 6 + (level >= 4 ? 1 : 0);
  sound(dim, "conduit.attack", feet, 1, 1.2);
  sound(dim, "random.fizz", feet, 0.8, 1.5);
  particle(dim, "magicpowers:spark_burst", center);
  addTask((age) => {
    const r = 1 + age * 1.5;
    particleRing(dim, "magicpowers:spark", add(feet, UP(0.4)), r, Math.floor(r * 9));
    return r >= radius;
  });
  for (const t of targetsInRadius(dim, feet, radius, player)) {
    zap(ctx, center, t, 8 * mult);
    effect(t, "slowness", 40, 5);
    effect(t, "weakness", 40, 1);
    knockback(t, sub(t.location, feet), 0.9, 0.3);
  }
}

/** 3. Orbe de Plasma: esfera lenta que electrocuta lo que pasa cerca y estalla. */
function plasmaOrb(ctx) {
  const { player, dim, mult, level } = ctx;
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  sound(dim, "beacon.activate", eye, 1, 1.8);
  sound(dim, "random.fizz", eye, 0.7, 0.8);
  launchOrb({
    player,
    dim,
    start: add(eye, scale(dir, 1.2)),
    dir,
    speed: 0.5,
    maxDistance: 22,
    pierce: true,
    onTick: (pos, age) => {
      particle(dim, "magicpowers:plasma", pos);
      particle(dim, "magicpowers:spark", jitter(pos, 0.45));
      if (age % 6 === 0) {
        targetsInRadius(dim, pos, 4.5, player)
          .slice(0, 2 + (level >= 3 ? 1 : 0))
          .forEach((t) => zap(ctx, pos, t, 5 * mult));
      }
      if (age % 12 === 0) sound(dim, "beacon.ambient", pos, 0.8, 2);
    },
    onEntity: (t) => zap(ctx, bodyCenter(t), t, 5 * mult),
    onHit: (p) => {
      sound(dim, "ambient.weather.lightning.impact", p, 0.8, 1.4);
      sound(dim, "firework.large_blast", p, 1, 1);
      particle(dim, "magicpowers:spark_burst", p);
      particle(dim, "magicpowers:spark_burst", add(p, UP(0.5)));
      particle(dim, "minecraft:electric_spark_particle", p);
      for (const t of targetsInRadius(dim, p, 3.5, player)) {
        hurt(t, 12 * mult, ctx, EntityDamageCause.lightning);
        knockback(t, sub(t.location, p), 0.8, 0.35);
      }
    },
  });
}

/** 4. Tormenta: rayos del cielo sobre los enemigos cercanos. */
function thunderstorm(ctx) {
  const { player, dim, mult, level } = ctx;
  const feet = player.location;
  const targets = targetsInRadius(dim, feet, 14, player)
    .sort((a, b) => dist(a.location, feet) - dist(b.location, feet))
    .slice(0, 2 + level);
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
        hurt(target, 14 * mult, ctx, EntityDamageCause.lightning);
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
  sound(dim, "ambient.weather.lightning.impact", p, 1, 1, 0.1);
  particle(dim, "magicpowers:spark_burst", add(p, UP(0.3)));
  particle(dim, "minecraft:electric_spark_particle", p);
  addTask((age) => {
    for (let i = 1; i < pts.length; i++) particleLine(dim, "magicpowers:spark", pts[i - 1], pts[i], 0.3);
    return age >= 2;
  });
}

// ===========================================================================
// GRAVEDAD
// ===========================================================================

/** Proyectiles con entidad (piedras y rocas): id -> { pid, kind, level, type, dmg } */
export const projectileData = new Map();

function throwEntity(ctx, typeId, dir, speed, data) {
  const { player, dim } = ctx;
  const eye = player.getHeadLocation();
  try {
    const e = dim.spawnEntity(typeId, add(eye, scale(dir, 1.2)));
    const proj = e.getComponent("minecraft:projectile");
    if (proj) {
      proj.owner = player;
      proj.shoot(scale(dir, speed));
    }
    projectileData.set(e.id, { pid: player.id, kind: ctx.kind, level: ctx.level, ...data });
    return e;
  } catch {
    return undefined;
  }
}

/** 1. Lluvia de Piedras: lanza pequeñas piedras (5 desde nivel 3). */
function stoneVolley(ctx) {
  const { player, dim, mult, level } = ctx;
  const count = level >= 3 ? 5 : 3;
  for (let i = 0; i < count; i++) {
    addTask(() => {
      if (!player.isValid) return true;
      const dir = player.getViewDirection();
      const d = normalize(add(rotateY(dir, rand(-0.09, 0.09)), UP(rand(-0.03, 0.06))));
      const stone = throwEntity(ctx, "magicpowers:pebble", d, 1.9, { type: "pebble", dmg: 8 * mult });
      if (stone) {
        addTask((age) => {
          if (!stone.isValid || age > 30) return true;
          particle(dim, "magicpowers:gravity", stone.location);
          return false;
        });
      }
      sound(dim, "mob.irongolem.throw", player.getHeadLocation(), 0.7, 1.4 + i * 0.05);
      return true;
    }, i * 6); // separadas para que el enemigo no las bloquee con su invulnerabilidad tras un golpe
  }
}

/** 2. Atracción: atrae hacia ti a los enemigos que tienes delante. */
function attraction(ctx) {
  const { player, dim, mult } = ctx;
  const feet = player.location;
  const center = bodyCenter(player);
  sound(dim, "mob.endermen.portal", feet, 1, 0.6);
  sound(dim, "respawn_anchor.charge", feet, 0.7, 1.4);
  for (const t of targetsInCone(player, 14, 35)) {
    const to = sub(feet, t.location);
    const d = length({ x: to.x, y: 0, z: to.z });
    hurt(t, 5 * mult, ctx, EntityDamageCause.entityAttack);
    knockback(t, to, Math.min(2.4, 0.28 * d), 0.35);
    effect(t, "slowness", 30, 1);
    particleLine(dim, "magicpowers:gravity", bodyCenter(t), center, 0.6, 0.1);
  }
  particleRing(dim, "magicpowers:gravity", add(feet, UP(0.2)), 1.5, 14);
}

/** 3. Roca Colosal: lanza una roca enorme que aplasta al caer. */
function boulder(ctx) {
  const { player, dim, mult, level } = ctx;
  const dir = normalize(add(player.getViewDirection(), UP(0.08)));
  sound(dim, "mob.irongolem.throw", player.location, 1, 0.6);
  sound(dim, "mob.ravager.stun", player.location, 0.5, 1.3);
  const rock = throwEntity(ctx, "magicpowers:boulder", dir, 1.5, { type: "boulder", dmg: 14 * mult });
  if (rock) {
    addTask((age) => {
      if (!rock.isValid || age > 80) return true;
      particle(dim, "magicpowers:gravity", jitter(rock.location, 0.4));
      return false;
    });
  }
}

function boulderSmash(ctx, p, data) {
  const { player, dim } = ctx;
  const radius = 3.5 + (data.level >= 4 ? 1 : 0);
  sound(dim, "mace.heavy_smash_ground", p, 1.2, 0.8);
  sound(dim, "random.explode", p, 0.6, 0.6);
  sound(dim, "fall.stone", p, 1, 0.6);
  particle(dim, "magicpowers:gravity_burst", p);
  particle(dim, "minecraft:dust_plume", p);
  particleRing(dim, "magicpowers:gravity", add(p, UP(0.2)), radius * 0.6, 14);
  particleRing(dim, "magicpowers:gravity", add(p, UP(0.2)), radius, 22);
  for (const t of targetsInRadius(dim, p, radius + 1, player)) {
    const d = dist(bodyCenter(t), p);
    if (d > radius + 0.5) continue;
    hurt(t, data.dmg * (1 - Math.min(1, d / radius) * 0.35), ctx, EntityDamageCause.entityAttack);
    knockback(t, sub(t.location, p), 0.9, 0.6);
  }
}

/** 4. Colapso: eleva a los enemigos hacia un punto y los aplasta contra el suelo. */
function collapse(ctx) {
  const { player, dim, mult, level } = ctx;
  const center = groundAt(dim, lookPoint(player, 10));
  const radius = 6 + (level >= 4 ? 1 : 0);
  const targets = targetsInRadius(dim, center, radius + 1, player);
  const core = add(center, UP(3));
  sound(dim, "mob.evocation_illager.prepare_attack", center, 1, 0.6);
  sound(dim, "block.end_portal.spawn", center, 0.4, 1.6);
  addTask((age) => {
    if (age < 20) {
      particleRing(dim, "magicpowers:gravity", add(center, UP(0.2)), radius * (1 - age / 20), 16);
      particle(dim, "magicpowers:gravity", jitter(core, 0.4));
      particle(dim, "magicpowers:gravity", jitter(core, 0.4));
      if (age === 10) sound(dim, "respawn_anchor.charge", center, 1, 0.5);
      for (const t of targets) {
        if (!t.isValid) continue;
        const to = sub(center, t.location);
        const flatTo = { x: to.x, y: 0, z: to.z };
        const d = length(flatTo);
        const inward = d > 0.5 ? scale(normalize(flatTo), Math.min(0.1, 0.03 * d)) : UP(0);
        impulse(t, add(inward, UP(age < 14 ? 0.14 : 0.02)));
        if (age % 3 === 0) particle(dim, "magicpowers:gravity", t.location);
      }
      return false;
    }
    // ¡Aplastamiento!
    sound(dim, "mace.heavy_smash_ground", center, 1.2, 0.8);
    sound(dim, "random.explode", center, 0.6, 0.6);
    particle(dim, "magicpowers:gravity_burst", center);
    particle(dim, "minecraft:dust_plume", center);
    particleRing(dim, "magicpowers:gravity", add(center, UP(0.2)), 2, 14);
    particleRing(dim, "magicpowers:gravity", add(center, UP(0.2)), 4, 24);
    for (const t of targets) {
      if (!t.isValid) continue;
      try {
        t.clearVelocity();
      } catch {
        // Ignorado
      }
      impulse(t, UP(-3));
      hurt(t, 14 * mult, ctx, EntityDamageCause.entityAttack);
    }
    return true;
  });
}

/** Impacto de piedras y rocas (llamado desde los eventos de proyectiles). */
export function onProjectileImpact(projectile, dim, location, target) {
  let data;
  try {
    data = projectileData.get(projectile.id);
  } catch {
    return;
  }
  if (!data) return;
  projectileData.delete(projectile.id);
  const player = world.getEntity(data.pid);
  if (!player?.isValid) return;
  const ctx = { player, dim, kind: data.kind, level: data.level };
  if (data.type === "boulder") {
    boulderSmash(ctx, location, data);
    return;
  }
  particle(dim, "magicpowers:gravity_burst", location);
  sound(dim, target ? "hit.stone" : "dig.stone", location, 0.8, 1.3, 0.1);
  if (target && isTarget(target, player)) {
    hurt(target, data.dmg, ctx, EntityDamageCause.projectile);
    knockback(target, sub(target.location, player.location), 0.5, 0.25);
  } else if (!target) {
    particle(dim, "minecraft:dust_plume", location);
  }
}

export const ABILITIES = {
  fire: [flameBurst, meteor, eruption, meteorRain],
  ice: [iceShard, iceSpikes, deepFreeze, blizzard],
  wind: [gust, windLeap, windBlades, tornado],
  lightning: [chainLightning, staticPulse, plasmaOrb, thunderstorm],
  gravity: [stoneVolley, attraction, boulder, collapse],
};

/** Limpieza periódica de proyectiles que ya no existen. */
system.runInterval(() => {
  for (const id of projectileData.keys()) {
    let alive = false;
    try {
      alive = !!world.getEntity(id)?.isValid;
    } catch {
      // Ignorado
    }
    if (!alive) projectileData.delete(id);
  }
}, 200);
