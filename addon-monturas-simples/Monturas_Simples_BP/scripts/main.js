// Monturas simples Por Quiquitapo
// Script principal: menu de configuracion, lanzar/recoger monturas, vuelo del
// barco, buceo del submarino, saltos del slime y mejoras pagadas con XP.
import {
  world,
  system,
  ItemStack,
  GameMode,
  InputButton,
  ButtonState,
  EntityDamageCause,
} from "@minecraft/server";
import { ModalFormData, FormCancelationReason } from "@minecraft/server-ui";

const FAMILIA = "quiquitapo_montura";
const P_SKIN = "quiquitapo:skin";
const P_VELOCIDAD = "quiquitapo:velocidad";
const DATOS = "quiquitapo:config";

const MONTURAS = [
  {
    tipo: "slime",
    item: "quiquitapo:montura_slime",
    entidad: "quiquitapo:slime_montura",
    nombre: "Montura de Slime",
    color: "§a",
    skins: ["Bloque de Slime (Vanilla)", "Slime Azul (Terraria)", "Rey Slime (Terraria)", "Reina Slime (Terraria)"],
    mejoras: [
      { id: "salto", nombre: "Super Salto", coste: 3, desc: "Saltos todavía más gigantes." },
      { id: "pisoton", nombre: "Pisotón Gelatinoso", coste: 2, desc: "Al caer sobre mobs hostiles los dañas y los empujas con una onda de viento." },
      { id: "blindaje", nombre: "Blindaje", coste: 2, desc: "La montura tiene el doble de vida." },
    ],
    sonidoLanzar: "mob.slime.big",
    sonidoRecoger: "mob.slime.small",
    ayuda: "Mantén saltar para cargar un salto enorme.",
  },
  {
    tipo: "barco",
    item: "quiquitapo:montura_barco",
    entidad: "quiquitapo:barco_volador",
    nombre: "Barco Volador del End",
    color: "§d",
    skins: ["Barco del End (Vanilla)", "Ovni (Terraria)", "Alfombra Voladora (Terraria)"],
    mejoras: [
      { id: "turbo", nombre: "Turbo de Viento", coste: 3, desc: "Pulsa saltar dos veces seguidas para lanzar una descarga de viento que te impulsa." },
      { id: "vision", nombre: "Visión Nocturna", coste: 3, desc: "Ves en la oscuridad mientras vuelas." },
      { id: "blindaje", nombre: "Blindaje", coste: 2, desc: "La montura tiene el doble de vida." },
    ],
    sonidoLanzar: "mob.shulker.open",
    sonidoRecoger: "mob.shulker.close",
    ayuda: "Vuela hacia donde miras. Saltar = subir. Lanzar una carga de viento = impulso.",
  },
  {
    tipo: "submarino",
    item: "quiquitapo:montura_submarino",
    entidad: "quiquitapo:submarino_guardian",
    nombre: "Submarino Guardián",
    color: "§b",
    skins: ["Guardián Anciano (Vanilla)", "Guardián (Vanilla)", "Cute Fishron (Terraria)"],
    mejoras: [
      { id: "vision", nombre: "Visión Nocturna", coste: 3, desc: "Ves perfectamente bajo el agua y en cuevas." },
      { id: "turbo", nombre: "Turbo de Corriente", coste: 2, desc: "Pulsa saltar dos veces seguidas bajo el agua para salir disparado." },
      { id: "blindaje", nombre: "Blindaje", coste: 2, desc: "La montura tiene el doble de vida." },
    ],
    sonidoLanzar: "mob.elderguardian.idle",
    sonidoRecoger: "bucket.empty_fish",
    ayuda: "Bajo el agua nada hacia donde miras y respiras sin problema.",
  },
];

// Velocidades en bloques por tick (indice 0 = normal, 1 = alta).
const VEL_BARCO = [0.75, 1.2];
const VEL_SUBMARINO = [0.5, 0.85];
const VEL_SUBMARINO_TIERRA = 0.07;

const POR_ITEM = new Map(MONTURAS.map((m) => [m.item, m]));
const POR_ENTIDAD = new Map(MONTURAS.map((m) => [m.entidad, m]));

