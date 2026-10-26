"""Empaqueta MagicPowers en un .mcaddon (BP + RP) listo para importar en Minecraft.

Uso: python3 tools/empaquetar.py   ->  dist/MagicPowers_By_Quiquitapo.mcaddon
"""
import os
import zipfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PACKS = ["MagicPowers_BP", "MagicPowers_RP"]
OUT = os.path.join(ROOT, "dist", "MagicPowers_By_Quiquitapo.mcaddon")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for pack in PACKS:
            base = os.path.join(ROOT, pack)
            for folder, _, files in os.walk(base):
                for name in sorted(files):
                    path = os.path.join(folder, name)
                    z.write(path, os.path.join(pack, os.path.relpath(path, base)))
    print("Creado", OUT, f"({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
