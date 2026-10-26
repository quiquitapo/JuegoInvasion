"""Genera el logo, el banner y los pack_icon de MagicPowers By Quiquitapo.

Uso: python3 tools/generar_logo.py  (requiere Pillow; ejecutar después de generar_texturas.py)
"""
import math
import os
import random

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ITEMS = os.path.join(ROOT, "MagicPowers_RP", "textures", "items")
ELEMENTS = ["fire", "ice", "wind", "lightning", "gravity"]

FONT = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
    "I": ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "y": [".....", ".....", "#...#", "#...#", ".####", "....#", "####."],
    "u": [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".####"],
    "i": ["#", ".", "#", "#", "#", "#", "#"],
    "q": [".....", ".....", ".####", "#...#", ".####", "....#", "....#"],
    "t": [".#.", ".#.", "###", ".#.", ".#.", ".#.", "..#"],
    "a": [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
    "p": [".....", ".....", "####.", "#...#", "####.", "#....", "#...."],
    "o": [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
    " ": ["..", "..", "..", "..", "..", "..", ".."],
}


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + (c[3],)


def text_mask(text, spacing=2):
    """Devuelve lista de (x, y) de píxeles de fuente y el ancho total."""
    pts, x = [], 0
    for ch in text:
        g = FONT[ch]
        for y, row in enumerate(g):
            for gx, v in enumerate(row):
                if v == "#":
                    pts.append((x + gx, y))
        x += len(g[0]) + spacing
    return pts, x - spacing


def render_title(parts, sub=4, depth=3):
    """Texto en bloque estilo logo de Minecraft (relleno pétreo, extrusión y contorno).

    parts: lista de (texto, (claro, medio, oscuro)). Devuelve imagen en resolución 'texel'.
    """
    rnd = random.Random(42)
    layout, x0 = [], 0
    for text, pal in parts:
        pts, w = text_mask(text)
        layout.append((pts, x0, tuple(hexc(c) for c in pal)))
        x0 += w + 3
    width_fp = x0 - 3
    pad = 3
    W = (width_fp + pad * 2) * sub + depth
    H = (7 + pad * 2) * sub + depth
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cells = {}
    for pts, ox, pal in layout:
        for (x, y) in pts:
            cells[(x + ox + pad, y + pad)] = pal
    # 1) contorno + extrusión (abajo-derecha)
    solid = Image.new("L", (W, H), 0)
    for (x, y), pal in cells.items():
        for d in range(depth + 1):
            for yy in range(sub):
                for xx in range(sub):
                    px, py = x * sub + xx + d, y * sub + yy + d
                    if px < W and py < H:
                        solid.putpixel((px, py), 255)
    outline = solid.filter(ImageFilter.MaxFilter(3))
    black = Image.new("RGBA", (W, H), hexc("#120818"))
    img.paste(black, (0, 0), outline)
    for (x, y), pal in cells.items():
        side = shade(pal[2], 0.55)
        for d in range(1, depth + 1):
            for yy in range(sub):
                for xx in range(sub):
                    px, py = x * sub + xx + d, y * sub + yy + d
                    if px < W and py < H:
                        img.putpixel((px, py), shade(side, 1.0 - 0.25 * d / (depth)))
    # 2) cara frontal con degradado vertical y textura de piedra
    for (x, y), pal in cells.items():
        for yy in range(sub):
            for xx in range(sub):
                t = (y * sub + yy) / (7 * sub - 1)
                base = mix(pal[0], pal[1], t * 2) if t < 0.5 else mix(pal[1], pal[2], (t - 0.5) * 2)
                f = rnd.choice([0.9, 0.96, 1.0, 1.0, 1.05, 1.1])
                img.putpixel((x * sub + xx, y * sub + yy), shade(base, f))
        # brillo en el borde superior de cada bloque si no tiene vecino arriba
        if (x, y - 1) not in cells:
            for xx in range(sub):
                img.putpixel((x * sub + xx, y * sub), shade(pal[0], 1.15))
    return img


def render_small(text, color, shadow, scale=1):
    pts, w = text_mask(text)
    img = Image.new("RGBA", (w + 1, 8), (0, 0, 0, 0))
    for x, y in pts:
        img.putpixel((x + 1, y + 1), shadow)
    for x, y in pts:
        img.putpixel((x, y), color)
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


def starry_background(w, h, seed=3, c_center="#3b1f63", c_edge="#0d0716", levels=6):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (w, h))
    cc, ce = hexc(c_center), hexc(c_edge)
    cx, cy = w / 2, h * 0.45
    maxd = math.hypot(cx, cy)
    for y in range(h):
        for x in range(w):
            t = min(1.0, math.hypot(x - cx, (y - cy) * 1.3) / maxd)
            t = round(t * levels) / levels  # bandas estilo pixel-art
            img.putpixel((x, y), mix(cc, ce, t))
    for _ in range(int(w * h / 90)):
        x, y = rnd.randrange(w), rnd.randrange(h)
        img.putpixel((x, y), rnd.choice([hexc("#ffffff"), hexc("#cdb8ff"), hexc("#fff3b0")]))
    return img


def glow(img, center, radius, color, strength=0.55):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    cx, cy = center
    for y in range(max(0, int(cy - radius)), min(img.height, int(cy + radius) + 1)):
        for x in range(max(0, int(cx - radius)), min(img.width, int(cx + radius) + 1)):
            d = math.hypot(x - cx, y - cy) / radius
            if d < 1:
                a = int(255 * strength * (1 - d) ** 2)
                layer.putpixel((x, y), color[:3] + (a,))
    img.alpha_composite(layer)


