// ===========================================================================
//  MagicPowers By Quiquitapo
//  Libros mágicos de Fuego, Hielo, Viento, Electricidad y Gravedad.
//
//  Controles (con un libro en la mano):
//   - Mantener agachado  -> lanza la habilidad seleccionada.
//   - Tocar agachar      -> cambia entre la habilidad 1 y la 2 (desde nivel 2).
//   - Usar / clic derecho -> también lanza la habilidad seleccionada.
// ===========================================================================
import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  EntityDamageCause,
  system,
  world,
} from "@minecraft/server";
import { ABILITIES, pebbleData } from "./abilities.js";
import { addXp, findBookSlot, initBook, mainhandSlot, readBook, setSelected, slotElement } from "./books.js";
import {
  BOSS_XP,
  DEFAULT_CORNER,
  ELEMENTS,
  HOLD_TICKS,
  HUD_CORNERS,
  MAX_LEVEL,
  TAP_TICKS,
  UNLOCK_LEVEL,
  cooldownMult,
  damageMult,
} from "./config.js";
import { HUD_EMPTY, buildHud } from "./hud.js";
import { bodyCenter, hurt, isTarget, knockback, lastHit, particle, playerById, runTasks, sound, sub } from "./util.js";

const P_CORNER = "magicpowers:hud";
const P_TIP = "magicpowers:tip";
const KILL_CREDIT_TICKS = 200; // 10 s para atribuir muertes por quemadura, caída, etc.

/** Estado por jugador (solo en memoria). */
const states = new Map();

function state(player) {
  let st = states.get(player.id);
  if (!st) {
    st = { sneakStart: -1, castThisHold: false, cd: {}, lastHud: "", lastHudTick: 0, wasHolding: false, lastEl: undefined, dirty: true, charging: false };
    states.set(player.id, st);
  }
  return st;
}

function hudCorner(player) {
  const c = player.getDynamicProperty(P_CORNER);
  return typeof c === "string" ? c : DEFAULT_CORNER;
}

function sendHud(player, st, text, force = false) {
  const now = system.currentTick;
  if (!force && text === st.lastHud && now - st.lastHudTick < 40) return;
  st.lastHud = text;
  st.lastHudTick = now;
  try {
    player.onScreenDisplay.setTitle(text, { fadeInDuration: 0, stayDuration: 100, fadeOutDuration: 0 });
  } catch {
    // Ignorado
  }
}

function actionbar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
    // Ignorado
  }
}

function sendGuide(player) {
  [
    "§5§l✦ Magic§6Powers §r§7By Quiquitapo",
    "§7• §fMantén §eagachado§f para lanzar la habilidad del libro.",
    "§7• §fToca §eagachar§f rápido para cambiar de habilidad.",
    "§7• §fUsar el libro (clic derecho) también la lanza.",
    `§7• §fMata enemigos para subir el libro de nivel §8(Nv.${UNLOCK_LEVEL} = 2ª habilidad, máx. Nv.${MAX_LEVEL})§f.`,
    "§7• §e/magicpowers:hud §fcambia la esquina del panel de habilidades.",
  ].forEach((line) => player.sendMessage(line));
}

// ---------------------------------------------------------------------------
// Lanzar y cambiar habilidades
// ---------------------------------------------------------------------------
function cast(player, el, book, st, silent) {
  const def = ELEMENTS[el];
  const idx = book.sel;
  const ability = def.abilities[idx];
  const now = system.currentTick;
  const remaining = (st.cd[el + idx] ?? 0) - now;
  if (remaining > 0) {
    if (!silent) actionbar(player, `§c${ability.name} §7se recarga en §c${(remaining / 20).toFixed(1)}s`);
    return false;
  }
  ABILITIES[el][idx]({ player, dim: player.dimension, level: book.level, mult: damageMult(book.level) });
  const cd = Math.max(10, Math.round(ability.cooldown * cooldownMult(book.level)));
  st.cd[el + idx] = now + cd;
  try {
    player.startItemCooldown(`magicpowers_${el}`, cd);
  } catch {
    // Ignorado
  }
  st.dirty = true;
  return true;
}

