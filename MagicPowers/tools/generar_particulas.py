"""Genera los archivos de partículas del Resource Pack de MagicPowers.

Uso: python3 tools/generar_particulas.py  (desde la carpeta MagicPowers)
"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "MagicPowers_RP", "particles")
FADE = "1 - (variable.particle_age / variable.particle_lifetime)"
SHRINK = "(1 - 0.7 * variable.particle_age / variable.particle_lifetime)"


def particle(name, texture, tex_size, count, radius, speed, lifetime, size,
             accel=(0, 0, 0), drag=0.0, frames=1, spin=0, color=(1, 1, 1)):
    tw, th = tex_size
    uv = {"texture_width": tw, "texture_height": th, "uv": [0, 0], "uv_size": [th, th]}
    if frames > 1:
        uv["flipbook"] = {
            "base_UV": [0, 0],
            "size_UV": [th, th],
            "step_UV": [th, 0],
            "max_frame": frames,
            "stretch_to_lifetime": True,
        }
    sz = f"({size} + variable.particle_random_2 * {size * 0.5:.3f}) * {SHRINK}"
    comps = {
        "minecraft:emitter_rate_instant": {"num_particles": count},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_sphere": {"radius": radius, "direction": "outwards"},
        "minecraft:particle_initial_speed": f"{speed} * (0.6 + variable.particle_random_3 * 0.8)",
        "minecraft:particle_lifetime_expression": {
            "max_lifetime": f"{lifetime[0]} + variable.particle_random_1 * {lifetime[1] - lifetime[0]:.2f}"
        },
        "minecraft:particle_motion_dynamic": {
            "linear_acceleration": list(accel),
            "linear_drag_coefficient": drag,
        },
        "minecraft:particle_appearance_billboard": {
            "size": [sz, sz],
            "facing_camera_mode": "rotate_xyz",
            "uv": uv,
        },
        "minecraft:particle_appearance_tinting": {"color": [*color, FADE]},
    }
    if spin:
        comps["minecraft:particle_initial_spin"] = {
            "rotation": "variable.particle_random_4 * 360",
            "rotation_rate": spin,
        }
    data = {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": f"magicpowers:{name}",
                "basic_render_parameters": {
                    "material": "particles_blend",
                    "texture": f"textures/particle/{texture}",
                },
            },
            "components": comps,
        },
    }
    with open(os.path.join(OUT, f"{name}.particle.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def ice_spike():
    """Estaca de hielo vertical que brota del suelo (sprite que solo gira en Y)."""
    grow = "math.min(1, variable.particle_age * 7)"
    data = {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": "magicpowers:ice_spike",
                "basic_render_parameters": {"material": "particles_blend", "texture": "textures/particle/mp_ice_spike"},
            },
            "components": {
                "minecraft:emitter_rate_instant": {"num_particles": 1},
                "minecraft:emitter_lifetime_once": {"active_time": 0.05},
                "minecraft:emitter_shape_point": {"offset": [0, 0, 0]},
                # La base queda en el suelo mientras la estaca crece hacia arriba.
                "minecraft:particle_motion_parametric": {"relative_position": [0, f"0.95 * {grow}", 0]},
                "minecraft:particle_lifetime_expression": {"max_lifetime": "0.9 + variable.particle_random_1 * 0.3"},
                "minecraft:particle_appearance_billboard": {
                    "size": [f"0.4 * {grow}", f"0.95 * {grow}"],
                    "facing_camera_mode": "lookat_y",
                    "uv": {"texture_width": 8, "texture_height": 16, "uv": [0, 0], "uv_size": [8, 16]},
                },
                "minecraft:particle_appearance_tinting": {
                    "color": [1, 1, 1, "math.clamp((variable.particle_lifetime - variable.particle_age) / 0.3, 0, 1)"]
                },
            },
        },
    }
    with open(os.path.join(OUT, "ice_spike.particle.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


os.makedirs(OUT, exist_ok=True)
# Fuego
particle("flame", "mp_flame", (32, 8), 3, 0.15, 0.5, (0.35, 0.65), 0.22, accel=(0, 1.6, 0), drag=2.5, frames=4)
particle("fire_burst", "mp_flame", (32, 8), 26, 0.6, 5.0, (0.4, 0.9), 0.3, accel=(0, 1.2, 0), drag=4.5, frames=4)
# Hielo
particle("frost", "mp_frost", (8, 8), 2, 0.2, 0.3, (0.5, 0.9), 0.14, accel=(0, -0.8, 0), drag=1.5, spin=180)
particle("frost_burst", "mp_frost", (8, 8), 22, 0.5, 4.0, (0.5, 1.0), 0.18, accel=(0, -1.5, 0), drag=3.5, spin=240)
# Viento
particle("wind", "mp_wind", (8, 8), 1, 0.1, 0.25, (0.35, 0.6), 0.32, drag=1.0, spin=-360, color=(1, 1, 1))
# Electricidad
particle("spark", "mp_spark", (8, 8), 1, 0.04, 0.05, (0.12, 0.25), 0.16, spin=720)
particle("spark_burst", "mp_spark", (8, 8), 14, 0.3, 3.5, (0.2, 0.45), 0.16, drag=5.0, spin=720)
# Gravedad
particle("gravity", "mp_gravity", (8, 8), 1, 0.1, 0.1, (0.4, 0.7), 0.18, drag=1.0, spin=90)
particle("gravity_burst", "mp_gravity", (8, 8), 18, 0.4, 4.0, (0.4, 0.8), 0.2, accel=(0, -2.0, 0), drag=4.0, spin=180)
particle("snowfall", "mp_frost", (8, 8), 1, 0.1, 0.2, (0.9, 1.4), 0.13, accel=(0, -3.0, 0), drag=1.5, spin=120)
particle("plasma", "mp_plasma", (8, 8), 1, 0.0, 0.0, (0.1, 0.15), 0.42, spin=360)
ice_spike()
# Subida de nivel
particle("levelup", "mp_star", (8, 8), 30, 0.6, 2.5, (0.8, 1.4), 0.16, accel=(0, 1.0, 0), drag=2.0, spin=200)
print("Partículas generadas en", os.path.normpath(OUT))
