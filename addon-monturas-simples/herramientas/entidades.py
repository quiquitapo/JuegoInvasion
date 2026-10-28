#!/usr/bin/env python3
"""Genera los JSON de comportamiento de las 3 monturas (comparten mucha base)."""
import copy
import json
import os

BP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Monturas_Simples_BP", "entities")

SIN_JINETE = {"test": "rider_count", "subject": "self", "operator": "equals", "value": 0}


def base(familia, ancho, alto, asiento, skins):
    return {
        "description_props": {
            "quiquitapo:skin": {"type": "int", "range": [0, skins - 1], "default": 0, "client_sync": True},
            "quiquitapo:velocidad": {"type": "int", "range": [0, 1], "default": 0, "client_sync": True},
        },
        "components": {
            "minecraft:type_family": {"family": ["quiquitapo_montura", familia, "inanimate"]},
            "minecraft:collision_box": {"width": ancho, "height": alto},
            "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": True},
            "minecraft:knockback_resistance": {"value": 1.0},
            "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0,
                                     "breathes_air": True, "breathes_water": True},
            "minecraft:nameable": {},
            "minecraft:persistent": {},
            "minecraft:conditional_bandwidth_optimization": {},
            "minecraft:hurt_on_condition": {"damage_conditions": [
                {"filters": {"test": "in_lava", "subject": "self", "operator": "==", "value": True},
                 "cause": "lava", "damage_per_tick": 4}]},
            # Los mobs no pueden danar la montura vacia: solo los jugadores (para romperla)
            # o el entorno. Con alguien montado se la puede atacar normalmente.
            "minecraft:damage_sensor": {"triggers": [
                {"cause": "fall", "deals_damage": "no"},
                {"cause": "fly_into_wall", "deals_damage": "no"},
                {"on_damage": {"filters": {"all_of": [
                    SIN_JINETE,
                    {"test": "is_family", "subject": "other", "operator": "not", "value": "player"}]}},
                 "deals_damage": "no"},
                {"cause": "entity_explosion", "on_damage": {"filters": SIN_JINETE}, "deals_damage": "no"},
                {"cause": "block_explosion", "on_damage": {"filters": SIN_JINETE}, "deals_damage": "no"},
            ]},
            # Agacharse + interactuar = recoger la montura (lo gestiona el script).
            "minecraft:interact": {"interactions": [{
                "on_interact": {
                    "filters": {"all_of": [
                        {"test": "is_sneak_held", "subject": "other", "value": True}, SIN_JINETE]},
                    "event": "quiquitapo:recoger", "target": "self"},
                "interact_text": "action.interact.quiquitapo.recoger"}]},
            "minecraft:rideable": {
                "seat_count": 1,
                "crouching_skip_interact": True,
                "pull_in_entities": False,
                "family_types": ["player"],
                "interact_text": "action.interact.quiquitapo.montar",
                "seats": {"position": [0.0, asiento, 0.0]},
            },
        },
        "component_groups": {
            "quiquitapo:vida_normal": {"minecraft:health": {"value": 30, "max": 30}},
            "quiquitapo:vida_blindaje": {"minecraft:health": {"value": 60, "max": 60}},
        },
        "events": {
            "quiquitapo:recoger": {},
            "quiquitapo:blindaje_on": {
                "remove": {"component_groups": ["quiquitapo:vida_normal"]},
                "add": {"component_groups": ["quiquitapo:vida_blindaje"]}},
            "quiquitapo:blindaje_off": {
                "remove": {"component_groups": ["quiquitapo:vida_blindaje"]},
                "add": {"component_groups": ["quiquitapo:vida_normal"]}},
            "quiquitapo:velocidad_normal": {"set_property": {"quiquitapo:velocidad": 0}},
            "quiquitapo:velocidad_alta": {"set_property": {"quiquitapo:velocidad": 1}},
        },
        "spawn_groups": ["quiquitapo:vida_normal"],
    }


