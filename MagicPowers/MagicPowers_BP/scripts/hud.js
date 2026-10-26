import { ARCANE, ELEMENTS, SLOTS } from "./config.js";
import { spellName, xpProgress } from "./books.js";

// El texto viaja como "title" con el prefijo 'mpw:'. El Resource Pack lo oculta
// del centro de la pantalla y lo dibuja en la esquina elegida (ui/hud_screen.json).
// Para que el panel no parpadee, el texto solo cambia cuando cambia algo visible
// (los enfriamientos se muestran en segundos enteros).
export const HUD_PREFIX = "mpw:";
export const HUD_EMPTY = HUD_PREFIX;

function bar(fraction, size, on, off) {
  const n = Math.max(0, Math.min(size, Math.floor(fraction * size)));
  return `${on}${"■".repeat(n)}${off}${"■".repeat(size - n)}`;
}

export const cooldownKey = (spell) => spell.el + spell.idx;

/**
 * @param {ReturnType<typeof import("./books.js").readBook>} book datos del libro
 * @param {Record<string, number>} cooldowns tick en el que cada habilidad vuelve a estar lista
 * @param {number} now tick actual
 * @param {string} corner token de esquina (^TL, ^TR, ^BL, ^BR o "")
 */
export function buildHud(book, cooldowns, now, corner) {
  const arcane = book.kind === "arcane";
  const head = arcane ? ARCANE : ELEMENTS[book.kind];
  const pr = xpProgress(book);
  const lines = [`${head.color}${head.name} §7Nv.§e${book.level} ${bar(pr.cur / pr.max, 6, "§a", "§8")}`];
  for (let i = 0; i < SLOTS; i++) {
    const spell = book.spells[i];
    if (!spell) {
      lines.push("§8· — vacío —");
      continue;
    }
    const name = spellName(spell);
    if (i >= book.unlocked) {
      lines.push(`§8· ${name} [Nv.${i + 1}]`);
      continue;
    }
    const rem = (cooldowns[cooldownKey(spell)] ?? 0) - now;
    const status = rem > 0 ? `§c${Math.ceil(rem / 20)}s` : "§a✔";
    const color = arcane ? ELEMENTS[spell.el].color : "§f";
    lines.push(i === book.sel ? `§e» ${color}${name} ${status}` : `§8· §7${name} ${status}`);
  }
  return `${HUD_PREFIX}${corner}${head.hud}${lines.join("\n")}`;
}
