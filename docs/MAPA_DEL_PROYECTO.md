# Mapa del proyecto SIGCA

**Revisado:** 2026-10-16
**Estado observado:** frontend Vue intenta consumir API con fallback local; existen dos implementaciones de backend incompatibles y dos configuraciones Compose. No considerar autenticación, persistencia ni requisitos funcionales verificados end-to-end.

Este documento es el índice de contexto del repositorio. Actualízalo cuando cambien rutas, módulos principales, modelo de datos, persistencia o comandos. La navegación y el modelo fuente de verdad siguen siendo los archivos de `src/`.

## Vista de arquitectura

```mermaid
flowchart TD
    Entry[main.ts] --> App[App.vue]
    Entry --> Router[router/index.ts]
    App --> Router
    App --> Layout{Ruta /admin}
    Layout --> PublicShell[Header + páginas públicas + Footer]
    Layout --> AdminShell[Sidebar + Header + páginas administrativas]
    Router --> PublicViews[views/public]
    Router --> AdminViews[views/admin]
    PublicViews --> Store[stores/appStore.ts]
    AdminViews --> Store
    Components[components] --> Store
    Store --> Types[types/index.ts]
    Store --> Seeds[data/mockData.ts]
    Store --> LocalStorage[(localStorage del navegador)]
```

### Puntos de entrada y responsabilidades

| Área | Ubicación | Responsabilidad |
|---|---|---|
| Arranque | `src/main.ts` | Crea Vue, instala Pinia y Vue Router, monta `App.vue`. |
| Shell | `src/App.vue` | Decide layout público/administrativo según prefijo `/admin`; monta modal global de comprobante. |
| Rutas | `src/router/index.ts` | Define rutas públicas y administrativas con guards de interfaz; el usuario por defecto invalida el cierre seguro. |
| Estado/dominio | `src/stores/appStore.ts` | Store Pinia único: datos, acciones de negocio y persistencia manual. |
| Contratos | `src/types/index.ts` | Tipos de usuarios, pacientes, citas, pagos, caja, materiales y contenido. |
| Datos de demo | `src/data/mockData.ts` | Semillas locales para la demostración. |
| API modular | `backend/src/server.ts` | Express, conexión Mongoose, healthcheck y rutas de auth/usuarios/servicios. |
| Usuarios | `backend/src/modules/users/` | Esquema de usuario, hash de contraseña y endpoints administrativos. |
| Autenticación | `backend/src/modules/auth/` | Login JWT, verificación de usuario activo y autorización por rol. |
| Servicios | `backend/src/modules/services/` | Catálogo público de activos y CRUD administrativo; precios en centavos enteros. |
| Bootstrap | `backend/src/seed/bootstrapAdmin.ts` | Alta única del administrador inicial desde variables locales. |
| Imagen de API | `backend/Dockerfile` | Compila TypeScript y ejecuta el servidor Node. |
| API legado | `server.ts`, `server/` | Backend integrado con Vite, repositorio, modelos y rutas de más módulos; manifiesto raíz actual ya no declara sus dependencias. |
| Compose legado | `docker-compose.yml`, `Dockerfile` | Alternativa distinta a `compose.yaml`; tiene Mongo sin auth y secret fijo, y la imagen no contiene Express/Mongoose en runtime. |
| Componentes comunes | `src/components/public/`, `src/components/admin/` | Headers, navegación y modales compartidos. |
| Vistas | `src/views/public/`, `src/views/admin/` | Pantallas asociadas a las rutas. |
| Estilos | `src/index.css` | Tailwind v4, tokens globales y reglas de impresión. |
| Diseño de referencia | `docs/07-diseno/` | 29 prototipos HTML; `serene_harmony/DESIGN.md` documenta tokens visuales. |

## Módulos y rutas

**Público**

| Ruta | Vista | Función |
|---|---|---|
| `/inicio` | `HomeView.vue` | Inicio del portal. |
| `/servicios` | `ServicesView.vue` | Catálogo de servicios. |
| `/mision-vision` | `MissionVisionView.vue` | Información institucional. |
| `/educativo` | `EducationalView.vue` | Contenido educativo. |
| `/corporativo` | `CorporateView.vue` | Oferta corporativa. |
| `/horarios-contacto` | `ScheduleContactView.vue` | Horarios y contacto. |
| `/agendar-cita` | `BookingRequestView.vue` | Solicitud pública de cita. |

**Administrativo**