// Estado en memoria
const cache = new Map(); // id entidad -> { cfg, loc, dim, st }
const jinetesPrevios = new Map(); // id jugador -> { tipo, entidadId, efectos:Set }
const ultimoUso = new Map(); // id jugador -> tick
const ultimoSlime = new Map(); // id jugador -> tick en que iba en el slime
const saltos = new Map(); // id jugador -> tick del ultimo salto (doble toque)
let tick = 0;

// ---------------------------------------------------------------------------
// Configuracion guardada (en el item y en la entidad)
// ---------------------------------------------------------------------------
function cfgPorDefecto() {
  return { velocidad: 0, skin: 0, compradas: [], apagadas: [] };
}

function leerCfg(objeto, montura) {
  const cfg = cfgPorDefecto();
  try {
    const crudo = objeto.getDynamicProperty(DATOS);
    if (typeof crudo === "string") Object.assign(cfg, JSON.parse(crudo));
  } catch {
    // datos corruptos o inexistentes: valores por defecto
  }
  cfg.velocidad = cfg.velocidad === 1 ? 1 : 0;
  cfg.skin = Math.max(0, Math.min(montura.skins.length - 1, cfg.skin | 0));
  cfg.compradas = Array.isArray(cfg.compradas) ? cfg.compradas : [];
  cfg.apagadas = Array.isArray(cfg.apagadas) ? cfg.apagadas : [];
  return cfg;
}

function activa(cfg, id) {
  return cfg.compradas.includes(id) && !cfg.apagadas.includes(id);
}

function lore(montura, cfg) {
  const mejoras = montura.mejoras.filter((m) => activa(cfg, m.id)).map((m) => m.nombre);
  return [
    `§7Velocidad: §f${cfg.velocidad ? "Alta" : "Normal"}`,
    `§7Skin: §f${montura.skins[cfg.skin]}`,
    `§7Mejoras: ${mejoras.length ? "§a" + mejoras.join(", ") : "§8ninguna"}`,
    "§8Agáchate + usar: configurar",
    "§8Usar: lanzar la montura",
  ];
}

function guardarEnItem(item, montura, cfg) {
  item.setDynamicProperty(DATOS, JSON.stringify(cfg));
  item.setLore(lore(montura, cfg));
}

function crearItem(montura, cfg) {
  const item = new ItemStack(montura.item, 1);
  guardarEnItem(item, montura, cfg);
  return item;
}

function aplicarCfgEntidad(entidad, montura, cfg) {
  entidad.setDynamicProperty(DATOS, JSON.stringify(cfg));
  entidad.setProperty(P_SKIN, cfg.skin);
  entidad.setProperty(P_VELOCIDAD, cfg.velocidad);
  entidad.triggerEvent(cfg.velocidad ? "quiquitapo:velocidad_alta" : "quiquitapo:velocidad_normal");
  entidad.triggerEvent(activa(cfg, "blindaje") ? "quiquitapo:blindaje_on" : "quiquitapo:blindaje_off");
  if (montura.tipo === "slime") {
    entidad.triggerEvent(activa(cfg, "salto") ? "quiquitapo:salto_super" : "quiquitapo:salto_normal");
  }
  cache.set(entidad.id, { cfg, loc: entidad.location, dim: entidad.dimension.id, st: {} });
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function inventario(jugador) {
  return jugador.getComponent("minecraft:inventory")?.container;
}

function montado(jugador) {
  return jugador.getComponent("minecraft:riding")?.entityRidingOn;
}

function jinete(entidad) {
  const riders = entidad.getComponent("minecraft:rideable")?.getRiders() ?? [];
  return riders.find((r) => r.typeId === "minecraft:player");
}

function esCreativo(jugador) {
  try {
    return jugador.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
}

function hueco(dim, loc) {
  try {
    const b = dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) });
    const a = b?.above();
    return !!b && !!a && (b.isAir || b.isLiquid) && (a.isAir || a.isLiquid);
  } catch {
    return false;
  }
}

function particula(dim, id, loc) {
  try {
    dim.spawnParticle(id, loc);
  } catch {
    // la particula puede fallar si el chunk no esta cargado
  }
}

