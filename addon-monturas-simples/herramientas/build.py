#!/usr/bin/env python3
"""
Monturas simples Por Quiquitapo - generador de arte y empaquetador.

Genera los modelos (geometry), las texturas de cada skin, los iconos de los
items y los iconos de los packs, y despues empaqueta todo en un .mcaddon.

Uso:  python3 herramientas/build.py
Requiere Pillow (pip install pillow).
"""
import json
import math
import os
import random
import zipfile

from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BP = os.path.join(RAIZ, "Monturas_Simples_BP")
RP = os.path.join(RAIZ, "Monturas_Simples_RP")
DIST = os.path.join(RAIZ, "dist")
NOMBRE_ADDON = "Monturas_simples_Por_Quiquitapo"


# ---------------------------------------------------------------------------
# Colores y utilidades de pixel art
# ---------------------------------------------------------------------------
def hx(c, a=255):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def mul(col, f):
    return (max(0, min(255, int(col[0] * f))), max(0, min(255, int(col[1] * f))),
            max(0, min(255, int(col[2] * f))), col[3])


def lienzo(w, h, col=(0, 0, 0, 0)):
    return Image.new("RGBA", (max(1, w), max(1, h)), col)


def ruido(paleta, alpha=255):
    pal = [hx(c, alpha) for c in paleta]

    def mat(w, h, cara, rng):
        im = lienzo(w, h)
        px = im.load()
        for y in range(h):
            for x in range(w):
                px[x, y] = rng.choice(pal)
        return im
    return mat


def con_borde(mat, color, alpha=255, grosor=1):
    col = hx(color, alpha)

    def m(w, h, cara, rng):
        im = mat(w, h, cara, rng)
        px = im.load()
        for y in range(h):
            for x in range(w):
                if x < grosor or y < grosor or x >= w - grosor or y >= h - grosor:
                    px[x, y] = col
        return im
    return m


def degradado(mat, arriba=1.15, abajo=0.8, solo_lados=True):
    """Sombra vertical estilo Terraria: mas claro arriba, mas oscuro abajo."""
    def m(w, h, cara, rng):
        im = mat(w, h, cara, rng)
        if cara == "up":
            return im.point(lambda v: v)  # copia
        if cara == "down":
            px = im.load()
            for y in range(h):
                for x in range(w):
                    px[x, y] = mul(px[x, y], abajo)
            return im
        px = im.load()
        for y in range(h):
            f = arriba + (abajo - arriba) * (y / max(1, h - 1))
            for x in range(w):
                px[x, y] = mul(px[x, y], f)
        return im
    return m


def por_cara(**mats):
    """Material distinto segun la cara; 'otro' es el material por defecto."""
    def m(w, h, cara, rng):
        return mats.get(cara, mats["otro"])(w, h, cara, rng)
    return m


# ---------------------------------------------------------------------------
# Materiales
# ---------------------------------------------------------------------------
# --- Slime vanilla (bloque de slime) ---
def slime_bloque(w, h, cara, rng):
    base = [hx(c, 150) for c in ("#73c262", "#7bca62", "#7bce6a", "#73c262")]
    borde = hx("#62b64a", 205)
    interior = hx("#5aaa43", 190)
    im = lienzo(w, h)
    px = im.load()
    ins = max(2, round(min(w, h) * 0.22))
    for y in range(h):
        for x in range(w):
            c = rng.choice(base)
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                c = borde
            elif (x in (ins, w - 1 - ins) and ins <= y <= h - 1 - ins) or \
                 (y in (ins, h - 1 - ins) and ins <= x <= w - 1 - ins):
                c = interior
            px[x, y] = c
    return im


slime_nucleo = ruido(["#5aaa43", "#62b64a", "#4f9a3b", "#5aaa43"], 235)
negro_ojo = ruido(["#141414", "#1c1c1c"])


def ojo_brillo(w, h, cara, rng):
    im = negro_ojo(w, h, cara, rng)
    if cara in ("north",):
        im.putpixel((min(1, w - 1), 0), hx("#ffffff"))
        if h > 3:
            im.putpixel((min(1, w - 1), 1), hx("#d8d8d8"))
    return im


boca = ruido(["#2a4f22", "#22441b"])
cuero = con_borde(ruido(["#8b5a2b", "#7a4a22", "#9c6633", "#8b5a2b"]), "#5c3a18")


def correa(w, h, cara, rng):
    im = lienzo(w, h)
    px = im.load()
    a, b = hx("#c8a46e"), hx("#9c7a48")
    for y in range(h):
        for x in range(w):
            px[x, y] = b if (x + y) % 4 in (0, 1) else a
    return im