| Prefijo de ruta | Vista | Función |
|---|---|---|
| `/admin/dashboard` | `DashboardView.vue` | Resumen operativo. |
| `/admin/pacientes` | `PatientsView.vue` | Pacientes. |
| `/admin/responsables` | `GuardiansView.vue` | Responsables/tutores. |
| `/admin/servicios` | `ServicesAdminView.vue` | Catálogo administrable. |
| `/admin/solicitudes` | `RequestsView.vue` | Bandeja de solicitudes. |
| `/admin/citas` | `AppointmentsView.vue` | Programación y gestión de citas. |
| `/admin/calendario` | `CalendarView.vue` | Agenda visual. |
| `/admin/materiales` | `MaterialsView.vue` | Materiales educativos. |
| `/admin/pagos` | `PaymentsView.vue` | Pagos y saldos. |
| `/admin/caja-diaria` | `CashRegisterView.vue` | Apertura, movimientos y cierre de caja. |
| `/admin/contenido` | `InstitutionalContentView.vue` | Contenido institucional. |
| `/admin/usuarios` | `UsersView.vue` | Usuarios y roles de demostración. |
| `/admin/mensajes` | `MessagesView.vue` | Mensajes recibidos. |

`/` redirige a `/inicio`; `/admin` redirige a `/admin/dashboard`.

## Estado y flujo de datos

- `useAppStore` intenta consumir múltiples rutas `/api/...` y mantiene fixtures como fallback local.
- La llamada usa rutas relativas, pero Vite no tiene proxy y la API no configura CORS; con `npm run dev`, las llamadas no llegan a `backend/`.
- El contrato tampoco coincide: Vue espera `success`, `data`, `nombre`, `rol` y `activo`; `backend/` devuelve `{ token, user }`, `{ services }` y campos `name`, `role`, `active`.
- El store marca `apiConnected = true` aunque `Promise.allSettled` rechace todas las peticiones. Las mutaciones capturan errores y modifican el fallback local, lo que aparenta guardar aunque no se persista.
- Sin sesión, `getStoredUser()` devuelve `initialUsers[0]` (ADMIN), por lo que el guard de Vue permite entrar a rutas administrativas. El backend limita rutas, pero la UI no es un control de seguridad.
- El backend modular persiste usuarios y servicios. El backend legado ofrece una implementación más amplia, pero la configuración activa no está unificada ni se ha validado end-to-end.
- El comprobante es una vista imprimible local. La consigna excluye explícitamente facturación electrónica, así que SAT-FEL no es criterio de aceptación; la etiqueta “SAT-FEL OK” y las afirmaciones del README sí deben aclararse para no prometer una integración inexistente.

## Desarrollo y validación

Requisitos: Node.js y npm. Scripts definidos en `package.json`:

```bash
npm install
npm run dev       # Vite en 0.0.0.0:3000
npm run lint      # vue-tsc --noEmit
npm run build     # vue-tsc y build de producción
npm run preview   # Vista previa en puerto 3000
npm run build --prefix backend
npm run dev --prefix backend
```

Validación de esta revisión (2026-10-16): frontend y backend compilan; el build del Compose legado crea una imagen, pero su runtime reporta Express/Mongoose/bcrypt/JWT como dependencias ausentes. No se encontró script `test` ni `seed` en `package.json`. `npm ci --dry-run` finalizó sin error. El CRUD/auth de `backend/` tuvo pruebas manuales anteriormente, pero no hay suite automatizada conectada.

## Evaluación y prioridades

**Fortalezas observadas:** separación clara entre vistas públicas y administrativas; tipos de dominio explícitos; un store reutilizado por ambos flujos; build de producción correcto; prototipos de diseño y tokens visuales documentados.

**Límite principal:** tratar el sistema como demostración, no como sistema clínico desplegable. Hay un API modular parcial y otro API legado; el frontend no autentica contra el API modular y cae silenciosamente a fixtures/local state. No introducir datos personales reales.

**Siguientes prioridades antes de uso real:**