function sonido(dim, id, loc) {
  try {
    dim.playSound(id, loc);
  } catch {
    // ignorar
  }
}

function efecto(jugador, id, ticks, nivel = 0) {
  try {
    jugador.addEffect(id, ticks, { amplifier: nivel, showParticles: false });
  } catch {
    // ignorar
  }
}

// ---------------------------------------------------------------------------
// Usar el item: agachado = menu, normal = lanzar
// ---------------------------------------------------------------------------
function usarItem(jugador, item, bloque, cara) {
  const montura = POR_ITEM.get(item?.typeId);
  if (!montura) return;
  const t = ultimoUso.get(jugador.id) ?? -100;
  if (tick - t < 6) return; // evita dobles disparos (aire + bloque)
  ultimoUso.set(jugador.id, tick);

  const slot = jugador.selectedSlotIndex;
  if (jugador.isSneaking) {
    abrirMenu(jugador, montura, slot);
  } else {
    lanzar(jugador, montura, slot, bloque, cara);
  }
}

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.source?.typeId !== "minecraft:player") return;
  usarItem(ev.source, ev.itemStack);
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  if (!ev.isFirstEvent || !ev.itemStack || !POR_ITEM.has(ev.itemStack.typeId)) return;
  ev.cancel = true;
  const { player, itemStack, block, blockFace } = ev;
  system.run(() => usarItem(player, itemStack, block, blockFace));
});

const DESPLAZAMIENTO_CARA = {
  Up: { x: 0, y: 1, z: 0 },
  Down: { x: 0, y: -2, z: 0 },
  North: { x: 0, y: 0, z: -1 },
  South: { x: 0, y: 0, z: 1 },
  East: { x: 1, y: 0, z: 0 },
  West: { x: -1, y: 0, z: 0 },
};

function lanzar(jugador, montura, slot, bloque, cara) {
  if (montado(jugador)) {
    jugador.onScreenDisplay.setActionBar("§cBájate de tu montura actual antes de lanzar otra.");
    return;
  }
  const inv = inventario(jugador);
  const item = inv?.getItem(slot);
  if (!item || item.typeId !== montura.item) return;
  const cfg = leerCfg(item, montura);
  const dim = jugador.dimension;
  const rot = jugador.getRotation();
  const yaw = (rot.y * Math.PI) / 180;
  const fx = -Math.sin(yaw);
  const fz = Math.cos(yaw);

  let loc;
  if (bloque) {
    const d = DESPLAZAMIENTO_CARA[cara] ?? DESPLAZAMIENTO_CARA.Up;
    loc = { x: bloque.location.x + 0.5 + d.x, y: bloque.location.y + d.y, z: bloque.location.z + 0.5 + d.z };
  } else {
    const p = jugador.location;
    loc = { x: p.x + fx * 2.5, y: p.y + 0.2, z: p.z + fz * 2.5 };
  }
  if (!hueco(dim, loc)) {
    const p = jugador.location;
    loc = { x: p.x + fx * 1.5, y: p.y + 0.2, z: p.z + fz * 1.5 };
    if (!hueco(dim, loc)) loc = { ...p };
  }

  let entidad;
  try {
    entidad = dim.spawnEntity(montura.entidad, loc);
  } catch {
    jugador.onScreenDisplay.setActionBar("§cNo hay sitio para lanzar la montura aquí.");
    return;
  }
  entidad.setRotation({ x: 0, y: rot.y });
  aplicarCfgEntidad(entidad, montura, cfg);
  if (montura.tipo === "slime") {
    entidad.applyImpulse({ x: fx * 0.3, y: 0.35, z: fz * 0.3 });
  }
  inv.setItem(slot, undefined);

  sonido(dim, montura.sonidoLanzar, loc);
  particula(dim, montura.tipo === "submarino" ? "minecraft:nautilus_bubbles_particle" : "minecraft:villager_happy", {
    x: loc.x,
    y: loc.y + 0.8,
    z: loc.z,
  });
  jugador.onScreenDisplay.setActionBar(
    `${montura.color}¡${montura.nombre} lanzada! §fInteractúa para subir · §7Agáchate + interactúa para recogerla`
  );
}

