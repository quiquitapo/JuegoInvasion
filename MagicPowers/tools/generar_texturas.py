"""Genera las texturas pixel-art (estilo vanilla) de MagicPowers.

Uso: python3 tools/generar_texturas.py  (requiere Pillow)
"""
import os
import random

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RP = os.path.join(ROOT, "MagicPowers_RP", "textures")


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + (c[3],)


def grid_image(rows, palette):
    img = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), palette[ch])
    return img


# ---------------------------------------------------------------------------
# Libros (16x16)
# ---------------------------------------------------------------------------
# o = contorno, S = lomo, C = tapa, p = hojas, P = hojas sombra, g = oro, G = oro oscuro
BOOK = [
    "................",
    ".ooooooooooooo..",
    ".oSSgCCCCCCgGoo.",
    ".oSSCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".ogGCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".oSSCCCCCCCCCopo",
    ".ogGCCCCCCCCCopo",
    ".oSSgCCCCCCgGopo",
    ".ooooooooooooopo",
    "..oPPPPPPPPPPPPo",
    "...ooooooooooooo",
]

# Emblemas 8x8 (se colocan en x=4..11, y=4..11)
EMBLEMS = {
    "fire": [
        "...y....",
        "...yy...",
        "..yoy..y",
        ".yoory.y",
        ".yorWoyo",
        "yorWWrrr",
        "rorWWor.",
        ".rrrrr..",
    ],
    "ice": [
        "...w....",
        ".w.W.w..",
        "..wWw...",
        "wWWBWWw.",
        "..wWw...",
        ".w.W.w..",
        "...w....",
        "........",
    ],
    "wind": [
        "wwwwwww.",
        ".WWWWW..",
        "..wwwww.",
        "...WWW..",
        "....ww..",
        "...WW...",
        "....W...",
        "...W....",
    ],
    "lightning": [
        "....YW..",
        "...YW...",
        "..YW....",
        ".YWWWY..",
        "...WY...",
        "..WY....",
        ".WY.....",
        ".Y......",
    ],
    "gravity": [
        "........",
        "..vvvv..",
        ".vbBBbv.",
        "vVbbbbVv",
        "vVbbbbVv",
        ".vbbbbv.",
        "..vvvv..",
        "........",
    ],
    "arcane": [
        "..gggg..",
        ".g....g.",
        "g..WW..g",
        "g.WllW.g",
        "g.WllW.g",
        "g..WW..g",
        ".g....g.",
        "..gggg..",
    ],
}

BOOKS = {
    # tapa, emblema
    "fire": ("#a3271c", {"y": hexc("#ffd23f"), "o": hexc("#ff8a1c"), "r": hexc("#e0391b"), "W": hexc("#fff6c2")}),
    "ice": ("#2f6fae", {"w": hexc("#bff1ff"), "W": hexc("#ffffff"), "B": hexc("#6fd3ff")}),
    "wind": ("#3f8f7a", {"w": hexc("#ffffff"), "W": hexc("#c9f5e6")}),
    "lightning": ("#3a2f73", {"Y": hexc("#ffd400"), "W": hexc("#fffbd0")}),
    "gravity": ("#4b2470", {"v": hexc("#d18cff"), "V": hexc("#a24fe8"), "b": hexc("#120a1c"), "B": hexc("#5e3a85")}),
    # Libro Mágico Vacío: tapa gris pizarra con un círculo rúnico dorado
    "arcane": ("#4d4a63", {"g": hexc("#f8d34a"), "W": hexc("#c9a8ff"), "l": hexc("#f4ecff")}),
}