def escribir(ident, d):
    props = d.pop("description_props")
    spawn = d.pop("spawn_groups")
    d["events"]["minecraft:entity_spawned"] = {"add": {"component_groups": spawn}}
    ent = {
        "format_version": "1.21.90",
        "minecraft:entity": {
            "description": {"identifier": ident, "is_spawnable": False, "is_summonable": True,
                            "properties": props},
            "component_groups": d["component_groups"],
            "components": d["components"],
            "events": d["events"],
        },
    }
    nombre = ident.split(":")[1] + ".json"
    with open(os.path.join(BP, nombre), "w", encoding="utf-8") as f:
        json.dump(ent, f, indent=2, ensure_ascii=False)


def slime():
    d = base("montura_slime", 1.5, 1.4, 1.15, 4)
    d["components"].update({
        "minecraft:physics": {},
        "minecraft:is_tamed": {},
        "minecraft:is_saddled": {},
        "minecraft:input_ground_controlled": {},
        "minecraft:can_power_jump": {},
        "minecraft:behavior.player_ride_tamed": {},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:navigation.walk": {},
    })
    g = d["component_groups"]
    g["quiquitapo:mov_normal"] = {"minecraft:movement": {"value": 0.28}}
    g["quiquitapo:mov_alto"] = {"minecraft:movement": {"value": 0.42}}
    g["quiquitapo:salto_normal"] = {"minecraft:horse.jump_strength": {"value": 1.1}}
    g["quiquitapo:salto_super"] = {"minecraft:horse.jump_strength": {"value": 1.6}}
    e = d["events"]
    e["quiquitapo:velocidad_normal"] = {
        "remove": {"component_groups": ["quiquitapo:mov_alto"]},
        "add": {"component_groups": ["quiquitapo:mov_normal"]},
        "set_property": {"quiquitapo:velocidad": 0}}
    e["quiquitapo:velocidad_alta"] = {
        "remove": {"component_groups": ["quiquitapo:mov_normal"]},
        "add": {"component_groups": ["quiquitapo:mov_alto"]},
        "set_property": {"quiquitapo:velocidad": 1}}
    e["quiquitapo:salto_normal"] = {
        "remove": {"component_groups": ["quiquitapo:salto_super"]},
        "add": {"component_groups": ["quiquitapo:salto_normal"]}}
    e["quiquitapo:salto_super"] = {
        "remove": {"component_groups": ["quiquitapo:salto_normal"]},
        "add": {"component_groups": ["quiquitapo:salto_super"]}}
    d["spawn_groups"] += ["quiquitapo:mov_normal", "quiquitapo:salto_normal"]
    escribir("quiquitapo:slime_montura", d)


def barco():
    d = base("montura_barco", 2.0, 1.0, 0.3, 3)
    d["components"].update({
        # El vuelo lo controla el script segun hacia donde mira el jinete.
        "minecraft:physics": {"has_gravity": False},
        "minecraft:can_fly": {},
        "minecraft:fire_immune": True,
    })
    escribir("quiquitapo:barco_volador", d)


def submarino():
    d = base("montura_submarino", 1.6, 1.5, 1.1, 3)
    g = d["component_groups"]
    # En el agua el script desactiva la gravedad para que flote quieto y se pilote en 3D.
    g["quiquitapo:en_agua"] = {"minecraft:physics": {"has_gravity": False}}
    g["quiquitapo:en_tierra"] = {"minecraft:physics": {}}
    e = d["events"]
    e["quiquitapo:en_agua"] = {
        "remove": {"component_groups": ["quiquitapo:en_tierra"]},
        "add": {"component_groups": ["quiquitapo:en_agua"]}}
    e["quiquitapo:en_tierra"] = {
        "remove": {"component_groups": ["quiquitapo:en_agua"]},
        "add": {"component_groups": ["quiquitapo:en_tierra"]}}
    d["spawn_groups"] += ["quiquitapo:en_tierra"]
    escribir("quiquitapo:submarino_guardian", d)


if __name__ == "__main__":
    os.makedirs(BP, exist_ok=True)
    slime()
    barco()
    submarino()
    print("Entidades generadas")