// ---------------------------------------------------------------------------
// Menu de configuracion (agacharse + usar)
// ---------------------------------------------------------------------------
function abrirMenu(jugador, montura, slot, intentos = 0) {
  const item = inventario(jugador)?.getItem(slot);
  if (!item || item.typeId !== montura.item) return;
  const cfg = leerCfg(item, montura);
  const creativo = esCreativo(jugador);

  const form = new ModalFormData().title(`${montura.color}§l${montura.nombre}`);
  form.label(
    `§7Tus niveles de XP: §a${jugador.level}${creativo ? " §e(modo creativo: mejoras gratis)" : ""}\n` +
      `§7${montura.ayuda}\n§7Las mejoras se pagan una vez y después puedes activarlas o desactivarlas.`
  );
  form.dropdown("§eVelocidad", ["Normal", "Alta"], { defaultValueIndex: cfg.velocidad });
  form.dropdown("§bSkin", montura.skins, { defaultValueIndex: cfg.skin });
  for (const m of montura.mejoras) {
    const comprada = cfg.compradas.includes(m.id);
    const texto = comprada
      ? `§a${m.nombre} §7(comprada)\n§8${m.desc}`
      : `§f${m.nombre} §6[${m.coste} niveles de XP]\n§8${m.desc}`;
    form.toggle(texto, { defaultValue: comprada && !cfg.apagadas.includes(m.id) });
  }
  form.submitButton("§lGuardar");

  form
    .show(jugador)
    .then((res) => {
      if (res.canceled) {
        if (res.cancelationReason === FormCancelationReason.UserBusy && intentos < 10) {
          system.runTimeout(() => abrirMenu(jugador, montura, slot, intentos + 1), 5);
        }
        return;
      }
      guardarMenu(jugador, montura, slot, res.formValues ?? []);
    })
    .catch(() => {});
}

function guardarMenu(jugador, montura, slot, valores) {
  const inv = inventario(jugador);
  const item = inv?.getItem(slot);
  if (!item || item.typeId !== montura.item) return;
  const cfg = leerCfg(item, montura);
  const creativo = esCreativo(jugador);

  // La etiqueta de texto puede ocupar (o no) una posicion en formValues.
  const n = 2 + montura.mejoras.length;
  const v = valores.length > n ? valores.slice(valores.length - n) : valores;

  cfg.velocidad = v[0] === 1 ? 1 : 0;
  cfg.skin = Math.max(0, Math.min(montura.skins.length - 1, Number(v[1]) | 0));

  const mensajes = [];
  montura.mejoras.forEach((m, i) => {
    const quiere = v[2 + i] === true;
    const comprada = cfg.compradas.includes(m.id);
    if (quiere && !comprada) {
      if (creativo || jugador.level >= m.coste) {
        if (!creativo) jugador.addLevels(-m.coste);
        cfg.compradas.push(m.id);
        mensajes.push(`§a✔ Has comprado §f${m.nombre}§a${creativo ? "" : ` por ${m.coste} niveles`}.`);
        jugador.playSound("random.levelup");
      } else {
        mensajes.push(`§c✘ Te faltan niveles para §f${m.nombre} §c(necesitas ${m.coste}, tienes ${jugador.level}).`);
      }
    }
    cfg.apagadas = cfg.apagadas.filter((id) => id !== m.id);
    if (!quiere && cfg.compradas.includes(m.id)) cfg.apagadas.push(m.id);
  });

  guardarEnItem(item, montura, cfg);
  inv.setItem(slot, item);
  jugador.playSound("random.orb");
  jugador.sendMessage(
    `${montura.color}§l${montura.nombre}§r §7→ Velocidad: §f${cfg.velocidad ? "Alta" : "Normal"}§7, Skin: §f${montura.skins[cfg.skin]}`
  );
  for (const m of mensajes) jugador.sendMessage(m);
}