def make_book(el):
    cover_hex, epal = BOOKS[el]
    cover = hexc(cover_hex)
    pal = {
        "o": shade(cover, 0.30),
        "S": shade(cover, 0.62),
        "C": cover,
        "p": hexc("#f1e6c8"),
        "P": hexc("#c9b98f"),
        "g": hexc("#f8d34a"),
        "G": hexc("#b8892a"),
    }
    img = grid_image(BOOK, pal)
    rnd = random.Random(el)
    # Ruido sutil y luz superior izquierda (aspecto vanilla)
    for y in range(16):
        for x in range(16):
            if BOOK[y][x] == "C":
                f = 1.0 + rnd.uniform(-0.06, 0.06)
                f += 0.10 if (x + y) < 9 else (-0.08 if (x + y) > 20 else 0)
                img.putpixel((x, y), shade(cover, f))
    # borde interior de la tapa (marco)
    for x in range(5, 12):
        for y in (3, 11):
            if BOOK[y][x] == "C":
                img.putpixel((x, y), shade(cover, 0.78))
    for y in range(3, 12):
        if BOOK[y][12] == "C":
            img.putpixel((12, y), shade(cover, 0.78))
    emb = grid_image(EMBLEMS[el], epal)
    img.alpha_composite(emb, (4, 4))
    return img


# ---------------------------------------------------------------------------
# Partículas
# ---------------------------------------------------------------------------
FLAME_FRAMES = [
    [
        "...y....",
        "..yy....",
        "..yWy...",
        ".yWWyy..",
        ".yWWWy..",
        ".oyWyo..",
        "..ooo...",
        "........",
    ],
    [
        "........",
        "...y....",
        "..yyo...",
        "..yWyo..",
        ".oyWyo..",
        ".ooyoo..",
        "..rrr...",
        "........",
    ],
    [
        "........",
        "........",
        "...o....",
        "..ooo...",
        "..oyor..",
        "..rorr..",
        "...rr...",
        "........",
    ],
    [
        "........",
        "........",
        "........",
        "...r....",
        "..rdr...",
        "..ddd...",
        "........",
        "........",
    ],
]
FLAME_PAL = {"W": hexc("#fffbe0"), "y": hexc("#ffd23f"), "o": hexc("#ff8a1c"),
             "r": hexc("#d8381a"), "d": hexc("#5a2a1a", 200)}

FROST = [
    "...w....",
    ".w.W.w..",
    "..wWw...",
    "wWWBWWw.",
    "..wWw...",
    ".w.W.w..",
    "...w....",
    "........",
]
SPARK = [
    "...W....",
    "...W....",
    "..cWc...",
    "WWWWWWW.",
    "..cWc...",
    "...W....",
    "...W....",
    "........",
]
WIND = [
    "..wwww..",
    ".w....w.",
    "w..ww..w",
    "w.w..w.w",
    "w.w.w..w",
    "w..w..w.",
    ".w...w..",
    "..www...",
]
GRAVITY = [
    "..vvvv..",
    ".vVVVVv.",
    "vVbbbbVv",
    "vVbBbbVv",
    "vVbbbbVv",
    "vVbbbbVv",
    ".vVVVVv.",
    "..vvvv..",
]
STAR = [
    "...y....",
    "...y....",
    "..yWy...",
    "yyWWWyy.",
    "..yWy...",
    ".y...y..",
    "........",
    "........",
]


def make_particles():
    frames = Image.new("RGBA", (32, 8), (0, 0, 0, 0))
    for i, fr in enumerate(FLAME_FRAMES):
        frames.alpha_composite(grid_image(fr, FLAME_PAL), (i * 8, 0))
    out = os.path.join(RP, "particle")
    frames.save(os.path.join(out, "mp_flame.png"))
    grid_image(FROST, {"w": hexc("#bff1ff"), "W": hexc("#ffffff"), "B": hexc("#6fd3ff")}).save(
        os.path.join(out, "mp_frost.png"))
    grid_image(SPARK, {"W": hexc("#fffde0"), "c": hexc("#6ff3ff")}).save(os.path.join(out, "mp_spark.png"))
    grid_image(WIND, {"w": hexc("#ffffff", 220)}).save(os.path.join(out, "mp_wind.png"))
    grid_image(GRAVITY, {"v": hexc("#d18cff"), "V": hexc("#8f3ad6"), "b": hexc("#1a0b2a"),
                         "B": hexc("#ffffff")}).save(os.path.join(out, "mp_gravity.png"))
    grid_image(STAR, {"y": hexc("#ffd23f"), "W": hexc("#ffffff")}).save(os.path.join(out, "mp_star.png"))