1. Elegir una sola implementación API/Compose y alinear manifiestos, rutas, respuesta JSON y proxy/CORS.
2. Eliminar el usuario ADMIN por defecto en Pinia; sin token debe fallar cerrado y el login debe mapear `{token,user:{name,role}}` del backend.
3. Corregir la imagen Compose legado o retirar esa ruta; usar Mongo autenticado y secretos por entorno, sin secretos en el YAML.
4. Conectar frontend y backend con manejo de error visible; no permitir fallback local silencioso en operaciones de escritura.
5. Exponer `test`/`seed` como scripts npm; hacer el seed no destructivo o exigir confirmación y base explícita.
6. Extender API/Mongo a pacientes, responsables y citas, aplicando allí las reglas de negocio.
7. Diseñar privacidad, auditoría, retención y protección de información clínica conforme a las obligaciones aplicables.
8. Añadir pruebas end-to-end de solicitud→cita, saldos, pagos y caja; no marcar RN como completadas hasta correrlas.

### Alineación con la consigna académica

La consigna en `docs/Proyecto_-Sistema-Integral-de-Gestion-de-Citas-y.md` exige backend Node.js/Express, MongoDB/Mongoose, API REST, autenticación JWT y persistencia real. El estado es una demo frontend: no cumple todavía el alcance Full Stack ni se deben considerar operativas las transacciones simuladas del navegador.

| Requisitos | Estado observado |
|---|---|
| RF-01 portal público | Vistas y formularios presentes; solicitudes, mensajes y contenido no persisten en MongoDB. El catálogo aún no consume la API. |
| RF-02 autenticación y roles | El API modular tiene login/JWT y RBAC para usuarios/servicios, pero el login Vue espera un contrato diferente. El guard también da ADMIN por defecto cuando falta sesión. No está cumplido end-to-end. |
| RF-03–04 pacientes y responsables | Pantallas y datos locales; API/Mongo todavía no implementados. |
| RF-05 servicios | CRUD en `backend/`, pero Vue espera `{data}` y el API responde `{service}`; sin proxy, las vistas no persisten contra Mongo. |
| RF-06 solicitudes | Formulario y bandeja local presentes; no se persiste en servidor. |
| RF-07–08 citas y calendario | Vistas locales presentes; las reglas de disponibilidad y transiciones deben validarse en backend. |
| RF-09 materiales | Pantalla y asignación local presentes; falta API/DB. |
| RF-10 pagos | Parcial: admite montos positivos en UI y calcula saldo por paciente; el tipo de pago no requiere cita, no contempla anulaciones/estado, ni evita sobrepagos, y el comprobante aleatorio no garantiza unicidad. Usa `number` decimal. |
| RF-11 caja | Parcial: una sola caja local; faltan historial multi-caja/usuario, efectivo contado y diferencia, asociación obligatoria de pagos y bloqueo real de caja cerrada. |
| RF-12 contenido | Vista local presente; falta persistencia en MongoDB. |
| RF-13 usuarios | API administrativa, bcrypt, activación/desactivación y cambio de contraseña por ADMIN; falta integración de interfaz y recuperación segura de contraseña. |
| RN-01–30 | No hay cumplimiento verificable en servidor; algunas comprobaciones existen solo en UI. Implementar y probar del lado API antes de considerar las reglas cumplidas. |
| API, base Mongo/Mongoose | Implementación inicial de auth, usuarios y servicios; faltan los demás módulos y seeds completos de la consigna. |
| Entregables | `.env.example`, Docker y backend base presentes; faltan colección Postman, datos completos, README de credenciales ficticias y pruebas automatizadas. |

Hay dos configuraciones Compose. `compose.yaml` construye el API modular y Mongo con auth; en este Codespace no se pudo validar tráfico TCP entre contenedores. `docker-compose.yml` usa el backend legado, expone Mongo sin auth y define un JWT fijo. Su imagen compila, pero el runtime no contiene Express/Mongoose/bcrypt/JWT porque `package.json` raíz ya no los declara. El API legado tiene más rutas, pero los scripts npm actuales no lo arrancan ni ejecutan su seed/pruebas. El API modular sí compila y sus pruebas manuales históricas de auth/servicios pasaron, pero Vue no consume correctamente su contrato. No existe aún una combinación que haya pasado una prueba end-to-end.

## Cómo mantener este mapa

- Al añadir una ruta, actualizar la tabla de rutas y confirmar el registro en `src/router/index.ts`.
- Al cambiar persistencia, entidades o permisos, actualizar “Estado y flujo de datos” y “Evaluación”.
- Al cambiar scripts o herramientas, actualizar “Desarrollo y validación”. No registrar resultados de build como permanentes: volver a ejecutar la comprobación y fecharla.
- Mantener aquí referencias y decisiones estructurales; no copiar implementaciones completas. Los archivos fuente siguen siendo la autoridad.