// ---------------------------------------------------------------------------
// Recoger (agacharse + interactuar) y soltar al morir
// ---------------------------------------------------------------------------
world.afterEvents.playerInteractWithEntity.subscribe((ev) => {
  const { player, target } = ev;
  const montura = POR_ENTIDAD.get(target?.typeId);
  if (!montura || !player.isSneaking || jinete(target)) return;
  const cfg = leerCfg(target, montura);
  const item = crearItem(montura, cfg);
  const sobra = inventario(player)?.addItem(item);
  if (sobra) player.dimension.spawnItem(sobra, player.location);
  sonido(target.dimension, montura.sonidoRecoger, target.location);
  cache.delete(target.id);
  target.remove();
  player.onScreenDisplay.setActionBar(`${montura.color}Has recogido tu ${montura.nombre}.`);
});

world.afterEvents.entityDie.subscribe(
  (ev) => {
    const muerto = ev.deadEntity;
    const montura = POR_ENTIDAD.get(muerto.typeId);
    if (!montura) return;
    const c = cache.get(muerto.id);
    let cfg = c?.cfg;
    let loc = c?.loc;
    let dim = c ? world.getDimension(c.dim) : undefined;
    try {
      cfg = leerCfg(muerto, montura);
      loc = muerto.location;
      dim = muerto.dimension;
    } catch {
      // la entidad ya no es valida: usamos la cache
    }
    if (!dim || !loc) return;
    dim.spawnItem(crearItem(montura, cfg ?? cfgPorDefecto()), { x: loc.x, y: loc.y + 0.5, z: loc.z });
    cache.delete(muerto.id);
  },
  { entityTypes: MONTURAS.map((m) => m.entidad) }
);

world.afterEvents.entityRemove.subscribe((ev) => {
  // Si muere ya se gestiono arriba; si solo se descarga el chunk se vuelve a leer al cargar.
  cache.delete(ev.removedEntityId);
});

// ---------------------------------------------------------------------------
// Sin dano de caida para el jinete del slime (como en Terraria)
// ---------------------------------------------------------------------------
world.afterEvents.entityHurt.subscribe(
  (ev) => {
    if (ev.damageSource.cause !== EntityDamageCause.fall) return;
    const j = ev.hurtEntity;
    const t = ultimoSlime.get(j.id);
    if (t === undefined || tick - t > 60) return;
    const vida = j.getComponent("minecraft:health");
    if (vida && vida.currentValue > 0) {
      vida.setCurrentValue(Math.min(vida.effectiveMax, vida.currentValue + ev.damage));
    }
  },
  { entityTypes: ["minecraft:player"] }
);

// ---------------------------------------------------------------------------
// Doble salto = turbo; lanzar una carga de viento en el barco = impulso
// ---------------------------------------------------------------------------
world.afterEvents.playerButtonInput.subscribe((ev) => {
  if (ev.button !== InputButton.Jump || ev.newButtonState !== ButtonState.Pressed) return;
  const j = ev.player;
  const previo = saltos.get(j.id) ?? -100;
  saltos.set(j.id, tick);
  if (tick - previo > 8) return;
  const ent = montado(j);
  const montura = POR_ENTIDAD.get(ent?.typeId);
  if (!montura || montura.tipo === "slime") return;
  const c = cache.get(ent.id);
  if (!c || !activa(c.cfg, "turbo")) return;
  if (montura.tipo === "submarino" && !ent.isInWater) return;
  turbo(ent, c, montura.tipo === "barco" ? 1.6 : 1.3);
});

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack?.typeId !== "minecraft:wind_charge") return;
  const ent = montado(ev.source);
  if (ent?.typeId !== "quiquitapo:barco_volador") return;
  const c = cache.get(ent.id);
  if (c) turbo(ent, c, 1.4, true);
});

