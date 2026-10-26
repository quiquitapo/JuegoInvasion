import { EquipmentSlot } from "@minecraft/server";
import { ARCANE, ELEMENTS, ITEM_TO_ELEMENT, LEVEL_XP, MAX_LEVEL, SLOTS, levelFromXp, unlockedSlots } from "./config.js";

// Datos guardados en el propio libro (cada libro sube de nivel por separado y
// conserva su progreso aunque se guarde en un cofre o se le dé a otro jugador).
const P_XP = "magicpowers:xp";
const P_SEL = "magicpowers:sel";
const P_INIT = "magicpowers:init";
const P_SPELLS = "magicpowers:spells"; // Libro Mágico Vacío: "fire:0,ice:1,..."

export function mainhandSlot(player) {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand);
  } catch {
    return undefined;
  }
}

/** Tipo de libro del slot: un elemento ("fire"…), "arcane" o undefined. */
export function bookKind(slot) {
  try {
    if (!slot?.hasItem()) return undefined;
    if (slot.typeId === ARCANE.item) return "arcane";
    return ITEM_TO_ELEMENT[slot.typeId];
  } catch {
    return undefined;
  }
}

function parseSpells(raw) {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split(",")
    .map((s) => {
      const [el, idx] = s.split(":");
      return { el, idx: Number(idx) };
    })
    .filter((s) => ELEMENTS[s.el] && s.idx >= 0 && s.idx < SLOTS)
    .slice(0, SLOTS);
}

/**
 * Lee el libro. spells es la lista de hechizos del libro en orden; unlocked
 * cuántos de ellos se pueden usar ya.
 */
export function readBook(slot, kind) {
  const xp = Number(slot.getDynamicProperty(P_XP) ?? 0);
  const level = levelFromXp(xp);
  let spells;
  let unlocked;
  if (kind === "arcane") {
    spells = parseSpells(slot.getDynamicProperty(P_SPELLS));
    unlocked = spells.length;
  } else {
    spells = ELEMENTS[kind].abilities.map((_, idx) => ({ el: kind, idx }));
    unlocked = unlockedSlots(level);
  }
  let sel = Number(slot.getDynamicProperty(P_SEL) ?? 0);
  if (sel >= unlocked) sel = 0;
  return { kind, xp, level, sel, spells, unlocked, init: slot.getDynamicProperty(P_INIT) === true };
}

export function initBook(slot, kind) {
  slot.setDynamicProperty(P_INIT, true);
  writeLore(slot, readBook(slot, kind));
}

export function setSelected(slot, kind, sel) {
  slot.setDynamicProperty(P_SEL, sel);
  writeLore(slot, readBook(slot, kind));
}

/** Escribe un hechizo nuevo al final del Libro Mágico Vacío. */
export function addSpell(slot, el, idx) {
  const spells = parseSpells(slot.getDynamicProperty(P_SPELLS));
  if (spells.length >= SLOTS) return false;
  spells.push({ el, idx });
  slot.setDynamicProperty(P_SPELLS, spells.map((s) => `${s.el}:${s.idx}`).join(","));
  slot.setDynamicProperty(P_INIT, true);
  writeLore(slot, readBook(slot, "arcane"));
  return true;
}

/** Borra el último hechizo escrito. */
export function removeLastSpell(slot) {
  const spells = parseSpells(slot.getDynamicProperty(P_SPELLS));
  const removed = spells.pop();
  slot.setDynamicProperty(P_SPELLS, spells.map((s) => `${s.el}:${s.idx}`).join(","));
  slot.setDynamicProperty(P_SEL, 0);
  writeLore(slot, readBook(slot, "arcane"));
  return removed;
}

/** Suma XP al libro. Devuelve { before, after } con los niveles. */
export function addXp(slot, kind, amount) {
  const data = readBook(slot, kind);
  const xp = Math.min(data.xp + amount, LEVEL_XP[MAX_LEVEL - 1]);
  slot.setDynamicProperty(P_XP, xp);
  slot.setDynamicProperty(P_INIT, true);
  const after = readBook(slot, kind);
  writeLore(slot, after);
  return { before: data.level, after: after.level };
}

/** Progreso hasta el siguiente nivel. */
export function xpProgress(data) {
  if (data.level >= MAX_LEVEL) return { cur: 1, max: 1, text: "§6MAX" };
  const prev = LEVEL_XP[data.level - 1];
  const next = LEVEL_XP[data.level];
  return { cur: data.xp - prev, max: next - prev, text: `§a${data.xp}§8/§a${next}` };
}

export function spellName(spell) {
  return ELEMENTS[spell.el].abilities[spell.idx].name;
}

export function writeLore(slot, data) {
  const lines = [
    `§r§7Nivel §e${data.level}${data.level >= MAX_LEVEL ? " §6(MÁX)" : ` §8(${xpProgress(data).text} XP§8)`}`,
  ];
  if (data.kind === "arcane") {
    for (let i = 0; i < SLOTS; i++) {
      const s = data.spells[i];
      if (!s) lines.push(`§r§8${i + 1}. — vacío —`);
      else lines.push(`§r${i === data.sel ? "§6» " : "§8· "}${ELEMENTS[s.el].color}${spellName(s)}`);
    }
    lines.push("§r§8Usar: escribir hechizos con XP");
  } else {
    data.spells.forEach((s, i) => {
      if (i >= data.unlocked) lines.push(`§r§8· ${spellName(s)} §7(Nivel ${i + 1})`);
      else lines.push(`§r${i === data.sel ? "§6» " : "§8· "}§f${spellName(s)}`);
    });
  }
  lines.push("§r§8Mantén agachado: lanzar", "§r§8Toca agachar: cambiar habilidad");
  try {
    slot.setLore(lines);
  } catch {
    // Ignorado
  }
}

/** Busca un libro del tipo indicado: primero en la mano, luego en el inventario. */
export function findBookSlot(player, kind) {
  const hand = mainhandSlot(player);
  if (hand && bookKind(hand) === kind) return hand;
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return undefined;
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.getSlot(i);
      if (bookKind(slot) === kind) return slot;
    }
  } catch {
    // Ignorado
  }
  return undefined;
}
