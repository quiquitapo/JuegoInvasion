# Super Invasores (Invasión Tentacular)

**Eres el monstruo.** Un juego de acción para navegador, en vista cenital, en
el que destrozas una ciudad entera mientras el ejército (y después sus jefes)
intenta pararte. Se juega en PC (teclado y ratón, o mando) y en móvil o tableta
(controles táctiles), se puede instalar como app y funciona sin conexión.

Todo el juego es **un solo archivo**, `index.html`: no hace falta compilar ni
instalar nada para jugar. La única parte de servidor es opcional: el ranking
global y las salas del multijugador en línea (ver
[Despliegue](#despliegue-ranking-global-y-multijugador)).

---

## Índice

1. [Jugar en 30 segundos](#jugar-en-30-segundos)
2. [Cómo es una partida](#cómo-es-una-partida)
3. [Personajes](#personajes)
4. [Controles](#controles)
5. [Modos de juego](#modos-de-juego)
6. [Mapas](#mapas)
7. [Enemigos y jefes](#enemigos-y-jefes)
8. [Progresión: monedas, tienda, logros y rankings](#progresión-monedas-tienda-logros-y-rankings)
9. [Ajustes y rendimiento](#ajustes-y-rendimiento)
10. [Instalar como app y jugar sin conexión](#instalar-como-app-y-jugar-sin-conexión)
11. [Para desarrolladores: cómo está hecho](#para-desarrolladores-cómo-está-hecho)
12. [Despliegue: ranking global y multijugador](#despliegue-ranking-global-y-multijugador)
13. [La API](#la-api)
14. [Preguntas frecuentes](#preguntas-frecuentes)

---

## Jugar en 30 segundos

- **En línea:** abre la dirección donde esté publicado (por ejemplo, el
  proyecto de Vercel).
- **En tu ordenador:** sirve la carpeta con cualquier servidor estático y abre
  la página. Por ejemplo:

  ```bash
  python3 -m http.server 8000
  # y abre http://localhost:8000
  ```

  También funciona abriendo `index.html` directamente con doble clic. Lo único
  que no funciona así es lo que necesita servidor: el ranking global, las salas
  en línea y la instalación como app.

En el menú: elige **personaje** (a la izquierda), pulsa **INVADIR**, elige
**mapa** y **modo**, y a jugar. Cada personaje tiene un botón **VER
TUTORIAL** y una ficha de **CONTROLES**.

---

## Cómo es una partida

El modo principal es **INVASIÓN**: supervivencia por puntaje.

- **Destruye todo.** Civiles, autos, árboles, farolas, edificios y, sobre todo,
  soldados y vehículos dan puntos. Derribar edificios da además monedas extra,
  y reventar un **banco** da un botín grande.
- **Oleadas que se endurecen.** Primero huyen los civiles. Después llega la
  **policía** y luego el **ejército**: soldados, minigunes, tanques,
  helicópteros, cañones de asedio y cazas. Con la **OLEADA FINAL** llega lo más
  pesado. A partir de unos 9.000 puntos la ciudad se vacía y solo queda el
  ejército.
- **Jefes.** Pasado cierto puntaje puede presentarse un **jefe** en cualquier
  momento, con su propia música y una barra de vida arriba. Mientras está en pie
  el ejército se retira. Si aguanta demasiado sin caer, el ejército vuelve a la
  carga. A partir de 20.000 puntos empieza el **asedio**: los jefes aparecen más
  a menudo y las tropas ya no se detienen.
- **El OVNI.** De vez en cuando cruza la ciudad un OVNI inofensivo. Si lo
  derribas, te da un **poder especial** durante unos segundos, distinto para
  cada personaje: visión calórica, tormenta eléctrica, sobrecarga, poder
  arcano...
- **Día, noche y clima.** El día pasa por mañana, día, atardecer y noche (45 s
  cada fase). De noche se encienden farolas, faros y los focos de los
  helicópteros. El clima cambia entre soleado, nublado y lluvia.
- **Vida.** Cada baja te cura un poco. Si tu vida llega a cero, la partida
  termina: guardas tu nombre en el ranking y cobras las monedas.

Algunos detalles que conviene saber:

- Hay un **tope de enemigos normales a la vez**: 22 en PC y 16 en móvil (los
  jefes no cuentan). Los que se quedan lejos y fuera de la vista durante unos
  segundos **se teletransportan** justo fuera de la pantalla, cerca de ti, para
  que la acción no decaiga.
- Hay también un **tope de autos**: 12 circulando y 18 en total en PC (8 y 12
  en móvil).
- Las **monedas** de una partida son el puntaje / 50, más 2 por cada edificio
  derribado, más los bancos que revientes.

---

## Personajes

Hay seis. Cada uno tiene su propio ranking, sus skins y su forma de jugar.

| Personaje | En una frase | Lo especial |
|---|---|---|
| **CRÍA** | La cría tentacular: devora, agarra y lanza todo lo que pilla. | El único que **evoluciona**: con 14 bajas pasa a **COLOSO**, más grande y con más vida, capaz de pasar por encima de los edificios hundiéndolos. |
| **VILTRUMITA** | Guerrero de traje gris que lo revienta todo a puñetazos. | **Vuelo hipersónico**. Atraviesa los edificios andando o volando y deja un boquete. El traje se mancha con la sangre de lo que mata. |
| **DRAGÓN** | El dragón de tres cabezas. | Vuela sobre los tejados, muerde, barre calles con las alas y escupe rayos. Todo gasta estamina. |
| **MÁQUINA ABERRANTE** | Máquina de guerra azul y oro, de un solo ojo. | Poca vida, pero se recompone con cada víctima. Coge carrerilla y cambia de arma (espada de plasma, ráfaga, escopeta, lanzacohetes). Incinera y salta con motosierras. |
| **MAGO ABERRANTE** | Aberración con capa de hechicero que flota despacio. | Rayos, telequinesis, hielo, fuego, escudo y teletransporte. Todo gasta maná, que se recupera solo. |
| **BOROS** | El dominador del universo, sin armadura. | Combos de puñetazos, carrera que atraviesa edificios, ráfagas de energía, patadas a cámara lenta y regeneración. Con el OVNI libera su **forma meteórica**. |

Los personajes del viltrumita, el dragón y la cría tienen una **entrada
cinematográfica** al empezar la partida:

- El **viltrumita** llega del espacio, atraviesa un satélite y entra en la
  atmósfera envuelto en fuego.
- La **cría** sale de una alcancarilla.
- El **dragón** pasa rozando la cámara.

Cada una tiene su versión para el Mundo Alienígena.

---

## Controles

Todas las teclas se pueden cambiar en **Ajustes**. Las de fábrica son:

| Tecla | Acción general |
|---|---|
| **W A S D** | Moverse |
| **Ratón** | Apuntar |
| **Clic izquierdo** | Ataque principal (agarrar, golpear, morder, disparar...) |
| **Clic derecho** | Acción secundaria (lanzar, agarrar, rayos, cambiar de arma, telequinesis...) |
| **E / Q** | Agarrar / lanzar (cría y viltrumita) |
| **Z, C, X, R** | Habilidades de cada personaje |
| **Doble toque de dirección** | Volar o correr (viltrumita, dragón, Boros) |
| **P** o **Esc** | Pausa |

Controles detallados por personaje (teclado y ratón):

- **Cría:** clic izquierdo o E agarra; con algo agarrado, golpeas con ello.
  Clic derecho o Q lanza; lo que llevas también te sirve de escudo. Devora para
  evolucionar.
- **Viltrumita:** clic izquierdo golpea; mantenido, carga el golpe. Doble toque
  activa el vuelo hipersónico. Clic derecho agarra y lanza. Mantener C hace la
  **presa**: embiste, agarra al primero que pilla y lo lanza.
- **Dragón:** clic izquierdo muerde y clic derecho echa rayos. Z da un aletazo.
  Mantener C traza una embestida que remata con un coletazo. R ruge y recupera
  estamina. Doble toque para volar.
- **Máquina:** mantener una dirección acelera. Clic izquierdo ataca con el arma
  y clic derecho cambia de arma. Mantener Z apunta la incineración y al soltar
  la lanza. Mantener C salta con motosierras.
- **Mago:** clic izquierdo lanza un rayo. Mantener clic derecho activa la
  telequinesis. Z congela, C pone un escudo, X lanza una columna de fuego y R
  teletransporta.
- **Boros:** doble toque o mantener una dirección para correr. Clic izquierdo
  hace un combo de puñetazos; mantenido, un puñetazo cargado. Mantener Z suelta
  una ráfaga de energía. Mantener clic derecho prepara las patadas. Mantener C
  da un golpe sombra, mantener X dispara el rayo del pecho y R cura.

**En móvil y tableta** aparecen joysticks y botones en pantalla: el izquierdo
para moverse y botones de habilidad que se mantienen, se apuntan y se sueltan.
Su tamaño y colocación se ajustan en **Ajustes**.

**Con mando** (gamepad): se detecta solo. El stick izquierdo mueve, el derecho
apunta, y L3 corre o vuela.

---

## Modos de juego

| Modo | Jugadores | De qué va |
|---|---|---|
| **INVASIÓN** | 1 | El modo principal: supervivencia por puntaje contra el ejército y sus jefes. Cuenta para los rankings. |
| **VS LEGENDARIO** | 1 | Duelos contra los jefes controlados por la CPU, uno tras otro. Entre combates eliges ventajas (más daño, más vida, regeneración...). Guarda tu récord de combates ganados. |
| **CONTRA OTRO JUGADOR** | 2 (local o en línea) | Duelo de 2:30. Uno invade; el otro **manda al ejército**: gasta materiales en desplegar unidades donde quiera y gana más materiales dañando al invasor. Nunca cuenta para el ranking global. |
| **DOBLE INVASIÓN** | 2 (en línea) | Cooperativo: los dos invasores contra el ejército y sus jefes. |
| **Tutorial** | 1 | Un tutorial guiado para cada personaje, desde su ficha en el menú. |

En línea, uno **crea una sala** y le pasa el **código** de cinco letras al otro,
que se **une**. La partida va directamente de un dispositivo a otro (WebRTC);
el servidor solo los presenta.

---

## Mapas

| Mapa | Ambiente | Enemigos |
|---|---|---|
| **CIUDAD** | La ciudad de siempre: calles, parques, comercios y bancos. | Policía, ejército humano y sus jefes. |
| **MUNDO ALIENÍGENA** | Un planeta marciano de cúpulas y vehículos flotantes, con su música de bytebeat ("PLANETA ROJO"). | Centinelas, droides, bichos guerreros, murciélagos ácidos, trípodes y jefes marcianos; también caen meteoritos. |
| **CASTIGO DIVINO** | El infierno: todo en ruinas, lava y lluvia roja. Se entra cayendo por un portal. | Las almas de los que mataste (vengativos), tropas deformes, amalgamas y jefes deformados. |

Cada mapa tiene su propio ranking, local y global. En la tienda se compran
además **skins de ciudad**: BLANCO Y NEGRO, CARTOON, CÓMIC, ANIME y STEAMPUNK,
que cambian el aspecto de todo el mapa.

---

## Enemigos y jefes

El **Registro** del menú es una enciclopedia con **53 fichas**. Cada ficha
explica a un enemigo y da un consejo para vencerlo, y se desbloquea al
encontrártelo en partida. Además, cuando llega un tipo de enemigo nuevo aparece
un aviso con su imagen bajo la barra de vida.

- **Tropa humana:** policía, militar, minigunero, tanque, helicóptero,
  helicóptero artillado, cañón de asedio, caza, MBT-MB92 (normal y congelante) y
  camión cisterna (una bomba con ruedas).
- **Tropa marciana:** centinela y centinela de élite, droide de batalla, cabezón
  verde, ojo escáner, tanque araña, murciélago ácido, dron kamikaze, médico
  marciano, duende voltaico, machacador, ave de presa, nave gravitatoria,
  helicóptero cazador, acorazado de asalto y bicho guerrero.
- **Almas** (del Héroe Mágico y del infierno): arquero, caballero y gólem
  fantasma, vengativo y amalgama de almas.
- **Jefes:** Tanque de Fuego, Omnidroide, El Artillero, SUPER X2, Trípode
  Marciano, Las Crías, Héroe Mágico, Kaiyin, El Desgarrador, El Centurión,
  Muerte Veloz, La Tejedora y Desesperación. Además, dos rivales: el Boros y el
  viltrumita de la CPU.

---

## Progresión: monedas, tienda, logros y rankings

- **Monedas:** se ganan al terminar cada partida y se gastan en la **TIENDA**.
- **Tienda:**
  - Skins de personaje, desde colores (CARMESÍ, AZUL ABISAL, NEÓN...) hasta
    trajes únicos con estampado (ARMADURA CÓSMICA, CHILE, HUASO, NAVIDAD, CODY
    MILLERS, REGENTE...).
  - Las skins de ciudad.
  - Una vista previa de cada cosa antes de comprarla.
- **Logros:** 24 retos, por ejemplo derribar un OVNI con cada personaje,
  completar el Registro o conquistar el planeta alien. Se ven en **LOGROS**,
  filtrados en conseguidos y pendientes.
- **Rankings:** una tabla por personaje y por mapa.
  - La **LOCAL** se guarda en tu navegador y funciona sin conexión.
  - La **GLOBAL** necesita el servidor. Nada se sube solo: al terminar pulsas
    **SUBIR AL GLOBAL**.
  - Cada jugador conserva solo su mejor marca en cada tabla.
- **Guardado:** monedas, skins, logros, ajustes y puntajes se guardan solos en
  el navegador (IndexedDB, con localStorage de respaldo).

---

## Ajustes y rendimiento

En **Ajustes → Pantalla y sonido**:

- **Alta resolución (ULTRA):** AUTO, ENCENDIDO o APAGADO.
  - Dibuja a 1,25 veces la resolución de la pantalla.
  - En AUTO se enciende sola si el juego va fluido y se apaga si no.
- **Límite de 60 FPS:** en pantallas de 120/144 Hz evita trabajar el doble
  sin que se note. Viene activado.
- **Medidor de FPS**, **barras de vida**, **números de daño**, **temblor de
  pantalla** y **animaciones de menú**.
- **Botones táctiles:** su tamaño y su colocación.
- **Pantalla completa**, y volumen de **efectos** y **música**.
- **Opciones del modo contra otro jugador:** OVNI, láseres, mira del jugador 2
  y cámara al mandar al ejército.

Si un equipo va justo, el juego **baja la resolución solo** hasta ir fluido y lo
recuerda para la próxima vez. Si notas tirones:

1. Pon la alta resolución en **APAGADO**.
2. Activa el **medidor de FPS** para ver cuánto rinde.
3. Juega en pantalla completa en el navegador más actual que tengas.

---

## Instalar como app y jugar sin conexión

En el menú aparece un botón para **instalar como app** (si el navegador lo
permite). Al instalarlo, el juego y su música se guardan en el dispositivo
gracias a un *service worker* (`sw.js`), y se puede jugar **sin internet**.

- **Sin conexión siguen funcionando:** el modo invasión, el VS legendario, el
  duelo local, la tienda, los logros y el ranking local.
- **Necesitan red:** el ranking global y las salas en línea.

---

## Para desarrolladores: cómo está hecho

### Estructura del repositorio

```
.
├── index.html            el juego entero: HTML, CSS, JavaScript e imágenes incrustadas
├── sw.js                 service worker: caché para jugar sin conexión
├── manifest.webmanifest  datos de la app instalable (nombre, iconos, orientación)
├── iconos/               iconos de la app (180, 192 y 512 px)
├── musica/               pistas grabadas en MP3 (menús, registro y dos jefes)
├── api/
│   ├── scores.js         función de servidor: ranking global      → /api/scores
│   ├── salas.js          función de servidor: salas del en línea  → /api/salas
│   └── _nombres.js       filtro de nombres inapropiados (compartido)
├── schema.sql            tablas del ranking (PostgreSQL / Neon)
├── schema_salas.sql      tablas de las salas
└── package.json          única dependencia: @neondatabase/serverless (para la API)
```

### Tecnología

- **Sin frameworks ni compilación.** Es JavaScript puro en un `<script>`
  dentro de `index.html`; se edita y se recarga. Los comentarios y los nombres
  del código están en español.
- **Gráficos:** Canvas 2D. El mundo se dibuja con una transformación de escala
  `ZOOM * DPR` y la cámara (`camX`, `camY`) sigue al jugador. Los sprites son
  imágenes incrustadas en base64 (WebP o PNG) o se dibujan por código y se
  guardan en caché.
- **Sonido:** Web Audio.
  - Los efectos se sintetizan al momento: osciladores y ruido filtrado.
  - La música de cada mapa y de cada jefe la **compone un motor propio**
    (`estudioMotor` / `estudioPartituras`). Se renderiza fuera de línea en un
    **Web Worker** y se guarda en caché.
  - El Mundo Alienígena suena con un generador **bytebeat**.
  - Algunas pistas son MP3 de la carpeta `musica/`.
- **Guardado:** `SaveIO` usa IndexedDB, con localStorage de respaldo.
- **Multijugador:** WebRTC entre los dos navegadores. `api/salas.js` solo hace
  de "presentador": crea la sala y reparte los mensajes de señalización. Para
  conectarse a través de redes complicadas usa servidores STUN.
- **Ranking global:** funciones serverless de Vercel (`api/`) sobre una base
  PostgreSQL de Neon.

### Mapa del código (`index.html`)

El archivo es grande (unas 46.000 líneas). Lo más práctico es buscar por nombre
de función. Las piezas principales:

| Qué | Dónde buscar |
|---|---|
| Bucle principal | `loop` → `pasoBucle`: lee la entrada, actualiza el mundo y llama a `draw` |
| Dibujo de un fotograma | `draw`: suelo, edificios, objetos ordenados por profundidad, efectos, luz nocturna y HUD |
| Personajes | `updatePlayer` y `updateViltrum`, `updateDragon`... (un bloque por héroe, con su `draw...`) |
| Enemigos | `spawnEnemy` (estadísticas de cada tipo), `updateEnemies`, `damageEnemy` (daño, muerte y recompensas) |
| Oleadas y jefes | `updateSpawns` (ciudad), `updateSpawnsAlien`, `updateSpawnsInf`, `presentaJefe` |
| Edificios | `edifCanvas` (fachadas dibujadas por código), `damageBuilding`, `demolish` |
| Día, noche y luz | `PHASES`, `drawLighting` (búfer de luz a 1/4 de resolución) |
| Entradas cinematográficas | `drawVilPreludio`, `drawCriaPreludio`, `drawDraPreludio` |
| Modos | `startGame`, VS (`gameMode === 'vs'`), VS legendario (`ley`), en línea (`Online`) |
| Tienda y skins | `SKINS`, `CIUDAD_SKINS`, `skin()` |
| Registro y logros | `BESTIARY`, `ACHIEVEMENTS` |
| Música | `estudioMotor`, `estudioPartituras`, `bbGeneradores` (bytebeat) |
| Ajustes | `DEFAULT_BINDS` (teclas), `loadCalidad` / `ponUltra` (resolución) |

### Rendimiento: técnicas que usa

Para ir a 60 fps también en móviles, el juego evita repetir trabajo:

- **Suelo en búfer:** baldosas, calles y manchas se pintan una vez en un lienzo
  algo mayor que la pantalla, y solo se repinta la franja que entra.
- **Copias 1:1:** cada imagen se guarda ya escalada al tamaño de pantalla y se
  copia sin reescalar (`dibujaImg`). Las copias tienen un tope de memoria.
- **Decorado prerrenderizado:** árboles, farolas, bancas y papeleras quietos se
  guardan con su sombra en una sola imagen (`propPre`).
- **Luz nocturna:** se calcula en un búfer pequeño, con las farolas fijas
  pintadas una sola vez en una capa.
- **Rejilla espacial de edificios:** los choques solo miran los edificios
  cercanos.
- **IA a medio ritmo:** lo que está lejos y fuera de la vista se actualiza un
  fotograma sí y otro no.
- **Balas y partículas a la mínima resolución:** bloques de píxel e imágenes
  diminutas.
- **Reservas de objetos:** partículas y explosiones se reutilizan en vez de
  crearse de nuevo.
- **Límites:** máximo de voces de sonido, de enemigos y de autos.
- **Resolución adaptativa:** baja sola si el equipo no llega.
- **Preparación anticipada:** la ciudad y las entradas se preparan en los ratos
  libres para que no haya tirones al empezar.

### Trabajar en local

```bash
python3 -m http.server 8000     # el juego, en http://localhost:8000
```

Para probar también el ranking y las salas hace falta la API. Con
[Vercel CLI](https://vercel.com/docs/cli) y una `DATABASE_URL` de Neon:

```bash
npm install
vercel dev                      # sirve el juego y /api/* en local
```

Recuerda que el *service worker* guarda el juego en caché. Si no ves tus
cambios, recarga forzando (Ctrl+Mayús+R) o desactívalo en las herramientas de
desarrollo.

### Códigos secretos

En una partida del **modo contra otro jugador local**, escribe `secretcodes`
para abrir un pequeño menú con tres códigos:

- `money`: el jugador 2 pasa a 9999 materiales.
- `nextc`: salta al siguiente clima.
- `nexth`: salta a la siguiente hora del día.

---

## Despliegue: ranking global y multijugador

El juego funciona **sin desplegar nada de esto**: la pestaña GLOBAL avisará de
que no pudo conectar y el modo en línea no estará disponible. Para activarlos:

### 1. Base de datos en Neon

1. Crea una cuenta en **https://neon.tech** y un proyecto nuevo (en la región
   más cercana).
2. Abre el **SQL Editor**, pega el contenido de `schema.sql` y pulsa **Run**.
3. Haz lo mismo con `schema_salas.sql`. Sin esto, el multijugador en línea no
   funciona.
4. En **Connection Details** copia la cadena `postgresql://…`, con la opción
   **Pooled connection** si aparece. Será tu `DATABASE_URL`.

Los dos scripts se pueden ejecutar **todas las veces que quieras**: sobre una
base que ya existe solo añaden lo que falte (nuevos personajes, columna de
mapa, vistas...) sin borrar ni cambiar ningún puntaje. Si actualizas el juego,
vuelve a ejecutarlos **antes** de redesplegar.

### 2. Publicar en Vercel

1. Sube el repositorio a GitHub.
2. En **https://vercel.com**: **Add New → Project** e importa el repositorio.
   Usa *Framework Preset* **Other**, sin comando de compilación.
3. En **Environment Variables** añade `DATABASE_URL` con la cadena de Neon,
   para Production, Preview y Development.
4. Pulsa **Deploy**.

Atajo: en Vercel, **Storage → Connect Database → Neon** crea la
`DATABASE_URL` sola. Si añades o cambias la variable después del primer
despliegue, haz **Redeploy** para que se lea.

### 3. Comprobar que funciona

- `https://tu-proyecto.vercel.app/api/scores?hero=dragon` debe responder
  `{"ok":true,"hero":"dragon","scores":[…]}`.
- En el juego, la pestaña **GLOBAL** debe decir "Sin registros globales aún"
  en vez de un error de conexión.
- Juega una invasión, guarda tu nombre y pulsa **SUBIR AL GLOBAL**: tu
  puntaje debe aparecer.
- Si algo falla, los registros están en **Vercel → Deployments → Functions**.

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | sí (solo para la API) | Conexión a Neon. Solo la lee el servidor: nunca aparece en el navegador. |

### Cómo se guardan los datos

- **Puntajes:** tabla `scores`. Cada personaje (columna `hero`: `alien`,
  `viltrum`, `dragon`, `maquina`, `mago`, `boros`) y cada mapa (columna `mapa`:
  `ciudad`, `alien`, `infierno`) tiene su ranking. Hay **un registro por
  jugador, personaje y mapa**, con su mejor marca. Hay vistas de solo lectura
  por personaje y por mapa (`ranking_mago`, `ranking_mapa_alien`, ...) para
  consultarlas desde Neon.
- **Salas:** tablas `salas`, `sala_jugadores` y las de señalización. Las salas
  viejas se limpian solas.
- **Navegador:** los puntajes locales van en claves separadas por personaje y
  mapa (`invasion_scores`, `invasion_scores_vil`, `invasion_scores_alien`,
  ...).

---

## La API

### `GET /api/scores?hero=alien&mapa=ciudad&limit=25`

Devuelve el ranking de un personaje y un mapa (`limit` de 1 a 100; por defecto
25). Sin `hero`, el ranking conjunto.

```json
{ "ok": true, "hero": "alien", "scores": [
  { "id": 1, "player_name": "ZORA", "score": 99000, "hero": "alien",
    "device": "pc", "created_at": "2026-09-11T12:00:00.000Z" } ] }
```

### `GET /api/scores?hero=alien&name=ZORA`

La posición de un jugador, aunque no esté entre los visibles:

```json
{ "ok": true, "encontrado": true, "hero": "alien", "score": 9000, "rank": 4, "total": 128 }
```

### `POST /api/scores`

```json
{ "player_name": "ZORA", "score": 99000, "hero": "alien", "mapa": "ciudad", "device": "pc" }
```

- Responde `201` con `mejorado: true` si superaba su marca y se guardó.
- Responde `200` con `mejorado: false` si ya tenía una igual o mejor; la tabla
  no se toca.
- Decide la base de datos (`ON CONFLICT ... WHERE`), así que dos partidas a la
  vez no se pisan.

El servidor **no se fía del navegador**:

- Rechaza nombres vacíos o inapropiados (filtro en español e inglés que detecta
  trucos como `P.U.T.4`).
- Rechaza puntajes no enteros, negativos o mayores de 5.000.000.
- Recorta el nombre a 14 caracteres y normaliza `hero`, `mapa` y `device`.

### `/api/salas`

Presenta a los dos jugadores de una partida en línea; la partida en sí no pasa
por aquí.

| Petición | Qué hace |
|---|---|
| `POST { accion:'crear', modo, nombre, heroe }` | Crea una sala (`modo`: `vs` o `doble`) y devuelve su código |
| `POST { accion:'unirse', codigo, nombre, heroe }` | Entra en una sala |
| `POST { accion:'heroe', ... }` | Cambia de personaje en la sala |
| `POST { accion:'senal', ... para, tipo, datos }` | Envía un mensaje WebRTC (oferta, respuesta o candidato) |
| `POST { accion:'empezar', ... }` / `{ accion:'salir', ... }` | Empieza la partida o sale de la sala |
| `GET ?codigo=ABCDE&jugador=ID&token=T&desde=N` | Estado de la sala y señales nuevas para ese jugador |

Cada jugador recibe un **token secreto** al entrar y lo necesita para cualquier
otra acción en su sala.

---

## Preguntas frecuentes

**¿Por qué todo está en un solo archivo?**
Para que se pueda jugar en cualquier sitio sin compilar ni instalar: basta con
servir `index.html` (o abrirlo). Las imágenes van incrustadas y la música se
genera por código.

**La pestaña GLOBAL dice que no pudo conectar.**
Es lo normal si no has desplegado la API (o si estás sin conexión). El ranking
local sigue funcionando.

**El juego va a tirones.**
Pon la alta resolución en APAGADO y activa el medidor de FPS. Si tu pantalla
es de 120 Hz o más, deja activado el límite de 60 FPS.

**No veo los cambios que hice en el código.**
El *service worker* sirve la versión guardada. Recarga forzando o desactívalo
en las herramientas de desarrollo.

**¿El modo contra otro jugador cuenta para el ranking?**
No. Solo la INVASIÓN de un jugador puede subirse al ranking global.
