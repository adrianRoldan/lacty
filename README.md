# Lacty

Aplicación web (PWA) para el seguimiento diario de un bebé recién nacido: tomas (lactancia materna y/o suplemento dedo-jeringa), sueño, peso, suplementos, citas médicas y masajes post-frenectomía. Multi-cuenta y multi-bebé, con sincronización en tiempo real entre dispositivos y notificaciones push.

---

## Capturas

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/hoy.png" alt="Hoy — resumen diario" /><br/>
      <sub><b>Hoy</b> · resumen, progreso y avisos</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/historial.png" alt="Historial y gráficas" /><br/>
      <sub><b>Historial</b> · medias y gráficas</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/referencia.png" alt="Referencia por edad/peso" /><br/>
      <sub><b>Referencia</b> · alimentación y sueño</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/visitas.png" alt="Calendario de visitas" /><br/>
      <sub><b>Visitas</b> · calendario y dudas</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/mi-bebe.png" alt="Perfil del bebé y peso" /><br/>
      <sub><b>Mi bebé</b> · perfil y peso</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/modo-noche.png" alt="Modo noche y configuración" /><br/>
      <sub><b>Configuración</b> · modo noche</sub>
    </td>
  </tr>
</table>

> Coloca las imágenes en `docs/screenshots/` con esos nombres (`hoy.png`, `historial.png`, `referencia.png`, `visitas.png`, `mi-bebe.png`, `modo-noche.png`).

---

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 · TypeScript 6 · Vite 8 |
| **Estilos** | Tailwind CSS 4 (configuración en CSS vía `@theme`), mobile-first, modo claro/noche por variables CSS |
| **Gráficas** | Recharts 3 |
| **Backend** | Node.js · Express 5 |
| **Base de datos** | SQLite (`better-sqlite3`), datos como JSON por fila |
| **Sesiones** | `express-session` + `connect-sqlite3` (store en `sessions.db`) |
| **Auth** | `bcryptjs` (hash de contraseñas) · `express-rate-limit` (límite en endpoints de auth) |
| **Tiempo real** | Server-Sent Events (SSE) + polling de respaldo por versiones |
| **Push** | Web Push (`web-push`, VAPID) + Service Worker |
| **PWA** | `manifest.json` + `sw.js` (instalable; push en iOS como app en pantalla de inicio) |
| **Hosting** | Railway (producción) o local + Cloudflare Tunnel |

La navegación del cliente es por estado interno (no usa router). El cliente HTTP centralizado vive en `src/api/index.ts`.

---

## Funcionalidades

### Cuentas y familia (multi-tenant)
- Registro / login / logout con sesión por cookie.
- **Cuenta = familia**: varios usuarios comparten los mismos datos vía **código de invitación**.
- Rol de administrador (puede expulsar miembros); opción de abandonar la cuenta.
- **Varios bebés** por cuenta, con cambio de bebé activo. Todos los datos están aislados por cuenta y por bebé.

### Hoy (resumen diario)
- Timeline cronológico de tomas y sueños del día, con huecos entre tomas.
- Tarjetas de estadísticas: nº de tomas, ml totales, ml jeringa, ml pecho (estimado), minutos de pecho y sueño del día.
- **Barras de progreso** frente a la referencia por edad/peso: tomas/día, ml/día y **horas de sueño/día**.
- Medias del día (entre tomas, ml/toma, duración de sueño, sueño total hoy, nº de sueños).
- **Avisos**: tiempo desde la última toma (alerta si supera el máximo recomendado, incluso si fue el día anterior), tiempo despierto (alerta al superar la ventana de vigilia) y próxima cita.
- Cuidados diarios (vitamina D, probiótico, masajes) con recordatorios y accesos rápidos (FABs) para iniciar sueño o toma de pecho.

### Tomas
- **Pecho**: minutos por lado (izq/der), con **estimación de ml** a partir de la tabla de referencia y de la media histórica del propio bebé.
- **Suplemento dedo-jeringa**: ml medidos.
- Soporte de toma en curso; edición y borrado.

### Sueño
- Registro inicio/fin, con sueño en curso.
- **Reparto por medianoche**: un sueño a caballo entre dos días contabiliza en cada día la parte correspondiente (lógica única reutilizada en Hoy, Historial y gráficas).

### Historial
- Agrupado por mes y día, con filtros por tipo (tomas / sueños) y periodo (7/14/30 días / siempre).
- **Resumen de medias** que respeta el filtro de periodo.
- Gráficas: ml, minutos de pecho, nº de tomas, peso, **sueño total/día** y duración media por siesta.

