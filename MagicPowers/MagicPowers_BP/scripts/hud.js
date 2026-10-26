import { ELEMENTS, UNLOCK_LEVEL } from "./config.js";
import { xpProgress } from "./books.js";

// El texto viaja como "title" con el prefijo 'mpw:'. El Resource Pack lo oculta
// del centro de la pantalla y lo dibuja en la esquina elegida (ui/hud_screen.json).
export const HUD_PREFIX = "mpw:";
export const HUD_EMPTY = HUD_PREFIX;

function bar(fraction, size, on, off) {
  const n = Math.max(0, Math.min(size, Math.round(fraction * size)));
  return `${on}${"■".repeat(n)}${off}${"■".repeat(size - n)}`;
}

/**
 * @param {string} el elemento del libro
 * @param {{level:number, xp:number, sel:number}} book datos del libro
 * @param {Record<string, number>} cooldowns tick en el que cada habilidad vuelve a estar lista
 * @param {number} now tick actual
 * @param {string} corner token de esquina (^TL, ^TR, ^BL, ^BR o "")
 * @param {number | undefined} charge progreso de carga 0..1 mientras se mantiene agachado
 */
export function buildHud(el, book, cooldowns, now, corner, charge) {
  const def = ELEMENTS[el];
  const lines = [`§l${def.color}${def.name}§r §7Nv.§e${book.level}`];
  if (charge !== undefined) {
    lines.push(`${bar(charge, 10, "§b", "§8")} §bCargando`);
  } else {
    const pr = xpProgress(book);
    lines.push(`${bar(pr.cur / pr.max, 10, "§a", "§8")} ${pr.text}`);
  }
  def.abilities.forEach((ab, idx) => {
    if (idx === 1 && book.level < UNLOCK_LEVEL) {
      lines.push(`§8· ${ab.name} §7[Nv.${UNLOCK_LEVEL}]`);
      return;
    }
    const mark = idx === book.sel ? "§e» §f" : "§8· §7";
    const rem = (cooldowns[el + idx] ?? 0) - now;
    const status = rem > 0 ? `§c${(rem / 20).toFixed(1)}s` : "§a✔";
    lines.push(`${mark}${ab.name} ${status}`);
  });
  return `${HUD_PREFIX}${corner}${def.hud}${lines.join("\n")}`;
}
