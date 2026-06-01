# Lacty — Registro de tomas de bebé recién nacido

Aplicación web para registrar las tomas diarias de un bebé alimentado con lactancia materna y/o suplemento con dedo-jeringa.

---

## Comandos

```bash
# Instalar dependencias
npm install

# Modo desarrollo local (WiFi en casa)
npm run start
# → Frontend: http://localhost:5178
# → API:      http://localhost:3001

# Solo el servidor (desarrollo)
npm run server

# Solo el frontend de desarrollo
npm run dev

# Compilar y servir en producción (un solo proceso)
npm run serve

# Solo compilar
npm run build

# Verificar tipos
npx tsc --noEmit
```

---

## Acceso desde fuera de casa (despliegue en Railway)

La app puede desplegarse en [Railway](https://railway.app) para acceder desde cualquier lugar sin tener el ordenador encendido.

### Pasos

1. **Crea una cuenta gratuita** en [railway.app](https://railway.app)

2. **Sube el código a GitHub** (si aún no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "Lacty"
   gh repo create lacty --private --push --source=.
   ```

3. **Crea un nuevo proyecto en Railway**:
   - Pulsa **"New Project"** → **"Deploy from GitHub repo"**
   - Selecciona el repositorio `lacty`

4. **Configura el despliegue** en Railway > Settings:
   - Build command: `npm run build`
   - Start command: `node server.js`

5. **Añade un volumen persistente** (para que los datos no se pierdan al reiniciar):
   - Railway > tu servicio > **Volumes**
   - Mount path: `/data`

6. **Añade la variable de entorno**:
   - Railway > tu servicio > **Variables**
   - `DB_PATH` = `/data/lacty.db`

7. Railway te dará una URL pública tipo `https://lacty-production-xxxx.up.railway.app`

### ¿Qué pasa con los datos existentes?

Al arrancar por primera vez, el servidor detecta el `db.json` local y migra todos los datos automáticamente a SQLite. En Railway puedes subir un `db.json` con tus datos actuales antes del primer despliegue, o añadir los datos manualmente desde la app.

---

## Acceso desde fuera (opción rápida — ordenador encendido)

Si prefieres seguir con el servidor local y solo necesitas acceso externo puntual:

```bash
# Instala cloudflared (solo una vez)
brew install cloudflared

# Expón el servidor local
npm run start  # en una terminal
cloudflared tunnel --url http://localhost:5178  # en otra terminal
```

Te dará una URL temporal tipo `https://xxxx.trycloudflare.com`.

---

## Arquitectura

```
┌──────────────┐     producción      ┌───────────────────┐
│   Browser    │ ─── HTTPS ────────► │  Express server   │
│ (móvil/PC)   │                     │  (Railway/local)  │
└──────────────┘                     │                   │
                                     │  /api/*  → SQLite │
                                     │  /*      → dist/  │
                                     └───────────────────┘

┌──────────────┐     desarrollo      ┌──────────┐   proxy   ┌──────────────┐
│   Browser    │ ─── HTTP ─────────► │  Vite    │ ────────► │   Express    │
│ (local)      │                     │  :5178   │           │   :3001      │
└──────────────┘                     └──────────┘           └──────────────┘
```

---

## Persistencia

Los datos se guardan en **SQLite** (`lacty.db`) en el servidor. Todos los dispositivos comparten los mismos datos.

- En local: `lacty.db` en la raíz del proyecto (ignorado por git)
- En Railway: en el volumen persistente en `/data/lacty.db`

---

## Estructura del proyecto

```
server.js               ← Servidor Express (API + frontend estático)
lacty.db                ← Base de datos SQLite (generada automáticamente)
src/
├── api/index.ts        ← Cliente HTTP (fetch al servidor)
├── components/         ← Componentes React
├── data/
│   └── referenceTable.ts  ← Tabla de referencia editable
├── types/index.ts      ← Interfaces TypeScript
├── utils/              ← Utilidades de fechas y cálculos
└── App.tsx             ← Raíz, estado global, navegación
```

---

## Stack

| Tecnología | Rol |
|---|---|
| React 18 + Vite | Frontend |
| TypeScript | Tipado |
| Tailwind CSS 4 | Estilos mobile-first |
| Express 5 | Servidor HTTP |
| better-sqlite3 | Base de datos SQLite |
| Railway | Hosting en la nube |
