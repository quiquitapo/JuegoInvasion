// ===========================================================================
//  MagicPowers By Quiquitapo
//  Libros mágicos de Fuego, Hielo, Viento, Electricidad y Gravedad, y un
//  Libro Mágico Vacío en el que escribes tus propios hechizos.
//
//  Controles (con un libro en la mano):
//   - Mantener agachado   -> lanza la habilidad seleccionada.
//   - Tocar agachar       -> pasa a la siguiente habilidad desbloqueada.
//   - Usar / clic derecho -> lanza la habilidad (en el Libro Mágico Vacío abre su menú).
// ===========================================================================
import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  system,
  world,
} from "@minecraft/server";
import { ABILITIES, onProjectileImpact } from "./abilities.js";
import { addXp, bookKind, findBookSlot, initBook, mainhandSlot, readBook, setSelected, spellName } from "./books.js";
import {
  ARCANE,
  BOSS_XP,
  DEFAULT_CORNER,
  ELEMENTS,
  HOLD_TICKS,
  HUD_CORNERS,
  MAX_LEVEL,
  MONSTER_XP,
  SLOTS,
  TAP_TICKS,
  cooldownMult,
  damageMult,
} from "./config.js";
import { HUD_EMPTY, buildHud, cooldownKey } from "./hud.js";
import { openSpellbook } from "./spellbook.js";
import { bodyCenter, lastHit, particle, particleRing, playerById, runTasks, sound } from "./util.js";

const P_CORNER = "magicpowers:hud";
const P_TIP = "magicpowers:tip";
const KILL_CREDIT_TICKS = 200; // 10 s para atribuir muertes por quemadura, caída, etc.
const HUD_REFRESH_TICKS = 100; // reenvío de seguridad (solo si no ha cambiado nada)

const CHARGE_PARTICLE = {
  fire: "magicpowers:flame",
  ice: "magicpowers:frost",
  wind: "magicpowers:wind",
  lightning: "magicpowers:spark",
  gravity: "magicpowers:gravity",
};

/** Estado por jugador (solo en memoria). */
const states = new Map();

function state(player) {
  let st = states.get(player.id);
  if (!st) {
    st = { sneakStart: -1, castThisHold: false, cd: {}, lastHud: "", lastHudTick: 0, kind: undefined };
    states.set(player.id, st);
  }
  return st;
}

function hudCorner(player) {
  const c = player.getDynamicProperty(P_CORNER);
  return typeof c === "string" ? c : DEFAULT_CORNER;
}

/** Envía el HUD solo si su texto ha cambiado: así no parpadea. */
function sendHud(player, st, text) {
  const now = system.currentTick;
  if (text === st.lastHud && now - st.lastHudTick < HUD_REFRESH_TICKS) return;
  st.lastHud = text;
  st.lastHudTick = now;
  try {
    player.onScreenDisplay.setTitle(text, { fadeInDuration: 0, stayDuration: 200, fadeOutDuration: 0 });
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
    "§7• §fToca §eagachar§f rápido para pasar a la siguiente habilidad.",
    "§7• §fUsar el libro (clic derecho) también la lanza.",
    `§7• §fMata enemigos para subir el libro de nivel: cada nivel desbloquea una habilidad §8(máx. Nv.${MAX_LEVEL})§f.`,
    "§7• §dLibro Mágico Vacío§f: úsalo para escribir hasta 4 hechizos pagando niveles de experiencia.",
    "§7• §e/magicpowers:hud §fcambia la esquina del panel de habilidades.",
  ].forEach((line) => player.sendMessage(line));
}

// ---------------------------------------------------------------------------
// Lanzar y cambiar habilidades
// ---------------------------------------------------------------------------
function cast(player, book, st, silent) {
  const spell = book.spells[book.sel];
  if (!spell || book.sel >= book.unlocked) {
    if (!silent && book.kind === "arcane") actionbar(player, "§7Este libro está vacío. §dÚsalo para escribir hechizos.");
    return false;
  }
  const ability = ELEMENTS[spell.el].abilities[spell.idx];
  const now = system.currentTick;
  const key = cooldownKey(spell);
  const remaining = (st.cd[key] ?? 0) - now;
  if (remaining > 0) {
    if (!silent) {
      actionbar(player, `§c${ability.name} §7se recarga en §c${Math.ceil(remaining / 20)}s`);
      sound(player.dimension, "note.hat", player.location, 0.5, 0.6);
    }
    return false;
  }
  ABILITIES[spell.el][spell.idx]({
    player,
    dim: player.dimension,
    level: book.level,
    mult: damageMult(book.level),
    kind: book.kind,
  });
  const cd = Math.max(10, Math.round(ability.cooldown * cooldownMult(book.level)));
  st.cd[key] = now + cd;
  try {
    player.startItemCooldown(`magicpowers_${book.kind}`, cd);
  } catch {
    // Ignorado
  }
  return true;
}

function switchAbility(player, slot, book, st) {
  if (book.unlocked <= 1) {
    if (book.kind === "arcane") {
      actionbar(player, book.unlocked ? "§7Escribe más hechizos para poder cambiar." : "§7Este libro está vacío. §dÚsalo para escribir hechizos.");
    } else {
      actionbar(player, `§7La siguiente habilidad §8(${spellName(book.spells[1])}) §7se desbloquea en §eNivel 2`);
    }
    sound(player.dimension, "note.bass", player.location, 0.6, 0.8);
    return;
  }
  const sel = (book.sel + 1) % book.unlocked;
  setSelected(slot, book.kind, sel);
  const spell = book.spells[sel];
  const def = ELEMENTS[spell.el];
  actionbar(player, `${def.color}${spellName(spell)}`);
  sound(player.dimension, "item.book.page_turn", player.location, 1, 1.1 + sel * 0.1);
  // Sincroniza el sombreado de enfriamiento del objeto con la habilidad elegida.
  const rem = (st.cd[cooldownKey(spell)] ?? 0) - system.currentTick;
  try {
    player.startItemCooldown(`magicpowers_${book.kind}`, Math.max(1, rem));
  } catch {
    // Ignorado
  }
}