PLASMA = [
    "..cccc..",
    ".cWWWWc.",
    "cWWwwWWc",
    "cWwwwwWc",
    "cWwwwwWc",
    "cWWwwWWc",
    ".cWWWWc.",
    "..cccc..",
]
ICE_SPIKE = [
    "...W....",
    "...W....",
    "...Ww...",
    "..bWw...",
    "..bWw...",
    "..bWwb..",
    "..bWwb..",
    ".bbWwb..",
    ".bbWwbb.",
    ".bBWwbb.",
    ".bBWwBb.",
    ".bBWwBb.",
    "bbBWwBbb",
    "bbBWwBbb",
    "bBBWwBBb",
    "bBBWwBBb",
]


def make_extra_particles():
    out = os.path.join(RP, "particle")
    grid_image(PLASMA, {"c": hexc("#3fd8ff", 170), "W": hexc("#bff6ff"), "w": hexc("#ffffff")}).save(
        os.path.join(out, "mp_plasma.png"))
    grid_image(ICE_SPIKE, {"W": hexc("#ffffff", 235), "w": hexc("#d8f6ff", 230), "b": hexc("#7fd3ff", 220),
                           "B": hexc("#4aa8e8", 220)}).save(os.path.join(out, "mp_ice_spike.png"))


def make_boulder():
    """Textura 64x32 de la Roca Colosal: piedra oscura con grietas y vetas moradas."""
    rnd = random.Random(21)
    img = Image.new("RGBA", (64, 32))
    base = hexc("#6e6a72")
    for y in range(32):
        for x in range(64):
            img.putpixel((x, y), shade(base, rnd.choice([0.72, 0.84, 0.95, 1.0, 1.0, 1.08, 1.15])))
    for _ in range(12):  # grietas
        x, y = rnd.randrange(64), rnd.randrange(32)
        for _ in range(rnd.randint(3, 6)):
            img.putpixel((x % 64, y % 32), hexc("#2e2a33"))
            x += rnd.choice([-1, 0, 1])
            y += rnd.choice([0, 1])
    for _ in range(48):  # vetas de energía gravitatoria
        img.putpixel((rnd.randrange(64), rnd.randrange(32)), rnd.choice([hexc("#b77ef0"), hexc("#d9b3ff")]))
    img.save(os.path.join(RP, "entity", "mp_boulder.png"))


def make_pebble():
    rnd = random.Random(7)
    img = Image.new("RGBA", (16, 16))
    base = hexc("#7d7d82")
    for y in range(16):
        for x in range(16):
            f = rnd.choice([0.78, 0.88, 1.0, 1.0, 1.08, 1.16])
            img.putpixel((x, y), shade(base, f))
    for _ in range(10):  # vetas moradas: piedra cargada de magia
        img.putpixel((rnd.randrange(16), rnd.randrange(16)), hexc("#b77ef0"))
    img.save(os.path.join(RP, "entity", "mp_pebble.png"))


def make_hud_slot():
    """Marco 20x20 estilo casilla de la barra rápida vanilla."""
    img = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    for y in range(20):
        for x in range(20):
            edge = x in (0, 19) or y in (0, 19)
            inner = x in (1, 18) or y in (1, 18)
            if edge:
                c = hexc("#1b1b1b", 230)
            elif inner:
                c = hexc("#8b8b8b", 230) if (x == 1 or y == 1) else hexc("#373737", 230)
            else:
                c = hexc("#4a4a4a", 170)
            img.putpixel((x, y), c)
    img.save(os.path.join(RP, "ui", "mp_hud_slot.png"))


def main():
    for d in ("items", "particle", "entity", "ui"):
        os.makedirs(os.path.join(RP, d), exist_ok=True)
    for el in BOOKS:
        make_book(el).save(os.path.join(RP, "items", f"mp_book_{el}.png"))
    make_particles()
    make_pebble()
    make_boulder()
    make_extra_particles()
    make_hud_slot()
    print("Texturas generadas en", os.path.normpath(RP))


if __name__ == "__main__":
    main()
