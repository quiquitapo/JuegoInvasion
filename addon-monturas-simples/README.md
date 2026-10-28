# Monturas simples Por Quiquitapo

Addon para **Minecraft Bedrock** (1.21.90 o superior, sin experimentos) con tres monturas crafteables,
configurables y con skins de estilo vanilla y estilo **Terraria**.

📦 **Descarga directa:** [`dist/Monturas_simples_Por_Quiquitapo.mcaddon`](dist/Monturas_simples_Por_Quiquitapo.mcaddon)
(ábrelo y Minecraft importa los dos packs). Después activa **el pack de comportamiento**
(el de recursos se activa solo) en tu mundo.

---

## Las monturas

| Montura | Receta (mesa de crafteo) | Qué hace |
|---|---|---|
| 🟩 **Montura de Slime** (inspirada en el Rey Slime de Terraria) | 1 **bloque de slime** + 1 **correa** (sin forma) | Montura terrestre de **saltos gigantes**: mantén *saltar* para cargar la barra de salto, como con un caballo. El jinete no recibe daño de caída. |
| 🟪 **Barco Volador del End** | `M W M` / `P P P` → M = membrana de phantom, W = **carga de viento**, P = bloque de purpur | **Vuela** hacia donde miras. *Saltar* = subir. Lanzar una **carga de viento** mientras vuelas = impulso gratis. Si te bajas en el aire te da caída lenta. |
| 🟦 **Submarino Guardián** (diseño de Guardián Anciano) | `P C P` / `C S C` / `P P P` → P = prismarina, C = cristales de prismarina, S = esponja | **Nada** en 3D hacia donde miras. Mientras lo montas **respiras bajo el agua**. En tierra se arrastra despacio, como un guardián. |

## Cómo se usa

1. **Agáchate + usar** (clic derecho o mantener pulsado en móvil) con la montura en la mano → se abre el
   **menú de configuración**:
   - **Velocidad:** Normal o Alta (gratis).
   - **Skin:** elige el aspecto (ver tabla de abajo).
   - **Mejoras de pago:** se pagan **una sola vez** con **niveles de XP** y después puedes activarlas o desactivarlas
     cuando quieras (en modo creativo son gratis).
2. **Usar** (sin agacharte) → **lanzas** la montura delante de ti.
3. **Interactúa** con ella para **subirte**. Agáchate para bajarte.
4. **Agáchate + interactúa** con la montura vacía → la **recoges** y vuelve a tu inventario con toda su configuración.
5. Si la montura **es destruida**, suelta otra vez su item (con la misma configuración y mejoras compradas).

Los **mobs hostiles no atacan** a las monturas vacías (ni los creepers las rompen); solo pueden hacerles daño cuando
vas montado. Los jugadores sí pueden romperlas a golpes.

## Skins

| Montura | Vanilla | Estilo Terraria |
|---|---|---|
| Slime | Bloque de Slime | Slime Azul (Montura de Slime), **Rey Slime** (corona dorada con rubí y un ninja dentro), **Reina Slime** (cristales y alas, como la *Gelatinous Pillion*) |
| Barco | Barco del End (purpur, cabeza de dragón, estandartes) | **Ovni** (Llave del coche cósmico / platillo marciano con cúpula y luces giratorias), **Alfombra Voladora** (ondea al volar) |
| Submarino | Guardián Anciano, Guardián | **Cute Fishron** (con aletas que aletean) |

## Mejoras (se pagan con niveles de XP)

| Montura | Mejora | Coste | Efecto |
|---|---|---|---|
| Slime | Super Salto | 3 niveles | Saltos todavía más altos |
| Slime | Pisotón Gelatinoso | 2 niveles | Al caer sobre mobs hostiles los dañas y los empujas con una onda de viento (como el slime de Terraria) |
| Barco | Turbo de Viento | 3 niveles | **Pulsa saltar dos veces** seguidas → descarga de viento que te impulsa |
| Barco | Visión Nocturna | 3 niveles | Visión nocturna mientras vuelas |
| Submarino | Visión Nocturna | 3 niveles | Visión nocturna mientras lo montas |
| Submarino | Turbo de Corriente | 2 niveles | **Pulsa saltar dos veces** bajo el agua → acelerón |
| Todas | Blindaje | 2 niveles | La montura tiene el doble de vida (60 en vez de 30) |

## Estructura

```
addon-monturas-simples/
├── Monturas_Simples_BP/        pack de comportamiento (entidades, items, recetas, script)
│   └── scripts/main.js         toda la lógica (menú, vuelo, buceo, mejoras, recoger, soltar)
├── Monturas_Simples_RP/        pack de recursos (modelos, texturas, animaciones, textos)
├── herramientas/
│   ├── build.py                genera modelos, texturas e iconos y empaqueta el .mcaddon
│   └── entidades.py            genera los JSON de las entidades
└── dist/Monturas_simples_Por_Quiquitapo.mcaddon
```

Para regenerar el addon después de cambiar algo:

```bash
pip install pillow
python3 herramientas/entidades.py   # solo si cambias las entidades
python3 herramientas/build.py
```

## Detalles técnicos

- Script API estable: `@minecraft/server` 2.0.0 y `@minecraft/server-ui` 2.0.0. No hace falta activar *Beta APIs*.
- La configuración se guarda como *dynamic property* en el item y en la entidad, así que no se pierde al recoger
  la montura, al soltarla al morir ni al salir del mundo.
- El slime usa los controles de montura vanilla (como un caballo con barra de salto). El barco y el submarino se
  pilotan por script según la dirección de la cámara del jinete, así que funcionan igual en PC, consola y móvil
  (en móvil: mira hacia arriba o abajo para subir o bajar).
- Todo el arte (modelos 3D y texturas pixel art) es original y está generado por `herramientas/build.py`.
