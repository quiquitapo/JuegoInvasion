# MagicPowers By Quiquitapo

![MagicPowers By Quiquitapo](arte/banner.png)

**Domina los elementos.** MagicPowers añade a Minecraft Bedrock cinco libros mágicos
(**Fuego, Hielo, Viento, Electricidad y Gravedad**) que se fabrican en supervivencia.
Cada libro tiene dos habilidades: la primera está disponible desde el principio y la
segunda se desbloquea al subir de nivel el libro derrotando enemigos. Todo mantiene el
estilo vanilla: texturas pixel-art de 16×16, sonidos del juego y un panel discreto en una
esquina de la pantalla.

> **Descripción corta (para la tienda o MCPEDL):**
> *Fabrica libros mágicos de Fuego, Hielo, Viento, Electricidad y Gravedad. Agáchate para
> lanzar llamaradas, fragmentos de hielo, ráfagas de viento, rayos en cadena o piedras
> gravitatorias. Derrota enemigos para subir de nivel tus libros y desbloquear una segunda
> habilidad todavía más poderosa. Por Quiquitapo.*

---

## Requisitos

| | |
|---|---|
| Edición | Minecraft **Bedrock** (Windows, Android, iOS, consolas) |
| Versión mínima | **1.26.50** (la última estable, del 15‑09‑2026) |
| API de scripts | `@minecraft/server` **2.10.0** (estable, no necesita experimentos) |

## Instalación

1. Descarga **`dist/MagicPowers_By_Quiquitapo.mcaddon`** y ábrelo: Minecraft importará los dos
   packs automáticamente.
2. Crea o edita un mundo → **Paquetes de comportamiento** → activa *MagicPowers [BP]*. El
   paquete de recursos se activa solo.
3. ¡Listo! No hace falta activar ningún experimento.

> Para regenerarlo tras modificar algo: `python3 tools/empaquetar.py`.

## Recetas (mesa de trabajo)

Todos los libros usan la misma forma: un **libro** en el centro, **4 lapislázuli** en las
esquinas y **4 ingredientes** del elemento en los lados.

```
 L  I  L        L = Lapislázuli
 I  📖 I        I = Ingrediente del elemento
 L  I  L        📖 = Libro
```

| Libro | Ingrediente |
|---|---|
| ![](MagicPowers_RP/textures/items/mp_book_fire.png) **Libro de Fuego** | Polvo de blaze |
| ![](MagicPowers_RP/textures/items/mp_book_ice.png) **Libro de Hielo** | Hielo compacto |
| ![](MagicPowers_RP/textures/items/mp_book_wind.png) **Libro de Viento** | Carga de viento |
| ![](MagicPowers_RP/textures/items/mp_book_lightning.png) **Libro de Electricidad** | Pararrayos |
| ![](MagicPowers_RP/textures/items/mp_book_gravity.png) **Libro de Gravedad** | Obsidiana |

Las recetas se desbloquean en el libro de recetas al conseguir un libro normal.

## Controles

Con un libro mágico **en la mano**:

| Acción | Resultado |
|---|---|
| **Mantener agachado** (≈ 0,5 s) | Lanza la habilidad seleccionada. Si sigues agachado, se vuelve a lanzar en cuanto termina el enfriamiento. |
| **Tocar agachar** (pulsación corta) | Cambia entre la habilidad 1 y la 2 (la 2 requiere nivel 2). |
| **Usar** (clic derecho / mantener en pantalla táctil) | También lanza la habilidad seleccionada. |

En móvil, el botón de agacharse funciona como interruptor: tócalo dos veces seguidas para
cambiar de habilidad o déjalo activado medio segundo para lanzarla.

## Panel de habilidades (HUD)

Mientras sostienes un libro aparece en una esquina un panel con estilo vanilla:

```
┌──────────────────────────────┐
│ [📕] Fuego Nv.3              │
│      ■■■■■■□□□□ 45/60        │  ← experiencia del libro (o barra de carga)
│      » Llamarada ✔           │  ← habilidad seleccionada, lista
│      · Meteoro Ígneo 4.5s    │  ← la otra habilidad, en enfriamiento
└──────────────────────────────┘
```

- `/magicpowers:hud arriba_izquierda | arriba_derecha | abajo_izquierda | abajo_derecha | oculto`
  cambia la esquina (cada jugador elige la suya; por defecto, arriba a la izquierda).
- `/magicpowers:guia` muestra los controles en el chat.
- El icono del objeto también muestra el sombreado de enfriamiento, como una perla de Ender.

## Habilidades

El daño indicado es el de nivel 1. Cada nivel suma **+15 % de daño** y reduce un **7 %** el
enfriamiento.