function switchAbility(player, el, slot, book, st) {
  const def = ELEMENTS[el];
  if (book.level < UNLOCK_LEVEL) {
    actionbar(player, `§7La 2ª habilidad §8(${def.abilities[1].name}) §7se desbloquea en §eNivel ${UNLOCK_LEVEL}`);
    sound(player.dimension, "note.bass", player.location, 0.6, 0.8);
    return;
  }
  const sel = book.sel === 0 ? 1 : 0;
  setSelected(slot, el, sel);
  st.dirty = true;
  actionbar(player, `${def.color}${def.name}§7: §f${def.abilities[sel].name}`);
  sound(player.dimension, "item.book.page_turn", player.location, 1, 1.2);
  // Sincroniza el sombreado de enfriamiento del objeto con la habilidad elegida.
  const rem = (st.cd[el + sel] ?? 0) - system.currentTick;
  try {
    player.startItemCooldown(`magicpowers_${el}`, Math.max(1, rem));
  } catch {
    // Ignorado
  }
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
function updatePlayer(player, now) {
  const st = state(player);
  const slot = mainhandSlot(player);
  const el = slotElement(slot);

  if (!el) {
    if (st.wasHolding) sendHud(player, st, HUD_EMPTY, true);
    st.wasHolding = false;
    st.lastEl = undefined;
    st.sneakStart = -1;
    return;
  }

  let book = readBook(slot);
  if (!book.init) initBook(slot, el);
  if (!st.wasHolding && player.getDynamicProperty(P_TIP) !== true) {
    player.setDynamicProperty(P_TIP, true);
    sendGuide(player);
  }
  st.wasHolding = true;
  if (st.lastEl !== el) {
    st.lastEl = el;
    st.dirty = true;
  }

  // Agacharse: toque corto = cambiar, mantener = lanzar.
  let charge;
  if (player.isSneaking) {
    if (st.sneakStart < 0) {
      st.sneakStart = now;
      st.castThisHold = false;
    }
    const held = now - st.sneakStart;
    if (held >= HOLD_TICKS) {
      if (cast(player, el, book, st, true)) st.castThisHold = true;
    } else if (held > 2) {
      charge = held / HOLD_TICKS;
    }
  } else if (st.sneakStart >= 0) {
    const held = now - st.sneakStart;
    st.sneakStart = -1;
    if (held <= TAP_TICKS && !st.castThisHold) {
      switchAbility(player, el, slot, book, st);
      book = readBook(slot);
    }
  }

  const charging = charge !== undefined;
  if (st.dirty || charging || st.charging || now % 5 === 0 || st.lastHud === HUD_EMPTY || st.lastHud === "") {
    st.dirty = false;
    sendHud(player, st, buildHud(el, book, st.cd, now, hudCorner(player), charge));
  }
  st.charging = charging;
}

system.runInterval(() => {
  const now = system.currentTick;
  runTasks();
  for (const player of world.getAllPlayers()) {
    try {
      updatePlayer(player, now);
    } catch {
      // Un error con un jugador no debe detener al resto.
    }
  }
  // Limpia golpes antiguos
  if (now % 100 === 0) {
    for (const [id, hit] of lastHit) if (now - hit.tick > KILL_CREDIT_TICKS) lastHit.delete(id);
  }
}, 1);

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
  const slot = mainhandSlot(player);
  const el = slotElement(slot);
  if (!el || slot.typeId !== itemStack.typeId) return;
  const st = state(player);
  if (cast(player, el, readBook(slot), st, false)) st.castThisHold = true;
});

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  const st = state(player);
  st.lastHud = "";
  st.wasHolding = false;
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => states.delete(playerId));

// Piedras de gravedad: el daño lo pone el script para que escale con el nivel.
world.afterEvents.projectileHitEntity.subscribe((ev) => {
  const proj = ev.projectile;
  let data;
  try {
    if (proj.typeId !== "magicpowers:pebble") return;
    data = pebbleData.get(proj.id);
    pebbleData.delete(proj.id);
  } catch {
    return;
  }
  const target = ev.getEntityHit()?.entity;
  const player = data ? playerById(data.pid) : undefined;
  particle(ev.dimension, "magicpowers:gravity_burst", ev.location);
  sound(ev.dimension, "dig.stone", ev.location, 0.8, 1.3);
  if (!target || !player || !isTarget(target, player)) return;
  hurt(target, data.dmg, player, "gravity", EntityDamageCause.projectile);
  knockback(target, sub(target.location, player.location), 0.5, 0.25);
});

