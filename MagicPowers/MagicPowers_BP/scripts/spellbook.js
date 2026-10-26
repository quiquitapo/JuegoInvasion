import { GameMode } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { addSpell, bookKind, mainhandSlot, readBook, removeLastSpell, spellName } from "./books.js";
import { ELEMENTS, SLOTS } from "./config.js";
import { bodyCenter, particle, sound } from "./util.js";

// ---------------------------------------------------------------------------
// Libro Mágico Vacío: al usarlo se abre un menú para escribir, en orden, hasta
// 4 hechizos de los demás libros pagando niveles de experiencia del jugador.
// ---------------------------------------------------------------------------

const ARCANE_ICON = "textures/items/mp_book_arcane";
const open = new Set();

function isCreative(player) {
  try {
    return player.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
}

/** Slot de la mano solo si sigue teniendo el Libro Mágico Vacío. */
function arcaneSlot(player) {
  const slot = mainhandSlot(player);
  return bookKind(slot) === "arcane" ? slot : undefined;
}

function fail(player, text) {
  player.sendMessage(text);
  sound(player.dimension, "note.bass", player.location, 0.8, 0.7);
}

export async function openSpellbook(player) {
  if (open.has(player.id)) return;
  open.add(player.id);
  try {
    await mainMenu(player);
  } catch {
    // El jugador cerró el menú o estaba ocupado.
  } finally {
    open.delete(player.id);
  }
}

async function mainMenu(player) {
  const slot = arcaneSlot(player);
  if (!slot) return;
  const book = readBook(slot, "arcane");
  sound(player.dimension, "item.book.page_turn", player.location, 1, 1);

  const form = new ActionFormData()
    .title("§5§lLibro Mágico")
    .body(
      `§7Tienes §a${player.level} §7niveles de experiencia.\n` +
        `§7Escribe hasta §f${SLOTS} hechizos §7en orden. Cada uno cuesta niveles según su poder.\n` +
        "§7Mantén agachado para lanzar y toca agachar para cambiar de hechizo.",
    );
  const actions = [];
  for (let i = 0; i < SLOTS; i++) {
    const s = book.spells[i];
    if (s) {
      const def = ELEMENTS[s.el];
      form.button(`§l${i + 1}. ${spellName(s)}§r\n§8${def.name}`, def.icon);
      actions.push(() => spellInfo(player, s));
    } else if (i === book.spells.length) {
      form.button(`§2§l${i + 1}. Escribir hechizo§r\n§8Elige un libro`, ARCANE_ICON);
      actions.push(() => chooseElement(player));
    } else {
      form.button(`§8${i + 1}. — vacío —\n§8Escribe antes el ${i}`);
      actions.push(() => mainMenu(player));
    }
  }
  if (book.spells.length) {
    form.button("§4Borrar el último hechizo\n§8No devuelve la experiencia");
    actions.push(() => confirmRemove(player));
  }
  const res = await form.show(player);
  if (res.canceled || res.selection === undefined) return;
  await actions[res.selection]?.();
}

async function spellInfo(player, spell) {
  const def = ELEMENTS[spell.el];
  const ab = def.abilities[spell.idx];
  const res = await new MessageFormData()
    .title(`${def.color}${ab.name}`)
    .body(`§7Libro de ${def.name}\n\n§f${ab.desc}\n\n§7Enfriamiento: §f${(ab.cooldown / 20).toFixed(1)} s`)
    .button1("Volver")
    .button2("Cerrar")
    .show(player);
  if (!res.canceled && res.selection === 0) await mainMenu(player);
}

async function chooseElement(player) {
  const form = new ActionFormData().title("§5§lElige un libro").body("§7¿De qué libro quieres copiar un hechizo?");
  const keys = Object.keys(ELEMENTS);
  for (const el of keys) form.button(`${ELEMENTS[el].color}§lLibro de ${ELEMENTS[el].name}`, ELEMENTS[el].icon);
  form.button("§8Volver");
  const res = await form.show(player);
  if (res.canceled || res.selection === undefined) return;
  if (res.selection >= keys.length) return mainMenu(player);
  await chooseAbility(player, keys[res.selection]);
}

async function chooseAbility(player, el) {
  const slot = arcaneSlot(player);
  if (!slot) return;
  const book = readBook(slot, "arcane");
  const def = ELEMENTS[el];
  const creative = isCreative(player);
  const form = new ActionFormData()
    .title(`${def.color}§lLibro de ${def.name}`)
    .body(`§7Tienes §a${player.level} §7niveles.${creative ? " §d(Creativo: gratis)" : ""}`);
  def.abilities.forEach((ab, idx) => {
    const written = book.spells.some((s) => s.el === el && s.idx === idx);
    const affordable = creative || player.level >= ab.cost;
    const costText = written ? "§8ya escrito" : `${affordable ? "§2" : "§4"}${ab.cost} niveles`;
    form.button(`§l${ab.name}§r ${costText}\n§8${ab.desc}`, def.icon);
  });
  form.button("§8Volver");
  const res = await form.show(player);
  if (res.canceled || res.selection === undefined) return;
  if (res.selection >= def.abilities.length) return chooseElement(player);
  await inscribe(player, el, res.selection);
}

async function inscribe(player, el, idx) {
  const slot = arcaneSlot(player);
  if (!slot) return;
  const book = readBook(slot, "arcane");
  const ab = ELEMENTS[el].abilities[idx];
  if (book.spells.length >= SLOTS) return fail(player, "§cEl libro ya tiene 4 hechizos. Borra el último para escribir otro.");
  if (book.spells.some((s) => s.el === el && s.idx === idx)) return fail(player, `§c${ab.name} ya está escrito en este libro.`);
  const creative = isCreative(player);
  if (!creative && player.level < ab.cost) {
    return fail(player, `§cNecesitas §e${ab.cost} niveles §cpara escribir ${ab.name} (tienes ${player.level}).`);
  }
  if (!creative) player.addLevels(-ab.cost);
  addSpell(slot, el, idx);
  const dim = player.dimension;
  sound(dim, "block.enchanting_table.use", player.location, 1, 1);
  sound(dim, "random.levelup", player.location, 0.6, 1.4);
  particle(dim, "magicpowers:levelup", bodyCenter(player));
  player.sendMessage(`§5✦ §dHas escrito §f${ab.name} §den el hueco §f${book.spells.length + 1}§d.`);
  await mainMenu(player);
}

async function confirmRemove(player) {
  const slot = arcaneSlot(player);
  if (!slot) return;
  const book = readBook(slot, "arcane");
  const last = book.spells[book.spells.length - 1];
  if (!last) return;
  const res = await new MessageFormData()
    .title("§4Borrar hechizo")
    .body(`§7¿Borrar §f${spellName(last)}§7 del libro?\n§cNo se devuelven los niveles gastados.`)
    .button1("§4Borrar")
    .button2("Cancelar")
    .show(player);
  if (res.canceled || res.selection !== 0) return mainMenu(player);
  const current = arcaneSlot(player);
  if (!current) return;
  removeLastSpell(current);
  sound(player.dimension, "item.book.put", player.location, 1, 0.8);
  await mainMenu(player);
}