/** Efecto de carga mientras se mantiene agachado. */
function chargeFeedback(player, book, held) {
  const spell = book.spells[book.sel];
  if (!spell || book.sel >= book.unlocked) return;
  const dim = player.dimension;
  if (held % 3 === 0) sound(dim, "note.chime", player.location, 0.35, 0.8 + held * 0.08);
  particleRing(dim, CHARGE_PARTICLE[spell.el], { ...player.location, y: player.location.y + 0.15 }, 0.6 + held * 0.03, 4);
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
function updatePlayer(player, now) {
  const st = state(player);
  const slot = mainhandSlot(player);
  const kind = bookKind(slot);

  if (!kind) {
    if (st.kind) sendHud(player, st, HUD_EMPTY);
    st.kind = undefined;
    st.sneakStart = -1;
    return;
  }

  let book = readBook(slot, kind);
  if (!book.init) initBook(slot, kind);
  if (!st.kind && player.getDynamicProperty(P_TIP) !== true) {
    player.setDynamicProperty(P_TIP, true);
    sendGuide(player);
  }
  st.kind = kind;

  // Agacharse: toque corto = cambiar, mantener = lanzar.
  if (player.isSneaking) {
    if (st.sneakStart < 0) {
      st.sneakStart = now;
      st.castThisHold = false;
    }
    const held = now - st.sneakStart;
    if (held >= HOLD_TICKS) {
      if (cast(player, book, st, true)) st.castThisHold = true;
    } else if (held > TAP_TICKS / 2 && !st.castThisHold) {
      chargeFeedback(player, book, held);
    }
  } else if (st.sneakStart >= 0) {
    const held = now - st.sneakStart;
    st.sneakStart = -1;
    if (held <= TAP_TICKS && !st.castThisHold) {
      switchAbility(player, slot, book, st);
      book = readBook(slot, kind);
    }
  }

  sendHud(player, st, buildHud(book, st.cd, now, hudCorner(player)));
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
  if (now % 100 === 0) {
    for (const [id, hit] of lastHit) if (now - hit.tick > KILL_CREDIT_TICKS) lastHit.delete(id);
  }
}, 1);

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
  const slot = mainhandSlot(player);
  const kind = bookKind(slot);
  if (!kind || slot.typeId !== itemStack.typeId) return;
  if (kind === "arcane" && !player.isSneaking) {
    system.run(() => openSpellbook(player));
    return;
  }
  const st = state(player);
  if (cast(player, readBook(slot, kind), st, false)) st.castThisHold = true;
});

function resetHud({ player }) {
  const st = state(player);
  st.lastHud = "";
}
world.afterEvents.playerSpawn.subscribe(resetHud);
world.afterEvents.playerDimensionChange.subscribe(resetHud);
world.afterEvents.playerLeave.subscribe(({ playerId }) => states.delete(playerId));

world.afterEvents.projectileHitEntity.subscribe((ev) => {
  onProjectileImpact(ev.projectile, ev.dimension, ev.location, ev.getEntityHit()?.entity);
});
world.afterEvents.projectileHitBlock.subscribe((ev) => {
  onProjectileImpact(ev.projectile, ev.dimension, ev.location, undefined);
});

// ---------------------------------------------------------------------------
// Experiencia de los libros
// ---------------------------------------------------------------------------
function xpForKill(entity, typeId) {
  if (BOSS_XP[typeId]) return BOSS_XP[typeId];
  try {
    if (entity.getComponent("minecraft:type_family")?.hasTypeFamily("monster")) return MONSTER_XP;
  } catch {
    // Ignorado
  }
  return 0;
}

function grantXp(player, kind, amount) {
  const slot = kind ? findBookSlot(player, kind) : mainhandSlot(player);
  const bookType = bookKind(slot);
  if (!bookType) return;
  const { before, after } = addXp(slot, bookType, amount);
  const st = states.get(player.id);
  if (after <= before) {
    if (st) sound(player.dimension, "random.orb", player.location, 0.4, 1.4);
    return;
  }
  const head = bookType === "arcane" ? ARCANE : ELEMENTS[bookType];
  const title = bookType === "arcane" ? "Libro Mágico" : `Libro de ${head.name}`;
  const center = bodyCenter(player);
  particle(player.dimension, "magicpowers:levelup", center);
  particle(player.dimension, "minecraft:totem_particle", center);
  sound(player.dimension, "random.levelup", player.location, 1, 1);
  player.sendMessage(`§6✦ §e¡Tu ${head.color}${title} §esubió a §6Nivel ${after}§e!`);
  if (bookType !== "arcane" && after <= SLOTS) {
    player.sendMessage(`§a✦ Nueva habilidad: §f${ELEMENTS[bookType].abilities[after - 1].name} §7— toca agachar para cambiar.`);
  }
  if (after >= MAX_LEVEL) player.sendMessage("§6✦ ¡Nivel máximo alcanzado! Tus hechizos hacen el máximo daño.");
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
    grantXp(killer, recent && recent.pid === killer.id ? recent.book : undefined, amount);
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
