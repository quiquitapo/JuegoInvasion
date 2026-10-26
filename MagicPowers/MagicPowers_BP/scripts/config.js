// ---------------------------------------------------------------------------
// MagicPowers By Quiquitapo - configuración de libros, habilidades y niveles
// ---------------------------------------------------------------------------

/** Ticks manteniendo agachado para lanzar la habilidad (20 ticks = 1 s). */
export const HOLD_TICKS = 10;
/** Un toque de agachar más corto que esto cambia de habilidad. */
export const TAP_TICKS = 6;

export const MAX_LEVEL = 5;
/** Nivel en el que se desbloquea la segunda habilidad. */
export const UNLOCK_LEVEL = 2;
/** XP total necesaria para alcanzar cada nivel (índice = nivel - 1). */
export const LEVEL_XP = [0, 10, 30, 60, 100];

export function levelFromXp(xp) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}

/** +15 % de daño por nivel. */
export const damageMult = (level) => 1 + 0.15 * (level - 1);
/** -7 % de enfriamiento por nivel. */
export const cooldownMult = (level) => 1 - 0.07 * (level - 1);

/**
 * cooldown en ticks (nivel 1). El daño base de cada habilidad está en abilities.js.
 * hud: etiqueta que entiende el HUD (ui/hud_screen.json).
 */
export const ELEMENTS = {
  fire: {
    item: "magicpowers:book_fire",
    name: "Fuego",
    color: "§c",
    hud: "@fire",
    abilities: [
      { name: "Llamarada", cooldown: 60, desc: "Cono de fuego que quema a los enemigos" },
      { name: "Meteoro Ígneo", cooldown: 180, desc: "Bola de fuego que estalla al impactar" },
    ],
  },
  ice: {
    item: "magicpowers:book_ice",
    name: "Hielo",
    color: "§b",
    hud: "@ice",
    abilities: [
      { name: "Fragmento Glacial", cooldown: 35, desc: "Esquirla de hielo que ralentiza" },
      { name: "Nova Helada", cooldown: 240, desc: "Onda que congela todo a tu alrededor" },
    ],
  },
  wind: {
    item: "magicpowers:book_wind",
    name: "Viento",
    color: "§f",
    hud: "@wind",
    abilities: [
      { name: "Ráfaga", cooldown: 40, desc: "Golpe de viento que lanza lejos a los enemigos" },
      { name: "Tornado", cooldown: 300, desc: "Torbellino que atrapa y eleva a los enemigos" },
    ],
  },
  lightning: {
    item: "magicpowers:book_lightning",
    name: "Electricidad",
    color: "§e",
    hud: "@elec",
    abilities: [
      { name: "Rayo en Cadena", cooldown: 60, desc: "Rayo eléctrico que salta entre enemigos" },
      { name: "Tormenta", cooldown: 280, desc: "Rayos del cielo sobre los enemigos cercanos" },
    ],
  },
  gravity: {
    item: "magicpowers:book_gravity",
    name: "Gravedad",
    color: "§d",
    hud: "@grav",
    abilities: [
      { name: "Lluvia de Piedras", cooldown: 30, desc: "Lanza pequeñas piedras cargadas de gravedad" },
      { name: "Colapso", cooldown: 260, desc: "Eleva a los enemigos y los aplasta contra el suelo" },
    ],
  },
};

export const ITEM_TO_ELEMENT = Object.fromEntries(Object.entries(ELEMENTS).map(([el, def]) => [def.item, el]));

/** XP que da cada enemigo derrotado. */
export const BOSS_XP = {
  "minecraft:ender_dragon": 40,
  "minecraft:wither": 25,
  "minecraft:warden": 20,
  "minecraft:elder_guardian": 10,
  "minecraft:ravager": 4,
  "minecraft:evocation_illager": 3,
  "minecraft:breeze": 2,
  "minecraft:player": 3,
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
