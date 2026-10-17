# Mapa del proyecto SIGCA

**Revisado:** 2026-10-16
**Estado:** el proyecto tiene un único backend, `server.ts` + `server/`, que es la entrada principal. La antigua API parcial `backend/` fue retirada; la decisión se explica más abajo y en el README. La integración fue verificada con MongoDB (incluido reinicio y producción); el build de la imagen Docker no se pudo validar en este entorno, pero el build local y el arranque con `NODE_ENV=production` sí.

> **Actualización post-P0 (2026-10-16):** se corrigieron el arranque con `NODE_ENV=production`, las brechas de autorización/ownership, el `PUT` de citas, RN-20/RN-25/RN-29, el correlativo y la concurrencia de pagos, la suite de pruebas y la UI de cierre de caja. Verificado con MongoDB real/efímero: `npm test` 22/22, E2E de bloqueantes 43/43 y producción arranca.

Este documento distingue la consigna académica (`Proyecto_-Sistema-Integral-de-Gestion-de-Citas-y.md`) del estado observado en el código. La consigna define el alcance esperado; este mapa ubica la implementación actual.

## Arquitectura y flujo

```mermaid
flowchart TD
    Main[src/main.ts] --> App[src/App.vue]
    Main --> Router[src/router/index.ts]
    Router --> Views[vistas públicas y administrativas]
    Views --> Store[src/stores/appStore.ts]
    Store --> API[Express API: server.ts]
    API --> Repo[server/data/repository.ts]
    Repo --> Mongo[(MongoDB / Mongoose)]
    API --> Vite[Vite en desarrollo / dist en producción]
```

| Área | Ubicación | Función / estado |
|---|---|---|
| Frontend | `src/main.ts`, `src/App.vue` | Vue 3, Pinia, Vue Router, layouts público y administrativo. |
| Navegación | `src/router/index.ts` | Rutas públicas/privadas y guard por roles; restaura sesión llamando `/api/auth/me`. |
| Store/API | `src/stores/appStore.ts` | Estado de vistas, token JWT y consumo de rutas relativas `/api`. Las escrituras fallidas no deben convertirse en datos locales exitosos. |
| Backend único | `server.ts`, `server/routes/` | Express y Vite en el mismo origen; API de auth, usuarios, pacientes, responsables, servicios, citas, solicitudes, materiales, pagos, cajas, contenido, horarios, contacto y reportes. |
| Persistencia | `server/config/db.ts`, `server/data/repository.ts`, `server/models/` | MongoDB/Mongoose requerido al iniciar; semilla para colecciones vacías y carga de colecciones al caché del repositorio al arrancar. |
| Diseño | `docs/07-diseno/` | Prototipos de pantallas y tokens visuales. |

### Backend único

El repositorio llegó a tener dos APIs: `server/` (integrada, usada por `npm run dev`, Docker, frontend y pruebas) y `backend/` (parcial, solo auth/usuarios/servicios en el puerto 4000). `backend/` no aparecía en diagramas ni era referenciado por scripts, Compose, Dockerfile, frontend o tests, y duplicaba contratos. Se retiró para dejar una sola fuente de verdad: `server.ts` + `server/`. El código eliminado sigue disponible en el historial de Git (commit `e86db3c`).

En **Programar Cita**, el frontend admite paciente existente o alta de paciente nuevo; si es menor, solicita los datos obligatorios del responsable y lo asocia. La consulta de disponibilidad es `GET /api/citas/disponibilidad` y está declarada antes de la ruta genérica `GET /api/citas/:id`. Un 404 con el texto `Cita no encontrada` al consultar disponibilidad indica que el proceso backend activo no cargó esta ruta; reinícialo antes de volver a probar.

## Rutas principales

**Portal:** `/inicio`, `/servicios`, `/mision-vision`, `/educativo`, `/corporativo`, `/horarios-contacto`, `/agendar-cita`.

**Administración:** `/admin/dashboard`, `/admin/pacientes`, `/admin/responsables`, `/admin/servicios`, `/admin/solicitudes`, `/admin/citas`, `/admin/calendario`, `/admin/materiales`, `/admin/pagos`, `/admin/caja-diaria`, `/admin/contenido`, `/admin/usuarios`, `/admin/mensajes`.

## Ejecución

- `npm run dev`: API integrada y Vite en `http://localhost:3000`.
- `npm run build`: chequeo TypeScript del frontend y build de Vite.
- `npm run lint`: chequeo de tipos del frontend.
- `npm test`: ejecuta `scripts/test-api.ts`.
- `npm run seed`: ejecuta `scripts/seed.ts`; agrega fixtures a colecciones vacías. Solo borra datos con `SEED_RESET=true` explícito.
- Compose integrado en `compose.yaml` requiere `JWT_SECRET`; su build no quedó validado: en este entorno `npm ci` dentro del contenedor falla antes de instalar dependencias.

El backend necesita `MONGODB_URI` accesible y `JWT_SECRET` de al menos 32 caracteres. `.env.example` es una plantilla; no contiene una clave lista para producción. En Docker Compose, Mongo queda sin autenticación y la configuración es para desarrollo/demo local.

## Evaluación del alcance

Las pantallas y rutas para la mayoría de los módulos existen. El backend integrado implementa rutas y modelos para los módulos principales, reglas de citas, pagos y caja. Esta inspección de código no demuestra por sí sola la persistencia ni el cumplimiento end-to-end. No afirmar las RN-01 a RN-30 como aprobadas hasta ejecutar los flujos contra Mongo y comprobar reinicios, errores, roles y concurrencia.

Correcciones de esta revisión: conexión Mongo obligatoria; carga de datos existentes desde Mongo en el arranque; retiro de la sesión ADMIN ficticia; restauración de sesión contra `/auth/me`; y eliminación del fallback local de las escrituras de paciente, responsable, servicio, solicitud, cita y pago.

## Pendientes relevantes frente a la consigna

1. ✅ Build/lint/suite corregidos y ejecutados; validación con Mongo limpio, con datos previos y tras reinicio.
2. ✅ Persistencia verificada para pacientes, servicios, contenido, pagos, cajas y solicitud→cita.
3. ✅ Atomicidad/concurrencia de pagos y cierres corregida para una instancia (cola en proceso, contador atómico y compensación).
4. ⚠️ Parcial: las acciones principales ya muestran errores; falta revisar formularios secundarios y refresco de datos en todas las vistas.
5. ✅ API parcial de `backend/` retirada; queda un solo contrato (`server/`).
6. ✅ Seed académico cubre los mínimos y las credenciales ficticias están documentadas.
7. ⚠️ Pendiente: evidencias reproducibles (capturas reales) de la secuencia solicitud → cita → pagos → caja y de autorización por rol.

No se considera sistema clínico de producción. Usar únicamente datos ficticios hasta completar las revisiones de privacidad, auditoría y seguridad.