# --- Slimes estilo Terraria ---
def slime_terraria(c1, c2, c3, contorno, alpha=215, brillo=True):
    base = degradado(ruido([c1, c2, c3, c1], alpha), 1.18, 0.78)

    def m(w, h, cara, rng):
        im = base(w, h, cara, rng)
        px = im.load()
        oscuro = hx(contorno, min(255, alpha + 25))
        if cara != "up":
            for x in range(w):
                px[x, h - 1] = oscuro
        if cara in ("east", "west", "north", "south"):
            for y in range(h):
                px[0, y] = oscuro
                px[w - 1, y] = oscuro
        if brillo and cara == "north" and w > 6 and h > 4:
            for i in range(min(3, h - 2)):
                px[2, 1 + i] = hx("#ffffff", 230)
            px[3, 1] = hx("#ffffff", 230)
        return im
    return m


slime_azul = slime_terraria("#4a86f0", "#4f8cf5", "#447cea", "#2a4fb0", 215)
slime_rey = slime_terraria("#2f63e6", "#3a6ff0", "#2858d8", "#1a3a9a", 185)
slime_reina = slime_terraria("#f07ad0", "#e86cc4", "#f58bd8", "#b0408f", 205)


def ninja(w, h, cara, rng):
    im = ruido(["#22222c", "#1b1b24", "#262632"])(w, h, cara, rng)
    px = im.load()
    banda = int(h * 0.3)
    if cara != "up" and cara != "down":
        for x in range(w):
            px[x, banda] = hx("#c0262e")
        if cara == "north" and w >= 4 and banda + 2 < h:
            px[1, banda + 2] = hx("#f0f0f0")
            px[w - 2, banda + 2] = hx("#f0f0f0")
    return im


oro = con_borde(ruido(["#f5c542", "#e8b030", "#ffd966", "#f5c542"]), "#b07d12")
rubi = ruido(["#d01a2a", "#ff4a5a", "#b01020"])
cristal = ruido(["#bff3ff", "#8fe3ff", "#ffffff", "#ffb3f0"], 235)


def ala_rosa(w, h, cara, rng):
    im = ruido(["#ffb3ec", "#ffc2f0", "#ffa6e6"], 160)(w, h, cara, rng)
    px = im.load()
    for y in range(h):
        for x in range(w):
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                px[x, y] = hx("#e060c0", 230)
            elif (x + y) % 5 == 0:
                px[x, y] = hx("#f08ad8", 190)
    return im


# --- Barco del End ---
def purpur(w, h, cara, rng):
    base = [hx(c) for c in ("#b286b2", "#ac7bac", "#a472a3", "#ba95ba")]
    linea = [hx("#906590"), hx("#9d6f9c")]
    claro = hx("#c7a8c7")
    im = lienzo(w, h)
    px = im.load()
    for y in range(h):
        for x in range(w):
            if x % 8 == 7 or y % 8 == 7:
                c = rng.choice(linea)
            elif (x % 8 == 0 or y % 8 == 0) and rng.random() < 0.6:
                c = claro
            else:
                c = rng.choice(base)
            px[x, y] = c
    return im


def pilar_purpur(w, h, cara, rng):
    tonos = [hx("#b286b2"), hx("#a472a3"), hx("#ba95ba"), hx("#906590")]
    im = lienzo(w, h)
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = tonos[x % 4] if cara not in ("up", "down") else tonos[(x + y) % 4]
            if rng.random() < 0.12:
                c = mul(c, 1.08)
            px[x, y] = c
    return im


def cubierta(w, h, cara, rng):
    im = lienzo(w, h)
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = rng.choice([hx("#c7a8c7"), hx("#ba95ba"), hx("#b286b2")])
            if y % 4 == 3:
                c = hx("#906590")
            px[x, y] = c
    return im


dragon_negro = ruido(["#1b1b1b", "#222222", "#141414", "#2c2c2c"])


def dragon_cabeza(w, h, cara, rng):
    im = dragon_negro(w, h, cara, rng)
    if cara in ("east", "west") and w >= 4 and h >= 4:
        # ojo morado del dragon del End
        x = 1 if cara == "west" else w - 3
        for dx in range(2):
            im.putpixel((x + dx, 1), hx("#cc00fa"))
        im.putpixel((x, 2), hx("#f3a6ff"))
    return im


def hocico(w, h, cara, rng):
    im = dragon_negro(w, h, cara, rng)
    if cara == "north" and w >= 4:
        im.putpixel((1, 0), hx("#3d3d3d"))
        im.putpixel((w - 2, 0), hx("#3d3d3d"))
    return im


def estandarte(w, h, cara, rng):
    im = ruido(["#b84fb8", "#c45ec4", "#ad46ad"])(w, h, cara, rng)
    px = im.load()
    for y in range(h):
        for x in range(w):
            if x == 0 or x == w - 1 or y == h - 1:
                px[x, y] = hx("#8a2f8a")
            cx = w // 2
            if abs(x - cx) <= 1 and h * 0.25 <= y <= h * 0.75:
                px[x, y] = hx("#1c1c1c")
            if abs(x - cx) + abs(y - int(h * 0.5)) == 2:
                px[x, y] = hx("#1c1c1c")
    return im