ORB_COLORS = {
    "fire": ("#ffd23f", "#ff7a1c", "#a3271c"),
    "ice": ("#ffffff", "#7fdcff", "#2f6fae"),
    "wind": ("#ffffff", "#bff5e3", "#3f8f7a"),
    "lightning": ("#fffbd0", "#ffd400", "#8a6a00"),
    "gravity": ("#f0d6ff", "#b267f0", "#3a1660"),
}


def orb(r, el):
    light, mid, dark = (hexc(c) for c in ORB_COLORS[el])
    size = r * 2 + 1
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            dx, dy = x - r, y - r
            d = math.hypot(dx, dy)
            if d <= r + 0.3:
                if d > r - 0.8:
                    c = shade(dark, 0.6)
                else:
                    t = math.hypot(dx + r * 0.35, dy + r * 0.35) / (r * 1.6)
                    t = round(min(1, t) * 4) / 4
                    c = mix(light, mid, t * 1.6) if t < 0.6 else mix(mid, dark, (t - 0.6) * 2.5)
                img.putpixel((x, y), c)
    img.putpixel((r - r // 2, r - r // 2), hexc("#ffffff"))
    return img


def pack_icon():
    S = 64
    img = starry_background(S, S, seed=11)
    glow(img, (32, 40), 26, hexc("#b267f0"), 0.5)
    book = Image.open(os.path.join(ITEMS, "mp_book_gravity.png"))
    # libro maestro: tapa morada con estrella dorada
    master = book.copy()
    star = ["...g....", "...g....", "..gWg...", "ggWWWgg.", ".gWWWg..", ".gg.gg..", ".g...g..", "........"]
    for y in range(8):
        for x in range(8):
            px = master.getpixel((4 + x, 4 + y))
            if star[y][x] == "g":
                master.putpixel((4 + x, 4 + y), hexc("#f8d34a"))
            elif star[y][x] == "W":
                master.putpixel((4 + x, 4 + y), hexc("#fff6c2"))
            else:
                master.putpixel((4 + x, 4 + y), hexc("#4b2470") if px[3] else px)
    big = master.resize((32, 32), Image.NEAREST)
    img.alpha_composite(big, (16, 27))
    # orbes en arco
    for i, el in enumerate(ELEMENTS):
        ang = math.radians(200 + i * 35)
        cx = 32 + math.cos(ang) * 24
        cy = 33 + math.sin(ang) * 22
        glow(img, (cx, cy), 8, hexc(ORB_COLORS[el][1]), 0.6)
        o = orb(4, el)
        img.alpha_composite(o, (int(round(cx - 4)), int(round(cy - 4))))
    # marco
    for i in range(S):
        for p in ((i, 0), (i, S - 1), (0, i), (S - 1, i)):
            img.putpixel(p, hexc("#120818"))
    return img.resize((256, 256), Image.NEAREST)


def logo():
    title = render_title([
        ("MAGIC", ("#f1dcff", "#b06ef0", "#5b2a86")),
        ("POWERS", ("#fff1b8", "#f2b632", "#a8691a")),
    ], sub=4, depth=3)
    scale = 3
    title = title.resize((title.width * scale, title.height * scale), Image.NEAREST)
    splash = render_small("BY QUIQUITAPO", hexc("#ffff55"), hexc("#3f3f15"), scale=4)
    splash = splash.rotate(12, resample=Image.NEAREST, expand=True)
    books_h = 64
    W = title.width + 40
    H = title.height + books_h + 30
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    img.alpha_composite(title, (20, 0))
    # fila de libros centrada bajo el título
    gap = 18
    row_w = (len(ELEMENTS) + 1) * books_h + len(ELEMENTS) * gap
    x = (W - row_w) // 2
    for el in ELEMENTS + ["arcane"]:
        b = Image.open(os.path.join(ITEMS, f"mp_book_{el}.png")).resize((books_h, books_h), Image.NEAREST)
        img.alpha_composite(b, (x, title.height + 6))
        x += books_h + gap
    # texto "splash" amarillo, como en la pantalla de título de Minecraft
    img.alpha_composite(splash, (W - splash.width - 2, title.height - splash.height + 6))
    return img


def banner(lg):
    W, H = 640, 360
    bg = starry_background(W // 4, H // 4, seed=5).resize((W, H), Image.NEAREST)
    glow(bg, (W / 2, H * 0.62), 220, hexc("#b267f0"), 0.35)
    lg = lg.copy()
    f = min((W - 40) / lg.width, (H - 60) / lg.height)
    lg = lg.resize((int(lg.width * f), int(lg.height * f)), Image.NEAREST)
    bg.alpha_composite(lg, ((W - lg.width) // 2, (H - lg.height) // 2 - 6))
    return bg.resize((W * 2, H * 2), Image.NEAREST)


def main():
    arte = os.path.join(ROOT, "arte")
    os.makedirs(arte, exist_ok=True)
    icon = pack_icon()
    for pack in ("MagicPowers_BP", "MagicPowers_RP"):
        icon.save(os.path.join(ROOT, pack, "pack_icon.png"))
    icon.save(os.path.join(arte, "pack_icon.png"))
    lg = logo()
    lg.save(os.path.join(arte, "logo.png"))
    banner(lg).save(os.path.join(arte, "banner.png"))
    print("Logo, banner e iconos generados en", os.path.normpath(arte))


if __name__ == "__main__":
    main()