world.afterEvents.projectileHitBlock.subscribe((ev) => {
  try {
    if (ev.projectile.typeId !== "magicpowers:pebble") return;
    pebbleData.delete(ev.projectile.id);
  } catch {
    return;
  }
  particle(ev.dimension, "minecraft:dust_plume", ev.location);
  sound(ev.dimension, "dig.stone", ev.location, 0.6, 1.4);
});

// ---------------------------------------------------------------------------
// Experiencia de los libros
// ---------------------------------------------------------------------------
function xpForKill(entity, typeId) {
  if (BOSS_XP[typeId]) return BOSS_XP[typeId];
  try {
    if (entity.getComponent("minecraft:type_family")?.hasTypeFamily("monster")) return 1;
  } catch {
    // Ignorado
  }
  return 0;
}

function grantXp(player, el, amount) {
  const slot = el ? findBookSlot(player, el) : mainhandSlot(player);
  const bookEl = slotElement(slot);
  if (!bookEl) return;
  const { before, after } = addXp(slot, bookEl, amount);
  if (after <= before) return;
  const def = ELEMENTS[bookEl];
  const center = bodyCenter(player);
  particle(player.dimension, "magicpowers:levelup", center);
  particle(player.dimension, "minecraft:totem_particle", center);
  sound(player.dimension, "random.levelup", player.location, 1, 1);
  player.sendMessage(`§6✦ §e¡Tu ${def.color}Libro de ${def.name} §esubió a §6Nivel ${after}§e!`);
  if (before < UNLOCK_LEVEL && after >= UNLOCK_LEVEL) {
    player.sendMessage(`§a✦ Nueva habilidad: §f${def.abilities[1].name} §7— toca agachar para cambiar.`);
  }
  if (after >= MAX_LEVEL) player.sendMessage("§6✦ ¡Nivel máximo alcanzado!");
}

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    const id = deadEntity.id;
    const typeId = deadEntity.typeId;
    const hit = lastHit.get(id);
    lastHit.delete(id);
    const recent = hit && system.currentTick - hit.tick <= KILL_CREDIT_TICKS ? hit : undefined;

    let killer = damageSource.damagingEntity;
    if (killer?.typeId !== "minecraft:player") killer = recent ? playerById(recent.pid) : undefined;
    if (!killer?.isValid || killer.typeId !== "minecraft:player" || killer.id === id) return;

    const amount = xpForKill(deadEntity, typeId);
    if (amount <= 0) return;
    grantXp(killer, recent && recent.pid === killer.id ? recent.el : undefined, amount);
    const st = states.get(killer.id);
    if (st) st.dirty = true;
  } catch {
    // Ignorado
  }
});

// ---------------------------------------------------------------------------
// Comandos: /magicpowers:hud <esquina>  y  /magicpowers:guia
// ---------------------------------------------------------------------------
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  customCommandRegistry.registerEnum("magicpowers:esquina", Object.keys(HUD_CORNERS));
  customCommandRegistry.registerCommand(
    {
      name: "magicpowers:hud",
      description: "Elige la esquina donde se muestran las habilidades de MagicPowers",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [{ name: "magicpowers:esquina", type: CustomCommandParamType.Enum }],
    },
    (origin, corner) => {
      const player = origin.sourceEntity;
      if (player?.typeId !== "minecraft:player") {
        return { status: CustomCommandStatus.Failure, message: "Solo un jugador puede usar este comando." };
      }
      system.run(() => {
        player.setDynamicProperty(P_CORNER, HUD_CORNERS[corner]);
        state(player).lastHud = "";
      });
      return { status: CustomCommandStatus.Success, message: `§aPanel de MagicPowers: §f${corner.replace("_", " ")}` };
    },
  );
  customCommandRegistry.registerCommand(
    {
      name: "magicpowers:guia",
      description: "Muestra cómo usar los libros de MagicPowers",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    (origin) => {
      const player = origin.sourceEntity;
      if (player?.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };
      system.run(() => sendGuide(player));
      return { status: CustomCommandStatus.Success };
    },
  );
});