### Referencia
- Rangos orientativos de alimentación por días de vida; a partir del día 7 usa la fórmula **150–180 ml/kg/día** si hay peso.
- Máximo tiempo entre tomas, explicación de la estimación de ml de pecho.
- **Sueño**: horas/día y ventana de vigilia por edad, más nota informativa sobre el ciclo de sueño (~45–50 min).

### Visitas y dudas
- Calendario mensual de eventos por categoría (pediatra, matrona, fisio, vacuna…); **doble clic en un día** para crear evento; próximos eventos; notas pre/post-visita.
- Gestión de **dudas** (consultas) vinculables por categoría a las visitas.

### Peso y suplementos
- Historial de peso con variación respecto al registro anterior (p. ej. `+140 g en 2 días`) y gráfica de evolución.
- **Vitamina D** y **probiótico**: activación, nombre del medicamento, recordatorio horario y rachas.
- **Frenectomía**: 5 masajes/día durante 21 días, horas recomendadas calculadas y cuenta atrás.

### Configuración
- Tema **claro / noche**.
- **Notificaciones push** por dispositivo, con umbrales configurables por bebé (sin toma en X, sin sueño en X, masaje pendiente) y envío de notificación de prueba.

### Sincronización
- Cambios reflejados al instante en todos los dispositivos vía SSE, con polling de respaldo (compara versiones por recurso y refetchea solo lo cambiado) robusto a túneles/proxies.

---

## Arquitectura

```
Producción                                   Desarrollo
┌──────────┐   HTTPS   ┌─────────────────┐   ┌──────────┐  proxy /api  ┌──────────┐
│ Browser  │ ────────► │ Express          │   │ Browser  │ ───────────► │ Vite     │ ──► Express
│ (PWA)    │           │  /api/* → SQLite │   │ (local)  │              │ :5174    │     :3001
└──────────┘           │  /*     → dist/  │   └──────────┘              └──────────┘
      ▲  SSE /api/events│  push (VAPID)   │
      └─────────────────┴─────────────────┘
```

- **Servidor** (`server.js`): API REST bajo `/api/*` y, en producción, sirve el build estático (`dist/`) con fallback SPA.
- **Persistencia**: SQLite. Tablas de datos (`feedings`, `rests`, `weights`, `vitamind`, `probiotics`, `massages`, `consultations`, `calendar`) guardan cada registro como JSON; más `accounts`, `users`, `babies`, `config`, `push_subscriptions`, `notification_prefs`. Migración de esquema automática al arrancar.
- **Seguridad**: `/api/*` protegido por sesión (excepto auth e info pública); contraseñas con bcrypt; rate-limit en auth; datos siempre filtrados por `accountId` de la sesión.
- **Scheduler de notificaciones**: tarea cada 60 s que evalúa umbrales por bebé y envía push (`web-push`).

---

## Estructura del proyecto

```
server.js                  Servidor Express (API + estáticos + push + scheduler)
sw.js / public/            Service Worker, manifest e iconos PWA
src/
├── api/index.ts           Cliente HTTP (fetch + suscripción SSE)
├── App.tsx                Raíz: estado global, navegación, sincronización
├── theme.tsx              Contexto de tema claro/noche
├── components/            Vistas (Hoy, Historial, Referencia, Visitas, Perfil, Config…)
├── data/referenceTable.ts Tabla de referencia editable (alimentación y sueño)
├── hooks/                 Hooks (useElapsedMinutes, useLocalStorage)
├── utils/                 Cálculos (feedingUtils, dateUtils, pushNotifications)
└── types/index.ts         Interfaces TypeScript
```

---

## Comandos

```bash
npm install            # Instalar dependencias
npm run start          # Desarrollo: Vite (:5174) + servidor API (:3001)
npm run dev            # Solo frontend (Vite)
npm run server         # Solo servidor API
npm run serve          # build + servir en un solo proceso (producción local)
npm run build          # Compilar (tsc -b && vite build)
npm run lint           # ESLint
npx tsc --noEmit       # Verificación de tipos
npm run create-user    # Alta de usuario por CLI
```

---

## Despliegue

**Railway** (recomendado): build `npm run build`, start `node server.js`, volumen persistente montado y `DB_PATH=/data/lacty.db`. Variables `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` para push estable (si no, se generan al vuelo).

**Acceso puntual desde fuera** con el servidor local encendido:

```bash
npm run start
cloudflared tunnel --url http://localhost:5174
```

---

> Los rangos de la tabla de referencia son **orientativos** y no constituyen diagnóstico médico; edítalos en `src/data/referenceTable.ts` según indicación profesional.