vara_end = ruido(["#f0f0f0", "#ffffff", "#e6e0ea"])


# --- Ovni (Terraria, llave del coche cosmico) ---
def metal(w, h, cara, rng):
    im = ruido(["#9aa3ad", "#a7b0ba", "#8e97a1", "#a1aab4"])(w, h, cara, rng)
    px = im.load()
    for y in range(h):
        for x in range(w):
            if x % 8 == 0 or (cara in ("up", "down") and y % 8 == 0):
                px[x, y] = hx("#6f7780")
            elif x % 8 == 4 and y % 4 == 2:
                px[x, y] = hx("#d7dde3")
    return im


metal_oscuro = ruido(["#5b616a", "#545a62", "#626872"])


def borde_luces(w, h, cara, rng):
    im = metal(w, h, cara, rng)
    if cara in ("north", "south", "east", "west"):
        px = im.load()
        colores = [hx("#5ff2ff"), hx("#ff5a5a"), hx("#fff35a")]
        y = h // 2
        for x in range(1, w - 1, 4):
            c = colores[(x // 4) % 3]
            px[x, y] = c
            if x + 1 < w:
                px[x + 1, y] = c
    return im


def luz(w, h, cara, rng):
    return ruido(["#fff35a", "#ffffa0", "#ffe14a"])(w, h, cara, rng)


def brillo_verde(w, h, cara, rng):
    im = lienzo(w, h)
    px = im.load()
    cx, cy = (w - 1) / 2, (h - 1) / 2
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max(1, max(cx, cy))
            px[x, y] = mul(hx("#6bff8a"), 1.15 - 0.5 * d)
    return im


def vidrio(w, h, cara, rng):
    im = lienzo(w, h, hx("#7fe8ff", 105))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                px[x, y] = hx("#c8f7ff", 175)
            elif cara != "down" and x - y == 2 and x < w * 0.6:
                px[x, y] = hx("#ffffff", 200)
    return im


def marciano(w, h, cara, rng):
    im = ruido(["#6fd36a", "#62c45d", "#7ae075"])(w, h, cara, rng)
    if cara == "north" and w >= 4 and h >= 3:
        im.putpixel((1, 1), hx("#101010"))
        im.putpixel((w - 2, 1), hx("#101010"))
    return im


# --- Alfombra voladora (Terraria) ---
def alfombra(w, h, cara, rng):
    rojo = [hx("#b3262b"), hx("#c22d33"), hx("#a82227")]
    oro_c = hx("#e8b030")
    azul = hx("#1f3f9a")
    im = lienzo(w, h)
    px = im.load()
    for y in range(h):
        for x in range(w):
            c = rng.choice(rojo)
            if cara in ("up", "down"):
                if x <= 1 or x >= w - 2:
                    c = oro_c
                elif x in (3, w - 4):
                    c = azul
                else:
                    cx = w // 2
                    k = y % 6
                    if abs(x - cx) + abs(k - 3) == 2:
                        c = oro_c
                    elif abs(x - cx) + abs(k - 3) <= 1:
                        c = azul
            else:
                if y == 0:
                    c = oro_c
            px[x, y] = c
    return im


borla = ruido(["#e8b030", "#ffd966", "#c99a20"])


# --- Guardian anciano / guardian ---
def guardian_cuerpo(paleta, manchas, lineas):
    def m(w, h, cara, rng):
        im = ruido(paleta)(w, h, cara, rng)
        px = im.load()
        for _ in range(max(1, (w * h) // 40)):
            x0, y0 = rng.randrange(w), rng.randrange(h)
            for dy in range(rng.randint(1, 3)):
                for dx in range(rng.randint(1, 4)):
                    if 0 <= x0 + dx < w and 0 <= y0 + dy < h:
                        px[x0 + dx, y0 + dy] = hx(rng.choice(manchas))
        for y in range(h):
            for x in range(w):
                if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                    px[x, y] = hx(lineas)
        return im
    return m


cuerpo_anciano = guardian_cuerpo(["#a8a597", "#9d9983", "#b6b2a1", "#bdbba8", "#948d7b"],
                                 ["#857e6a", "#b29fae", "#9b8c99"], "#7a735f")
cuerpo_guardian = guardian_cuerpo(["#5d7f75", "#4e7966", "#668980", "#6a9583", "#41715a"],
                                  ["#396552", "#e0884a", "#2d5947"], "#2d5947")
pua_anciano = ruido(["#d8cfb5", "#e8e0c8", "#bfb497", "#f2ead6"])
pua_guardian = ruido(["#e6c79a", "#d8a86a", "#f0dcb8", "#cf9a55"])


def ojo_guardian(marco):
    def m(w, h, cara, rng):
        im = ruido([marco])(w, h, cara, rng)
        if cara != "north":
            return im
        px = im.load()
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                px[x, y] = hx("#f2efe0") if (x + y) % 7 else hx("#e2ddc8")
        cx, cy = w // 2 - 1, h // 2 - 1
        for dy in range(2):
            for dx in range(2):
                px[cx + dx, cy + dy] = hx("#7a1f1f")
        px[cx, cy] = hx("#2b0f0f")
        return im
    return m


escotilla = con_borde(ruido(["#335b4c", "#2c4e41", "#3a6656"]), "#1f3b30")


# --- Cute Fishron (Terraria) ---
fishron_cuerpo = degradado(ruido(["#7fd6c7", "#6fcab9", "#88dfd0", "#7fd6c7", "#4fa898"]), 1.1, 0.85)
fishron_panza = ruido(["#f4e7c3", "#ead9ad", "#f8eed2"])
fishron_rosa = con_borde(ruido(["#f28bb3", "#e8769f", "#f7a3c4"]), "#c9557f")


def fishron_hocico(w, h, cara, rng):
    im = ruido(["#f7a3c4", "#f28bb3"])(w, h, cara, rng)
    if cara == "north" and w >= 5 and h >= 3:
        im.putpixel((w // 2 - 2, h // 2), hx("#8a2c50"))
        im.putpixel((w // 2 + 1, h // 2), hx("#8a2c50"))
    return im


def ojo_grande(w, h, cara, rng):
    im = negro_ojo(w, h, cara, rng)
    if cara == "north" and w >= 3 and h >= 3:
        im.putpixel((1, 1), hx("#ffffff"))
        im.putpixel((w - 2, h - 2), hx("#bfe8ff"))
    return im


# ---------------------------------------------------------------------------
# Modelos (geometria bedrock 1.16.0 con UV por cara)
# ---------------------------------------------------------------------------
CARAS = ("north", "south", "east", "west", "up", "down")


class Modelo:
    def __init__(self, ident, bounds=(5, 4, 1.5)):
        self.ident = ident
        self.bones = []
        self.cubos = []
        self.bounds = bounds

    def hueso(self, nombre, padre=None, pivot=(0, 0, 0), rot=None):
        b = {"name": nombre, "pivot": list(pivot), "cubes": []}
        if padre:
            b["parent"] = padre
        if rot:
            b["rotation"] = list(rot)
        self.bones.append(b)
        return b

    def cubo(self, hueso, origen, tam, rol, caras=None, sin=()):
        c = {"hueso": hueso, "origin": list(origen), "size": list(tam),
             "rol": rol, "caras": caras or {}, "sin": set(sin)}
        self.cubos.append(c)
        return c


def tam_cara(c, cara):
    w, h, d = c["size"]
    return {"north": (w, h), "south": (w, h), "east": (d, h), "west": (d, h),
            "up": (w, d), "down": (w, d)}[cara]


def empaquetar(modelo):
    """Coloca cada cara en el atlas (empaquetado por estantes)."""
    caras = []
    for i, c in enumerate(modelo.cubos):
        for cara in CARAS:
            if cara in c["sin"]:
                continue
            w, h = tam_cara(c, cara)
            w, h = int(math.ceil(w)), int(math.ceil(h))
            if w <= 0 or h <= 0:
                continue
            caras.append((i, cara, w, h))
    orden = sorted(caras, key=lambda t: (-t[3], -t[2]))
    for ancho in (64, 128, 256, 512):
        pos, x, y, fila = {}, 0, 0, 0
        ok = True
        for (i, cara, w, h) in orden:
            if w > ancho:
                ok = False
                break
            if x + w > ancho:
                x, y = 0, y + fila
                fila = 0
            pos[(i, cara)] = (x, y, w, h)
            x += w
            fila = max(fila, h)
        alto = y + fila
        if ok and alto <= ancho:
            alto_p2 = 16
            while alto_p2 < alto:
                alto_p2 *= 2
            return pos, ancho, alto_p2
    raise RuntimeError("Modelo demasiado grande: " + modelo.ident)


def escribir_geometria(modelo, pos, tw, th, ruta):
    bones = []
    for b in modelo.bones:
        bb = {k: v for k, v in b.items() if k != "cubes"}
        cubes = []
        for i, c in enumerate(modelo.cubos):
            if c["hueso"] != b["name"]:
                continue
            uv = {}
            for cara in CARAS:
                if (i, cara) in pos:
                    x, y, w, h = pos[(i, cara)]
                    uv[cara] = {"uv": [x, y], "uv_size": [w, h]}
            cubes.append({"origin": c["origin"], "size": c["size"], "uv": uv})
        if cubes:
            bb["cubes"] = cubes
        bones.append(bb)
    bw, bh, boff = modelo.bounds
    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": modelo.ident,
                "texture_width": tw,
                "texture_height": th,
                "visible_bounds_width": bw,
                "visible_bounds_height": bh,
                "visible_bounds_offset": [0, boff, 0],
            },
            "bones": bones,
        }],
    }
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(geo, f, indent=1)


def pintar(modelo, pos, tw, th, roles, ruta, semilla):
    im = lienzo(tw, th)
    for i, c in enumerate(modelo.cubos):
        rng = random.Random(semilla * 1000 + i)
        for cara in CARAS:
            if (i, cara) not in pos:
                continue
            x, y, w, h = pos[(i, cara)]
            rol = c["caras"].get(cara, c["rol"])
            mat = roles[rol]
            im.paste(mat(w, h, cara, rng), (x, y))
    im.save(ruta)


def construir(modelo, skins, carpeta_geo, carpeta_tex, semilla):
    pos, tw, th = empaquetar(modelo)
    nombre = modelo.ident.split(".")[-1]
    escribir_geometria(modelo, pos, tw, th, os.path.join(carpeta_geo, nombre + ".geo.json"))
    for k, (tex, roles) in enumerate(skins):
        pintar(modelo, pos, tw, th, roles, os.path.join(carpeta_tex, tex + ".png"), semilla + k)


# --- Modelos de la montura de slime ---
def silla(m, padre, y, z0=-5):
    m.cubo(padre, [-5, y, z0], [10, 1, 9], "silla")
    m.cubo(padre, [-2, y + 1, z0], [4, 2, 2], "silla")
    m.cubo(padre, [-5, y + 1, z0 + 7], [10, 1, 2], "silla")


def slime_cubo():
    m = Modelo("geometry.quiquitapo.slime_cubo")
    m.hueso("root")
    m.hueso("body", "root")
    m.cubo("body", [-7, 4, -7], [14, 13, 14], "nucleo")
    m.cubo("body", [-5, 10, -7.5], [3, 3, 1], "ojo")
    m.cubo("body", [2, 10, -7.5], [3, 3, 1], "ojo")
    m.cubo("body", [-1, 6, -7.5], [2, 1, 1], "boca")
    m.cubo("body", [-12, 0, -12], [24, 22, 24], "slime")
    m.cubo("body", [-12.5, 0, -1.5], [25, 22.5, 3], "correa", sin=("down",))
    silla(m, "body", 22.5)
    return m


def slime_redondo(ident, extra=None):
    m = Modelo(ident)
    m.hueso("root")
    m.hueso("body", "root")
    if extra == "rey":
        m.cubo("body", [-4, 3, -4], [8, 9, 8], "ninja")
    m.cubo("body", [-12, 0, -12], [24, 10, 24], "slime")
    m.cubo("body", [-11, 10, -11], [22, 6, 22], "slime")
    m.cubo("body", [-9, 16, -9], [18, 4, 18], "slime")
    m.cubo("body", [-6, 20, -6], [12, 2, 12], "slime")
    m.cubo("body", [-6, 8, -12.6], [3, 5, 1], "ojo")
    m.cubo("body", [3, 8, -12.6], [3, 5, 1], "ojo")
    silla(m, "body", 22, -4)
    if extra == "rey":
        # corona del Rey Slime alrededor de la cima
        m.cubo("body", [-7, 21, -7], [14, 3, 1], "oro")
        m.cubo("body", [-7, 21, 6], [14, 3, 1], "oro")
        m.cubo("body", [-7, 21, -6], [1, 3, 12], "oro")
        m.cubo("body", [6, 21, -6], [1, 3, 12], "oro")
        for x in (-7, -1, 5):
            m.cubo("body", [x, 24, -7], [2, 2, 1], "oro")
            m.cubo("body", [x, 24, 6], [2, 2, 1], "oro")
        m.cubo("body", [-7, 24, -1], [1, 2, 2], "oro")
        m.cubo("body", [6, 24, -1], [1, 2, 2], "oro")
        m.cubo("body", [-1, 22, -7.6], [2, 2, 1], "rubi")
    if extra == "reina":
        m.cubo("body", [-1, 22, -8], [2, 5, 2], "cristal")
        m.cubo("body", [-4, 22, -7], [2, 3, 2], "cristal")
        m.cubo("body", [2, 22, -7], [2, 3, 2], "cristal")
        m.hueso("wing_l", "body", [-6, 14, 9], [0, -25, 0])
        m.cubo("wing_l", [-18, 10, 9], [12, 11, 0], "ala")
        m.hueso("wing_r", "body", [6, 14, 9], [0, 25, 0])
        m.cubo("wing_r", [6, 10, 9], [12, 11, 0], "ala")
    return m


# --- Modelos del barco volador ---
def barco_end():
    m = Modelo("geometry.quiquitapo.barco_end", (7, 6, 2))
    m.hueso("root")
    m.hueso("body", "root")
    m.cubo("body", [-10, 0, -20], [20, 2, 40], "purpur", caras={"up": "cubierta"})
    m.cubo("body", [-12, 0, -20], [2, 9, 40], "purpur")
    m.cubo("body", [10, 0, -20], [2, 9, 40], "purpur")
    m.cubo("body", [-10, 2, 18], [20, 7, 2], "purpur")
    m.cubo("body", [-9, 0, -26], [18, 9, 6], "purpur", caras={"up": "cubierta"})
    m.cubo("body", [-6, 1, -31], [12, 8, 5], "purpur", caras={"up": "cubierta"})
    m.cubo("body", [-11.5, 9, 17.5], [1, 8, 1], "vara")
    m.cubo("body", [10.5, 9, 17.5], [1, 8, 1], "vara")
    m.hueso("head", "body", [0, 9, -31])
    m.cubo("head", [-4, 9, -38], [8, 7, 8], "cabeza")
    m.cubo("head", [-3, 9, -44], [6, 4, 6], "hocico")
    m.cubo("head", [-3, 16, -33], [1, 3, 3], "cabeza")
    m.cubo("head", [2, 16, -33], [1, 3, 3], "cabeza")
    m.hueso("mast", "body", [0, 2, 6])
    m.cubo("mast", [-1.5, 2, 4.5], [3, 38, 3], "pilar")
    m.cubo("mast", [-11, 34, 5], [22, 2, 2], "pilar")
    m.hueso("flag_l", "mast", [-6, 34, 6.5])
    m.cubo("flag_l", [-10, 15, 6.5], [8, 19, 0], "estandarte")
    m.hueso("flag_r", "mast", [6, 34, 6.5])
    m.cubo("flag_r", [2, 15, 6.5], [8, 19, 0], "estandarte")
    return m


def ovni():
    m = Modelo("geometry.quiquitapo.ovni", (7, 5, 1.5))
    m.hueso("root")
    m.hueso("body", "root")
    m.cubo("body", [-8, 0, -8], [16, 1, 16], "brillo")
    m.cubo("body", [-15, 1, -15], [30, 3, 30], "oscuro")
    m.cubo("body", [-20, 4, -20], [40, 3, 40], "borde")
    m.cubo("body", [-15, 7, -15], [30, 2, 30], "metal")
    m.cubo("body", [-2, 9, 4], [4, 4, 3], "oscuro")
    m.cubo("body", [-10, 9, -10], [20, 12, 20], "vidrio")
    m.cubo("body", [-7, 21, -7], [14, 2, 14], "vidrio")
    m.hueso("ring", "body", [0, 5, 0])
    for ang in range(0, 360, 45):
        r = 19.5
        x = round(math.sin(math.radians(ang)) * r, 2)
        z = round(math.cos(math.radians(ang)) * r, 2)
        m.cubo("ring", [x - 1, 4.5, z - 1], [2, 2, 2], "luz")
    return m


def alfombra_voladora():
    m = Modelo("geometry.quiquitapo.alfombra", (6, 3, 0.5))
    m.hueso("root")
    m.hueso("body", "root")
    for k in range(6):
        z0 = -18 + k * 6
        m.hueso("seg%d" % k, "body", [0, 1, z0 + 3])
        m.cubo("seg%d" % k, [-12, 1, z0], [24, 1, 6], "alfombra")
    for x in range(-11, 12, 4):
        m.cubo("seg0", [x, 1, -19], [1, 1, 1], "borla")
        m.cubo("seg5", [x, 1, 18], [1, 1, 1], "borla")
    return m


# --- Modelos del submarino ---
def guardian_sub():
    m = Modelo("geometry.quiquitapo.guardian", (6, 4, 1.5))
    m.hueso("root")
    m.hueso("body", "root")
    m.cubo("body", [-12, 2, -14], [24, 20, 28], "cuerpo")
    m.cubo("body", [-4, 8, -15], [8, 8, 1], "ojo")
    m.cubo("body", [-5, 22, -4], [10, 1, 9], "escotilla")
    for (x, z) in ((-9, -9), (7, -9), (-9, 7), (7, 7)):
        m.cubo("body", [x, 22, z], [2, 6, 2], "pua")
    for z in (-6, 6):
        m.cubo("body", [-18, 11, z], [6, 2, 2], "pua")
        m.cubo("body", [12, 11, z], [6, 2, 2], "pua")
    for (x, y) in ((-10, 18), (8, 18), (-10, 5), (8, 5)):
        m.cubo("body", [x, y, -20], [2, 2, 6], "pua")
        m.cubo("body", [x, y, 14], [2, 2, 5], "pua")
    m.hueso("tail0", "body", [0, 12, 14])
    m.cubo("tail0", [-5, 7, 14], [10, 10, 10], "cuerpo")
    m.hueso("tail1", "tail0", [0, 12, 24])
    m.cubo("tail1", [-3.5, 8.5, 24], [7, 7, 10], "cuerpo")
    m.hueso("tail2", "tail1", [0, 12, 34])
    m.cubo("tail2", [-2, 10, 34], [4, 4, 8], "cuerpo")
    m.cubo("tail2", [0, 4, 38], [0, 16, 12], "pua")
    return m


def fishron():
    m = Modelo("geometry.quiquitapo.fishron", (6, 4, 1.5))
    m.hueso("root")
    m.hueso("body", "root")
    m.cubo("body", [-10, 3, -12], [20, 16, 26], "cuerpo")
    m.cubo("body", [-8, 2, -10], [16, 1, 22], "panza")
    m.cubo("body", [-4, 5, -17], [8, 6, 5], "hocico")
    m.cubo("body", [-9, 12, -12.6], [4, 4, 1], "ojo")
    m.cubo("body", [5, 12, -12.6], [4, 4, 1], "ojo")
    m.cubo("body", [-8, 19, -10], [3, 4, 4], "rosa")
    m.cubo("body", [5, 19, -10], [3, 4, 4], "rosa")
    m.cubo("body", [-1, 19, 4], [2, 7, 10], "rosa")
    m.cubo("body", [-5, 19, -4], [10, 1, 8], "silla")
    m.hueso("wing_l", "body", [-10, 10, -2])
    m.cubo("wing_l", [-21, 10, -7], [11, 1, 10], "rosa")
    m.hueso("wing_r", "body", [10, 10, -2])
    m.cubo("wing_r", [10, 10, -7], [11, 1, 10], "rosa")
    m.hueso("tail0", "body", [0, 11, 14])
    m.cubo("tail0", [-6, 6, 14], [12, 10, 8], "cuerpo")
    m.hueso("tail1", "tail0", [0, 11, 22])
    m.cubo("tail1", [-3, 8, 22], [6, 6, 6], "cuerpo")
    m.hueso("tail2", "tail1", [0, 11, 28])
    m.cubo("tail2", [-0.5, 3, 28], [1, 16, 8], "rosa")
    return m


# ---------------------------------------------------------------------------
# Iconos
# ---------------------------------------------------------------------------
def icono_slime():
    im = lienzo(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle([2, 5, 13, 14], fill=hx("#7bca62"), outline=hx("#3f7f32"))
    d.rectangle([3, 6, 12, 7], fill=hx("#9be082"))
    d.rectangle([5, 8, 10, 12], fill=hx("#5aaa43"))
    d.point([(6, 9), (9, 9)], fill=hx("#141414"))
    d.point([(7, 11), (8, 11)], fill=hx("#2a4f22"))
    d.rectangle([5, 3, 10, 5], fill=hx("#8b5a2b"), outline=hx("#5c3a18"))
    d.line([(10, 4), (12, 3), (13, 1)], fill=hx("#c8a46e"))
    d.point([(14, 1), (14, 2), (13, 3)], fill=hx("#9c7a48"))
    return im


def icono_barco():
    im = lienzo(16, 16)
    d = ImageDraw.Draw(im)
    d.line([(7, 1), (7, 10)], fill=hx("#906590"), width=1)
    d.point([(8, 1), (8, 10)], fill=hx("#ba95ba"))
    d.rectangle([9, 2, 12, 7], fill=hx("#c45ec4"), outline=hx("#8a2f8a"))
    d.point([(10, 4), (11, 4), (10, 5)], fill=hx("#1c1c1c"))
    d.polygon([(1, 10), (14, 10), (12, 13), (3, 13)], fill=hx("#b286b2"), outline=hx("#7d5a7d"))
    d.line([(2, 11), (13, 11)], fill=hx("#c7a8c7"))
    d.rectangle([0, 7, 2, 9], fill=hx("#1b1b1b"))
    d.point([(1, 7)], fill=hx("#cc00fa"))
    d.point([(5, 14), (8, 15), (11, 14)], fill=hx("#9be8ff"))
    return im


def icono_sub():
    im = lienzo(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle([2, 4, 11, 12], fill=hx("#b6b2a1"), outline=hx("#7a735f"))
    d.rectangle([4, 6, 9, 10], fill=hx("#f2efe0"))
    d.rectangle([6, 7, 7, 8], fill=hx("#7a1f1f"))
    for p in [(1, 3), (12, 3), (1, 13), (12, 13), (6, 2), (6, 14)]:
        d.point([p], fill=hx("#e8e0c8"))
    d.rectangle([12, 7, 13, 9], fill=hx("#9d9983"))
    d.point([(14, 6), (14, 10), (15, 5), (15, 11), (14, 8)], fill=hx("#e8e0c8"))
    d.point([(3, 1), (5, 0), (9, 1)], fill=hx("#9be8ff"))
    return im


def escalar(im, f):
    return im.resize((im.width * f, im.height * f), Image.NEAREST)


def icono_pack(con_texto_rp=False):
    im = lienzo(128, 128)
    px = im.load()
    for y in range(128):
        t = y / 127
        c = (int(70 + 80 * t), int(40 + 30 * t), int(140 - 30 * t), 255)
        for x in range(128):
            px[x, y] = c
    d = ImageDraw.Draw(im)
    d.rectangle([0, 104, 127, 127], fill=hx("#5aaa43"))
    d.rectangle([0, 104, 127, 107], fill=hx("#7bca62"))
    im.alpha_composite(escalar(icono_barco(), 4), (62, 4))
    im.alpha_composite(escalar(icono_sub(), 3), (6, 10))
    im.alpha_composite(escalar(icono_slime(), 4), (28, 50))
    d.rectangle([100, 110, 123, 123], fill=hx("#1c1c1c"))
    d.text((104, 111), "RP" if con_texto_rp else "BP", fill=hx("#ffffff"))
    return im


# ---------------------------------------------------------------------------
# Principal
# ---------------------------------------------------------------------------
def main():
    geo = os.path.join(RP, "models", "entity")
    tex = os.path.join(RP, "textures", "entity", "quiquitapo")
    items = os.path.join(RP, "textures", "items", "quiquitapo")
    for c in (geo, tex, items):
        os.makedirs(c, exist_ok=True)

    base_slime = {"ojo": ojo_brillo, "boca": boca, "silla": cuero, "correa": correa}
    construir(slime_cubo(), [("slime_vanilla", dict(base_slime, slime=slime_bloque, nucleo=slime_nucleo))],
              geo, tex, 10)
    construir(slime_redondo("geometry.quiquitapo.slime_redondo"),
              [("slime_azul", dict(base_slime, slime=slime_azul))], geo, tex, 20)
    construir(slime_redondo("geometry.quiquitapo.slime_rey", "rey"),
              [("slime_rey", dict(base_slime, slime=slime_rey, ninja=ninja, oro=oro, rubi=rubi))], geo, tex, 30)
    construir(slime_redondo("geometry.quiquitapo.slime_reina", "reina"),
              [("slime_reina", dict(base_slime, slime=slime_reina, cristal=cristal, ala=ala_rosa))], geo, tex, 40)

    construir(barco_end(), [("barco_end", {
        "purpur": purpur, "cubierta": cubierta, "vara": vara_end, "cabeza": dragon_cabeza,
        "hocico": hocico, "pilar": pilar_purpur, "estandarte": estandarte})], geo, tex, 50)
    construir(ovni(), [("ovni", {
        "brillo": brillo_verde, "oscuro": metal_oscuro, "borde": borde_luces, "metal": metal,
        "vidrio": vidrio, "luz": luz})], geo, tex, 60)
    construir(alfombra_voladora(), [("alfombra", {"alfombra": alfombra, "borla": borla})], geo, tex, 70)

    construir(guardian_sub(), [
        ("guardian_anciano", {"cuerpo": cuerpo_anciano, "ojo": ojo_guardian("#7a735f"),
                              "pua": pua_anciano, "escotilla": escotilla}),
        ("guardian", {"cuerpo": cuerpo_guardian, "ojo": ojo_guardian("#2d5947"),
                      "pua": pua_guardian, "escotilla": escotilla}),
    ], geo, tex, 80)
    construir(fishron(), [("fishron", {
        "cuerpo": fishron_cuerpo, "panza": fishron_panza, "hocico": fishron_hocico,
        "ojo": ojo_grande, "rosa": fishron_rosa, "silla": cuero})], geo, tex, 90)

    icono_slime().save(os.path.join(items, "montura_slime.png"))
    icono_barco().save(os.path.join(items, "montura_barco.png"))
    icono_sub().save(os.path.join(items, "montura_submarino.png"))
    icono_pack(False).save(os.path.join(BP, "pack_icon.png"))
    icono_pack(True).save(os.path.join(RP, "pack_icon.png"))

    empaquetar_addon()


def comprobar_json(carpeta):
    """Valida que todos los .json sean JSON estricto (Bedrock admite comentarios, aqui no)."""
    for raiz, _, archivos in os.walk(carpeta):
        for a in archivos:
            if a.endswith(".json"):
                with open(os.path.join(raiz, a), encoding="utf-8") as f:
                    json.load(f)


def empaquetar_addon():
    comprobar_json(BP)
    comprobar_json(RP)
    os.makedirs(DIST, exist_ok=True)
    salida = os.path.join(DIST, NOMBRE_ADDON + ".mcaddon")
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as z:
        for carpeta in (BP, RP):
            nombre = os.path.basename(carpeta)
            for raiz, _, archivos in os.walk(carpeta):
                for a in sorted(archivos):
                    ruta = os.path.join(raiz, a)
                    rel = os.path.relpath(ruta, carpeta)
                    info = zipfile.ZipInfo(os.path.join(nombre, rel).replace(os.sep, "/"),
                                           date_time=(2026, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    with open(ruta, "rb") as f:
                        z.writestr(info, f.read())
    print("Addon generado:", os.path.relpath(salida, RAIZ))


if __name__ == "__main__":
    main()
