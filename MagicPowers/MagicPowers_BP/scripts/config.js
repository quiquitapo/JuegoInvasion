// ---------------------------------------------------------------------------
// MagicPowers By Quiquitapo - configuración de libros, habilidades y niveles
// ---------------------------------------------------------------------------

/** Ticks manteniendo agachado para lanzar la habilidad (20 ticks = 1 s). */
export const HOLD_TICKS = 10;
/** Un toque de agachar más corto que esto cambia de habilidad. */
export const TAP_TICKS = 6;

export const MAX_LEVEL = 5;
/** Habilidades por libro. La habilidad N se desbloquea en el nivel N. */
export const SLOTS = 4;
/** XP total necesaria para alcanzar cada nivel (índice = nivel - 1). Un monstruo da 2 XP. */
export const LEVEL_XP = [0, 4, 12, 24, 40];

export function levelFromXp(xp) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}

/** Número de habilidades desbloqueadas en un libro elemental. */
export const unlockedSlots = (level) => Math.min(SLOTS, level);
/** +20 % de daño por nivel. */
export const damageMult = (level) => 1 + 0.2 * (level - 1);
/** -6 % de enfriamiento por nivel. */
export const cooldownMult = (level) => 1 - 0.06 * (level - 1);

/**
 * cooldown en ticks (nivel 1). El daño de cada habilidad está en abilities.js.
 * hud: etiqueta que entiende el HUD (ui/hud_screen.json).
 * cost: niveles de experiencia del jugador para escribirla en el Libro Mágico Vacío.
 */
export const ELEMENTS = {
  fire: {
    item: "magicpowers:book_fire",
    name: "Fuego",
    color: "§c",
    hud: "@fire",
    icon: "textures/items/mp_book_fire",
    abilities: [
      { name: "Llamarada", cooldown: 50, cost: 3, desc: "Cono de fuego que quema todo lo que tienes delante." },
      { name: "Meteoro Ígneo", cooldown: 140, cost: 6, desc: "Bola de fuego que estalla al impactar. No rompe bloques." },
      { name: "Erupción", cooldown: 200, cost: 10, desc: "Anillo de fuego a tu alrededor que lanza a los enemigos por los aires." },
      { name: "Lluvia de Meteoros", cooldown: 320, cost: 15, desc: "Meteoros caen del cielo sobre la zona a la que miras." },
    ],
  },
  ice: {
    item: "magicpowers:book_ice",
    name: "Hielo",
    color: "§b",
    hud: "@ice",
    icon: "textures/items/mp_book_ice",
    abilities: [
      { name: "Fragmento Glacial", cooldown: 30, cost: 3, desc: "Esquirla de hielo que ralentiza al enemigo." },
      { name: "Estacas de Hielo", cooldown: 110, cost: 6, desc: "Una fila de estacas brota del suelo hacia delante." },
      { name: "Congelación", cooldown: 220, cost: 10, desc: "Congela a los enemigos cercanos y el agua de alrededor." },
      { name: "Ventisca", cooldown: 320, cost: 15, desc: "Tormenta de nieve que hiere y frena a quien entre en ella." },
    ],
  },
  wind: {
    item: "magicpowers:book_wind",
    name: "Viento",
    color: "§f",
    hud: "@wind",
    icon: "textures/items/mp_book_wind",
    abilities: [
      { name: "Ráfaga", cooldown: 35, cost: 3, desc: "Golpe de viento que lanza lejos a los enemigos." },
      { name: "Salto de Viento", cooldown: 100, cost: 6, desc: "Te impulsa hacia delante y planeas sin daño de caída." },
      { name: "Cuchillas de Viento", cooldown: 160, cost: 10, desc: "Tres cuchillas que atraviesan a los enemigos." },
      { name: "Tornado", cooldown: 300, cost: 15, desc: "Torbellino que atrapa y eleva a los enemigos." },
    ],
  },
  lightning: {
    item: "magicpowers:book_lightning",
    name: "Electricidad",
    color: "§e",
    hud: "@elec",
    icon: "textures/items/mp_book_lightning",
    abilities: [
      { name: "Rayo en Cadena", cooldown: 45, cost: 3, desc: "Rayo que salta de un enemigo a otro." },
      { name: "Pulso Estático", cooldown: 120, cost: 6, desc: "Descarga a tu alrededor que aturde a los enemigos." },
      { name: "Orbe de Plasma", cooldown: 180, cost: 10, desc: "Esfera lenta que electrocuta lo que pasa cerca y estalla." },
      { name: "Tormenta", cooldown: 300, cost: 15, desc: "Rayos del cielo sobre los enemigos cercanos." },
    ],
  },
  gravity: {
    item: "magicpowers:book_gravity",
    name: "Gravedad",
    color: "§d",
    hud: "@grav",
    icon: "textures/items/mp_book_gravity",
    abilities: [
      { name: "Lluvia de Piedras", cooldown: 30, cost: 3, desc: "Lanza pequeñas piedras cargadas de gravedad." },
      { name: "Atracción", cooldown: 100, cost: 6, desc: "Atrae hacia ti a los enemigos que tienes delante." },
      { name: "Roca Colosal", cooldown: 180, cost: 10, desc: "Lanza una roca enorme que aplasta al caer." },
      { name: "Colapso", cooldown: 280, cost: 15, desc: "Eleva a los enemigos y los aplasta contra el suelo." },
    ],
  },
};

/** Libro Mágico Vacío: el jugador escribe en él hechizos de los demás libros. */
export const ARCANE = {
  item: "magicpowers:book_arcane",
  name: "Grimorio",
  color: "§5",
  hud: "@arc",
};

export const ITEM_TO_ELEMENT = Object.fromEntries(Object.entries(ELEMENTS).map(([el, def]) => [def.item, el]));

/** XP que da cada enemigo derrotado (los monstruos normales dan MONSTER_XP). */
export const MONSTER_XP = 2;
export const BOSS_XP = {
  "minecraft:ender_dragon": 40,
  "minecraft:wither": 30,
  "minecraft:warden": 20,
  "minecraft:elder_guardian": 12,
  "minecraft:ravager": 6,
  "minecraft:evocation_illager": 5,
  "minecraft:breeze": 4,
  "minecraft:player": 4,
};

/** Esquinas válidas para el HUD. */
export const HUD_CORNERS = {
  arriba_izquierda: "^TL",
  arriba_derecha: "^TR",
  abajo_izquierda: "^BL",
  abajo_derecha: "^BR",
  oculto: "",
};
export const DEFAULT_CORNER = "^TL";