function turbo(ent, c, fuerza, gratis = false) {
  const st = c.st;
  if (!gratis && (st.enfriamiento ?? 0) > tick) return;
  st.turbo = 30;
  st.turboFuerza = fuerza;
  if (!gratis) st.enfriamiento = tick + 60;
  const l = ent.location;
  if (ent.typeId === "quiquitapo:barco_volador") {
    particula(ent.dimension, "minecraft:wind_explosion_emitter", l);
    sonido(ent.dimension, "wind_charge.burst", l);
  } else {
    particula(ent.dimension, "minecraft:bubble_column_up_particle", l);
    sonido(ent.dimension, "conduit.short", l);
  }
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
const DIMENSIONES = ["overworld", "nether", "the_end"];

system.runInterval(() => {
  tick++;
  const actuales = new Map();
  for (const id of DIMENSIONES) {
    let entidades;
    try {
      entidades = world.getDimension(id).getEntities({ families: [FAMILIA] });
    } catch {
      continue;
    }
    for (const e of entidades) {
      try {
        actualizar(e, actuales);
      } catch {
        // la entidad pudo desaparecer durante el tick
      }
    }
  }
  // Jugadores que se han bajado este tick
  for (const [id, info] of jinetesPrevios) {
    if (actuales.has(id)) continue;
    const j = world.getEntity(id);
    if (j) alBajar(j, info);
  }
  jinetesPrevios.clear();
  for (const [id, info] of actuales) jinetesPrevios.set(id, info);
}, 1);

function actualizar(e, actuales) {
  const montura = POR_ENTIDAD.get(e.typeId);
  if (!montura) return;
  let c = cache.get(e.id);
  if (!c) {
    c = { cfg: leerCfg(e, montura), loc: e.location, dim: e.dimension.id, st: {} };
    cache.set(e.id, c);
  }
  c.loc = e.location;
  c.dim = e.dimension.id;

  const j = jinete(e);
  if (j) {
    const previo = jinetesPrevios.get(j.id);
    const info = { tipo: montura.tipo, entidadId: e.id, efectos: previo?.efectos ?? new Set() };
    actuales.set(j.id, info);
    if (tick % 20 === 0) efectosJinete(j, montura, c, info);
  }

  if (montura.tipo === "barco") barco(e, j, c);
  else if (montura.tipo === "submarino") submarino(e, j, c);
  else slime(e, j, c);
}

function efectosJinete(j, montura, c, info) {
  if (activa(c.cfg, "vision")) {
    efecto(j, "night_vision", 400);
    info.efectos.add("night_vision");
  }
  if (montura.tipo === "submarino") {
    efecto(j, "water_breathing", 300);
    info.efectos.add("water_breathing");
  }
}

function alBajar(j, info) {
  for (const id of info.efectos) {
    try {
      j.removeEffect(id);
    } catch {
      // ignorar
    }
  }
  if (info.tipo === "barco" && !j.isOnGround) efecto(j, "slow_falling", 160);
  if (info.tipo === "slime") ultimoSlime.set(j.id, tick);
}

// Mueve la entidad hacia una velocidad objetivo con algo de inercia.
function dirigir(e, objetivo, suavizado) {
  const v = e.getVelocity();
  e.applyImpulse({
    x: (objetivo.x - v.x) * suavizado,
    y: (objetivo.y - v.y) * suavizado,
    z: (objetivo.z - v.z) * suavizado,
  });
}

// Velocidad deseada segun la vista y las teclas del jinete.
function vueloDesdeJinete(j, rapidez, vertical = true) {
  const mov = j.inputInfo.getMovementVector();
  const mira = j.getViewDirection();
  const rot = j.getRotation();
  const yaw = (rot.y * Math.PI) / 180;
  const izqX = Math.cos(yaw);
  const izqZ = Math.sin(yaw);
  const avance = mov.y < 0 ? mov.y * 0.5 : mov.y;
  const lado = mov.x * 0.6;
  let subir = 0;
  try {
    if (j.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed) subir = 0.5;
  } catch {
    // ignorar
  }
  return {
    x: (mira.x * avance + izqX * lado) * rapidez,
    y: vertical ? (mira.y * avance + subir) * rapidez : 0,
    z: (mira.z * avance + izqZ * lado) * rapidez,
    yaw: rot.y,
  };
}

function conTurbo(c, objetivo, j) {
  const st = c.st;
  if (!st.turbo || st.turbo <= 0) return objetivo;
  st.turbo--;
  const extra = 1 + st.turboFuerza * (st.turbo / 30);
  if (j && Math.abs(objetivo.x) + Math.abs(objetivo.y) + Math.abs(objetivo.z) < 0.05) {
    // turbo sin moverse: empuja hacia donde mira
    const m = j.getViewDirection();
    return { x: m.x * 0.6 * extra, y: m.y * 0.6 * extra, z: m.z * 0.6 * extra };
  }
  return { x: objetivo.x * extra, y: objetivo.y * extra, z: objetivo.z * extra };
}

function barco(e, j, c) {
  if (j) {
    const o = vueloDesdeJinete(j, VEL_BARCO[c.cfg.velocidad]);
    e.setRotation({ x: 0, y: o.yaw });
    dirigir(e, conTurbo(c, o, j), c.st.turbo > 0 ? 0.45 : 0.2);
    if (c.st.turbo > 0 && tick % 3 === 0) particula(e.dimension, "minecraft:wind_charged_emitter", e.location);
  } else {
    // sin jinete: se queda flotando donde lo dejaste
    dirigir(e, { x: 0, y: 0, z: 0 }, 0.15);
  }
}

function submarino(e, j, c) {
  const st = c.st;
  // Pequena histeresis para no cambiar de modo sin parar en la superficie.
  st.fuera = e.isInWater ? 0 : (st.fuera ?? 0) + 1;
  const enAgua = st.fuera < 6;
  if (st.enAgua !== enAgua) {
    st.enAgua = enAgua;
    e.triggerEvent(enAgua ? "quiquitapo:en_agua" : "quiquitapo:en_tierra");
  }
  if (enAgua) {
    if (j) {
      const o = vueloDesdeJinete(j, VEL_SUBMARINO[c.cfg.velocidad]);
      e.setRotation({ x: 0, y: o.yaw });
      dirigir(e, conTurbo(c, o, j), st.turbo > 0 ? 0.4 : 0.18);
      if (tick % 4 === 0 && Math.abs(o.x) + Math.abs(o.z) > 0.1) {
        particula(e.dimension, "minecraft:basic_bubble_particle", e.location);
      }
    } else {
      dirigir(e, { x: 0, y: 0, z: 0 }, 0.2);
    }
  } else if (j) {
    // fuera del agua se arrastra despacio, como un guardian en tierra
    const o = vueloDesdeJinete(j, VEL_SUBMARINO_TIERRA, false);
    e.setRotation({ x: 0, y: o.yaw });
    const v = e.getVelocity();
    e.applyImpulse({ x: (o.x - v.x) * 0.3, y: 0, z: (o.z - v.z) * 0.3 });
  }
}

function slime(e, j, c) {
  const st = c.st;
  const v = e.getVelocity();
  if (j) ultimoSlime.set(j.id, tick);
  if (!e.isOnGround) {
    if (!st.aire && v.y > 0.25) sonido(e.dimension, "mob.slime.jump", e.location);
    st.aire = true;
    st.minVy = Math.min(st.minVy ?? 0, v.y);
    // Protege al jinete justo antes de aterrizar de un salto enorme.
    if (j && v.y < -0.5) {
      const suelo = e.dimension.getBlockFromRay(e.location, { x: 0, y: -1, z: 0 }, { maxDistance: 3 });
      if (suelo) efecto(j, "resistance", 6, 4);
    }
    return;
  }
  if (st.aire) {
    st.aire = false;
    const caida = st.minVy ?? 0;
    st.minVy = 0;
    if (caida < -0.45) {
      sonido(e.dimension, "mob.slime.big", e.location);
      particula(e.dimension, "minecraft:oozing_emitter", e.location);
    }
    if (j && caida < -0.6 && activa(c.cfg, "pisoton")) pisoton(e, j, caida);
  }
}

function pisoton(e, j, caida) {
  const dim = e.dimension;
  const l = e.location;
  const dano = Math.min(12, Math.round(3 + Math.abs(caida) * 6));
  particula(dim, "minecraft:wind_explosion_emitter", l);
  sonido(dim, "wind_charge.burst", l);
  for (const m of dim.getEntities({ location: l, maxDistance: 4, families: ["monster"] })) {
    try {
      m.applyDamage(dano, { cause: EntityDamageCause.entityAttack, damagingEntity: j });
      const dx = m.location.x - l.x;
      const dz = m.location.z - l.z;
      const len = Math.hypot(dx, dz) || 1;
      m.applyKnockback({ x: (dx / len) * 1.4, z: (dz / len) * 1.4 }, 0.5);
    } catch {
      // algunos mobs no aceptan empuje
    }
  }
}