| Libro | Habilidad 1 (nivel 1) | Habilidad 2 (nivel 2) |
|---|---|---|
| 🔥 **Fuego** | **Llamarada**: cono de fuego de 7 bloques; 5 de daño y quema 4 s o más. *(3 s)* | **Meteoro Ígneo**: bola de fuego que explota al impactar (radio 4); 10 de daño y quemaduras. **No rompe bloques.** *(9 s)* |
| ❄️ **Hielo** | **Fragmento Glacial**: esquirla que hace 6 de daño y ralentiza; desde nivel 4 lanza 3. *(1,75 s)* | **Nova Helada**: onda de radio 6; 7 de daño, Lentitud V y Debilidad; congela el agua quieta (se derrite sola). *(12 s)* |
| 🌪️ **Viento** | **Ráfaga**: cono de viento que lanza lejos a los enemigos; 3 de daño. *(2 s)* | **Tornado**: torbellino que avanza durante 5 s o más, atrae y eleva a los enemigos. *(15 s)* |
| ⚡ **Electricidad** | **Rayo en Cadena**: rayo de 22 bloques que salta a 1–3 enemigos más; 7 de daño. *(3 s)* | **Tormenta**: rayos del cielo sobre 4–7 enemigos cercanos; 12 de daño cada uno. **No provoca incendios.** *(14 s)* |
| 🪨 **Gravedad** | **Lluvia de Piedras**: lanza 3 piedras pequeñas (5 desde nivel 3); 4 de daño cada una. *(1,5 s)* | **Colapso**: eleva a los enemigos hacia un punto y los aplasta contra el suelo; 9 de daño más la caída. *(13 s)* |

Las habilidades no dañan a jugadores, aldeanos, comerciantes, gólems, allays ni mascotas domesticadas.

## Niveles

Cada libro guarda su propio progreso (aunque lo metas en un cofre o se lo des a otro
jugador). La experiencia se gana derrotando enemigos con el libro en la mano o con sus
habilidades (también cuentan las muertes por quemadura o caída provocadas por el libro).

| Nivel | XP total | Recompensa |
|---|---|---|
| 1 | 0 | Habilidad 1 |
| 2 | 10 | **Habilidad 2** |
| 3 | 30 | Más daño y menos enfriamiento (Gravedad: 5 piedras) |
| 4 | 60 | Mejoras extra (Hielo: 3 fragmentos; Fuego/Hielo/Gravedad: más radio) |
| 5 | 100 | Nivel máximo |

Monstruos: 1 XP · Breeze: 2 · Evocador/Devastador: 3–4 · Guardián anciano: 10 ·
Warden: 20 · Wither: 25 · Dragón del End: 40.

---

## Cómo está hecho

```
MagicPowers/
├── MagicPowers_BP/            Behavior Pack
│   ├── manifest.json          módulo de datos + script (@minecraft/server 2.10.0)
│   ├── items/                 los 5 libros (glint, rareza, enfriamiento por categoría)
│   ├── recipes/               recetas con forma
│   ├── entities/pebble.json   proyectil de piedra (Gravedad)
│   └── scripts/               main.js · abilities.js · books.js · hud.js · config.js · util.js
├── MagicPowers_RP/            Resource Pack
│   ├── textures/              libros, partículas, piedra, marco del HUD
│   ├── particles/             10 partículas propias (llama, escarcha, chispa, viento…)
│   ├── entity/ models/ animations/   piedra 3D que gira
│   ├── ui/hud_screen.json     panel de habilidades en la esquina
│   └── texts/                 es_ES, es_MX, en_US
├── arte/                      logo.png · banner.png · pack_icon.png
├── tools/                     scripts que generan texturas, logo, partículas y el .mcaddon
└── dist/                      MagicPowers_By_Quiquitapo.mcaddon
```

- **Script API estable**: el addon solo usa APIs estables de la versión 2.10.0, así que
  funciona sin activar experimentos.
- **Detección de agacharse**: se lee `player.isSneaking` en cada tick; un toque corto
  (≤ 6 ticks) cambia de habilidad y mantener 10 ticks la lanza. Funciona igual en teclado,
  mando y pantalla táctil.
- **HUD en la esquina**: el script envía un *title* invisible con el prefijo `mpw:`; el
  `hud_screen.json` lo oculta del centro, guarda el texto y lo dibuja en la esquina elegida
  con el fondo de los textos del HUD vanilla y el icono del libro. Los *titles* de otros
  addons o comandos siguen viéndose con normalidad.
- **Datos del libro**: nivel, XP y habilidad elegida se guardan como propiedades dinámicas
  del propio objeto, y la descripción (*lore*) se actualiza sola.
- **Optimizado**: un único bucle por tick para todos los jugadores y efectos (sin un
  intervalo por hechizo), partículas ligeras y nada de bloques destruidos ni fuego
  esparcido.

### Regenerar recursos

```bash
python3 tools/generar_texturas.py    # texturas pixel-art (requiere Pillow)
python3 tools/generar_particulas.py  # partículas
python3 tools/generar_logo.py        # logo, banner y pack_icon
python3 tools/empaquetar.py          # dist/MagicPowers_By_Quiquitapo.mcaddon
```

---

*MagicPowers By Quiquitapo — addon no oficial de Minecraft. No está aprobado por Mojang ni
Microsoft, ni asociado a ellos.*
