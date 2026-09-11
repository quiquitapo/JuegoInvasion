# Invasión Tentacular — ranking global

El juego sigue funcionando **exactamente igual** que antes. Lo único nuevo es
una pestaña GLOBAL junto a la de LOCAL, y una pregunta al terminar una partida
de invasión. Si no despliegas nada de esto, el juego funciona igual: la
pestaña GLOBAL simplemente avisará de que no pudo conectar.

## Estructura del repositorio

```
tu-repo/
├── index.html        (el juego)
├── package.json
├── schema.sql
└── api/
    └── scores.js     (función de servidor)
```

`index.html` va en la raíz. La carpeta `api/` es lo que Vercel convierte
automáticamente en endpoints: `api/scores.js` se publica como `/api/scores`.

## 1. Crear la base de datos en Neon

1. Entra en **https://neon.tech** y crea una cuenta.
2. Pulsa **New Project**, ponle nombre y elige la región más cercana.
3. Abre el **SQL Editor** del proyecto.
4. Pega el contenido de `schema.sql` y ejecútalo.
5. Ve a **Connection Details** y copia la cadena que empieza por
   `postgresql://`. Marca la opción **Pooled connection** si aparece.

Guarda esa cadena: es la que usarás como `DATABASE_URL`.

## 2. Subir el proyecto a GitHub

```bash
git init
git add index.html package.json schema.sql api/scores.js
git commit -m "Invasión Tentacular con ranking global"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## 3. Desplegar en Vercel

1. Entra en **https://vercel.com** y accede con tu cuenta de GitHub.
2. **Add New → Project** e importa el repositorio.
3. En *Framework Preset* deja **Other**. No hace falta build command.
4. Antes de desplegar, abre **Environment Variables** y añade:

   | Name | Value | Environments |
   |---|---|---|
   | `DATABASE_URL` | la cadena `postgresql://…` de Neon | Production, Preview, Development |

5. Pulsa **Deploy**.

Si añades la variable después del primer despliegue, entra en
**Settings → Environment Variables**, guárdala y luego **Deployments → ⋯ →
Redeploy**, porque las variables se leen al construir.

### Atajo: conectar Neon desde el propio Vercel

En tu proyecto de Vercel, **Storage → Connect Database → Neon**. Al vincularlo,
Vercel crea `DATABASE_URL` por ti y no tienes que copiar nada a mano.

## 4. Comprobar que funciona

- `https://tu-proyecto.vercel.app/api/scores` debe responder
  `{"ok":true,"scores":[]}`.
- En el juego, pestaña **GLOBAL**: debe decir "Sin registros globales aún"
  en vez de un error de conexión.
- Juega una partida de invasión, guarda tu nombre y pulsa **SUBIR AL GLOBAL**.
  Vuelve a la pestaña GLOBAL y tu puntaje debe aparecer.

Si algo falla, **Vercel → Deployments → Functions** muestra los registros de
`/api/scores`.

## Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | sí | Conexión a Neon. Solo la lee el servidor. |

La cadena **nunca** aparece en el HTML ni en el JavaScript del navegador: el
juego solo conoce la ruta `/api/scores`.

## La API

### `GET /api/scores?limit=10&hero=alien`

Hay **una tabla por personaje**, igual que en el ranking local. `hero` acepta
`alien` o `viltrum`; si se omite, devuelve el ranking conjunto.

```json
{ "ok": true, "scores": [
  { "id": 1, "player_name": "ZORA", "score": 99000,
    "hero": "alien", "device": "pc", "created_at": "2026-09-11T12:00:00.000Z" }
]}
```

`limit` admite de 1 a 50; por defecto 10. El campo `hero` de la respuesta
indica de qué tabla se trata, o `null` si vienen mezclados.

### `POST /api/scores`

```json
{ "player_name": "ZORA", "score": 99000, "hero": "alien", "device": "pc" }
```

Responde `201 { "ok": true, "id": 42 }`.

El servidor **no se fía del navegador** y rechaza con `400`:

- nombre vacío, no textual o que queda vacío al limpiarlo;
- puntaje que no sea entero, negativo o superior a 5.000.000;
- cuerpo que no sea un objeto JSON.

Además recorta el nombre a 14 caracteres, le quita etiquetas y caracteres de
control, y normaliza `hero` y `device` a los valores conocidos.

## Qué NO cambió

- `SaveIO`, `localStorage`, `saveScore()`, `loadScores()`,
  `renderScoreList()`, `commitName()` y `pendingScore` siguen tal cual.
- El ranking local se guarda igual y funciona **sin conexión**.
- Nada se sube solo: hace falta pulsar **SUBIR AL GLOBAL**.
- El modo **contra otro jugador nunca** llega al ranking global.
- Logros, monedas, skins, controles y configuración, intactos.
