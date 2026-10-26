import { EquipmentSlot } from "@minecraft/server";
import { ELEMENTS, ITEM_TO_ELEMENT, LEVEL_XP, MAX_LEVEL, UNLOCK_LEVEL, levelFromXp } from "./config.js";

// Datos guardados en el propio libro (cada libro sube de nivel por separado y
// conserva su progreso aunque se guarde en un cofre o se le dé a otro jugador).
const P_XP = "magicpowers:xp";
const P_SEL = "magicpowers:sel";
const P_INIT = "magicpowers:init";

export function mainhandSlot(player) {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand);
  } catch {
    return undefined;
  }
}

/** Elemento del libro que hay en el slot, o undefined si no es un libro mágico. */
export function slotElement(slot) {
  try {
    return slot?.hasItem() ? ITEM_TO_ELEMENT[slot.typeId] : undefined;
  } catch {
    return undefined;
  }
}

export function readBook(slot) {
  const xp = Number(slot.getDynamicProperty(P_XP) ?? 0);
  const level = levelFromXp(xp);
  let sel = Number(slot.getDynamicProperty(P_SEL) ?? 0);
  if (level < UNLOCK_LEVEL) sel = 0;
  return { xp, level, sel, init: slot.getDynamicProperty(P_INIT) === true };
}

export function initBook(slot, el) {
  slot.setDynamicProperty(P_INIT, true);
  writeLore(slot, el, readBook(slot));
}

export function setSelected(slot, el, sel) {
  slot.setDynamicProperty(P_SEL, sel);
  writeLore(slot, el, readBook(slot));
}

/** Suma XP al libro. Devuelve { before, after } con los niveles. */
export function addXp(slot, el, amount) {
  const data = readBook(slot);
  const xp = Math.min(data.xp + amount, LEVEL_XP[MAX_LEVEL - 1]);
  slot.setDynamicProperty(P_XP, xp);
  slot.setDynamicProperty(P_INIT, true);
  const after = readBook(slot);
  writeLore(slot, el, after);
  return { before: data.level, after: after.level };
}

/** Texto de progreso: "§a34§8/§a60" o "§6MAX". */
export function xpProgress(data) {
  if (data.level >= MAX_LEVEL) return { cur: 1, max: 1, text: "§6MAX" };
  const prev = LEVEL_XP[data.level - 1];
  const next = LEVEL_XP[data.level];
  return { cur: data.xp - prev, max: next - prev, text: `§a${data.xp}§8/§a${next}` };
}

export function writeLore(slot, el, data) {
  const def = ELEMENTS[el];
  const [a1, a2] = def.abilities;
  const sel = data.sel;
  const locked = data.level < UNLOCK_LEVEL;
  const lines = [
    `§r§7Nivel §e${data.level}${data.level >= MAX_LEVEL ? " §6(MÁX)" : ` §8(${xpProgress(data).text} XP§8)`}`,
    `§r${sel === 0 ? "§6» " : "§8· "}§f${a1.name}`,
    locked ? `§r§8· §8${a2.name} §7(Nivel ${UNLOCK_LEVEL})` : `§r${sel === 1 ? "§6» " : "§8· "}§f${a2.name}`,
    "§r§8Mantén agachado: lanzar",
    "§r§8Toca agachar: cambiar habilidad",
  ];
  try {
    slot.setLore(lines);
  } catch {
    // Ignorado
  }
}

/** Busca un libro del elemento indicado: primero en la mano, luego en el inventario. */
export function findBookSlot(player, el) {
  const hand = mainhandSlot(player);
  if (hand && slotElement(hand) === el) return hand;
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return undefined;
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.getSlot(i);
      if (slotElement(slot) === el) return slot;
    }
  } catch {
    // Ignorado
  }
  return undefined;
}
