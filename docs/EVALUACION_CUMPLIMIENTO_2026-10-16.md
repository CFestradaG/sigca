# Evaluación de cumplimiento — SIGCA Centro Armonía

**Fecha de evaluación:** 2026-10-16
**Commit evaluado:** `e86db3c` (rama `main`)
**Insumos:** `docs/Proyecto_-Sistema-Integral-de-Gestion-de-Citas-y.md` (consigna), `docs/MAPA_DEL_PROYECTO.md` (mapa del equipo) y código del repositorio.
**Método:** revisión de código + ejecución local real (build, lint, suite existente) + prueba end-to-end contra una instancia efímera de MongoDB. No se levantó navegador para validación visual ni Docker (no disponible en el entorno).

> Este documento es una evaluación técnica independiente, no una nota oficial. La rúbrica incluye 4 puntos de defensa individual que aquí no se evalúan.
>
> **Actualización post-P0 (2026-10-16):** después de esta evaluación se corrigieron el arranque en producción, las brechas de autorización, el `PUT` de citas, la integridad de pagos/caja (RN-20, RN-25, RN-29 y concurrencia), la suite de pruebas y la UI de cierre de caja. Resultado verificado: `npm test` 22/22, E2E de bloqueantes 43/43, producción arranca. Ver `docs/CORRECCIONES_P0_2026-10-16.md`. Este informe se conserva como línea base del estado anterior; los P1/P2 siguen vigentes.

---

## 1. Veredicto

**Cumple parcialmente.** El alcance funcional está prácticamente completo: existen todos los módulos, la mayoría de endpoints, el portal público, el seed mínimo y la persistencia en MongoDB funciona (verificado tras reiniciar el servidor). Sin embargo, **no está listo para una entrega final sin correcciones**: hay brechas de autorización por rol, una vía para saltarse reglas de negocio de citas, fallos de integridad en pagos/caja, el arranque en producción (Docker) está roto y la suite de pruebas incluida falla.

**Estimación según rúbrica (sobre 96 puntos verificables + 4 de defensa): 72/96 ≈ 75 %, proyectado 72–76/100.** Es un proyecto con buena base funcional, pero con observaciones importantes de seguridad, reglas e integración.

Resultado de la verificación ejecutada:

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Pasa |
| `npm run build` (vue-tsc + tsc servidor + vite) | ✅ Pasa |
| `npm test` (suite incluida) | ❌ Falla en el Test 3 (`TypeError: Cannot read properties of undefined (reading 'toLowerCase')`) |
| `npm run dev` con MongoDB efímero | ✅ API y Vite levantan; se ejecutaron flujos reales |
| Persistencia tras reinicio | ✅ Paciente, servicio, contenido, pagos, cajas y referencia solicitud→cita sobreviven |
| Arranque con `NODE_ENV=production` (ruta de Docker) | ❌ Falla con `Missing parameter name at index 1: *` |
| Prueba end-to-end de 90 verificaciones | **76 cumplen / 14 brechas** |

---

## 2. Evidencia de las fallas más relevantes

### 2.1 El build de producción/Docker no arranca

`server.ts:81` registra `app.get('*', ...)`. Express 5.3 usa `path-to-regexp` v8, que ya no acepta `'*'` como patrón; lanza `Missing parameter name`. Reproducido con `NODE_ENV=production`:

```
Error: Missing parameter name at index 1: *; visit https://git.new/pathToRegexpError
```

El `Dockerfile` fija `NODE_ENV=production`, por lo que el contenedor documentado en `README.md` y `compose.yaml` no arranca, aunque `npm ci` funcionara. En desarrollo (`npm run dev`) sí funciona porque monta Vite en middlewares y no pasa por esa rama.

**Estado:** bloqueante para el entregable de ejecución/despliegue.

### 2.2 Brechas de autorización (RF-02 y RN-10)

Estas rutas solo exigen token, no rol ni pertenencia:

| Ruta | Línea | Problema |
|---|---|---|
| `POST/PUT/PATCH /api/pacientes` | `server/routes/patientRoutes.ts:16` | Un PROFESIONAL puede crear, editar y desactivar pacientes (201/200 verificados) |
| `POST/PUT /api/responsables` | `server/routes/guardianRoutes.ts:16` | Un PROFESIONAL puede crear/editar responsables |
| `POST/PUT/PATCH /api/citas` | `server/routes/appointmentRoutes.ts:7` | Un PROFESIONAL puede programar, reprogramar y cambiar estado de cualquier cita; el comentario de `:116` menciona un rol que no se valida |
| `GET /api/pagos` | `server/routes/paymentRoutes.ts:10` | Un PROFESIONAL ve todos los pagos y saldos |
| `GET /api/cajas`, `/:id`, `/:id/movimientos` | `server/routes/cashRoutes.ts:63,81,91` | Un PROFESIONAL ve cajas; una recepcionista ve cajas ajenas (verificado 200) |
| `GET /api/citas/:id` | `server/routes/appointmentRoutes.ts:45` | Un PROFESIONAL consulta citas de otro profesional (verificado 200) |
| `GET /api/reportes/dashboard` | `server/routes/reportRoutes.ts:7` | Métricas financieras disponibles para cualquier rol |

Además, `GET /api/pacientes/:id` devuelve citas y pagos a cualquier autenticado, y el detalle de paciente en la interfaz muestra la pestaña de pagos/saldo al PROFESIONAL, cuando RF-02 solo le permite información básica.

**Impacto:** el backend no verifica la matriz de permisos de RF-02; la interfaz oculta algunas páginas, pero la API queda expuesta con el token del profesional. Esto afecta directamente los 15 puntos de seguridad.

### 2.3 `PUT /api/citas/:id` permite saltarse reglas de negocio

`Repository.updateAppointment` (`server/data/repository.ts:604-632`) solo valida fechas/horas/servicio/profesional cuando cambian esos campos, pero acepta cualquier otro campo del `req.body` (`appointmentRoutes.ts:89-92`). Verificado:

- Cambiar `precioQ` de una cita existente a `Q1` → **200** (viola RF-07: el precio se copia al programar y no debe alterarse).
- Poner `estado: 'CANCELADA'` en una cita con pagos válidos → **200** (evade RN-27).
- Poner `estado: 'COMPLETADA'` en una cita CANCELADA → **200** (evade RN-05).

El endpoint `PATCH /api/citas/:id/estado` sí aplica RN-05/RN-27; el problema es que `PUT` es una puerta alterna. También permite cambiar `pacienteId` sin revisar RN-03/RN-04/RN-14.

### 2.4 Integridad de pagos y caja

Verificado en la prueba end-to-end:

1. **RN-20 se incumple para ADMIN.** Si el administrador no tiene caja abierta, `registerPayment` toma cualquier caja abierta de otro usuario (`repository.ts:956-963`). En la prueba, un pago del admin quedó asociado a `caj-1`, cuya dueña es `usr-2`, incumpliendo “todo pago debe asociarse a una caja abierta del usuario que lo registra”.
2. **Anulación cruzada.** Una recepcionista anuló un pago perteneciente a la caja abierta de otra recepcionista (`repository.ts:1042-1059` solo verifica que la caja esté abierta). Es una brecha de segregación de funciones; RF-11 limita a cada recepcionista a sus propias cajas.
3. **Concurrencia.** El número de comprobante se genera con `this.payments.length + 1` (`repository.ts:986-987`) y el pago/caja se escriben en dos operaciones sin transacción (`repository.ts:1023-1026`). Dos cobros simultáneos obtuvieron el mismo correlativo: uno respondió 201 y el otro 400. No hay `session`/transacción ni contador atómico.
4. **Cierre sin usuario responsable.** `CashRegister` no guarda quién cerró la caja (`server/models/CashRegister.ts`); RN-29 pide fecha y usuario responsable en cierres.
5. **Fecha UTC en caja y pagos.** `openCashRegister` y `registerPayment` usan `new Date().toISOString()` (`repository.ts:799-801,984-987`). En la prueba, a las 20:12 hora de Guatemala se registró `2026-10-17 02:12`, un día distinto al local. Los totales “del día” y el `fecha` de la caja pueden quedar corridos después de las 18:00.

### 2.5 La suite incluida no corre

`npm test` falla en el Test 3:

```
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at normalizedLocation (server/data/repository.ts:490:25)
    at DataRepository.validateAppointmentRules (...:496:10)
    at DataRepository.createAppointment (...:568:29)
    at runTests (scripts/test-api.ts:61:20)
```

`scripts/test-api.ts:61-67` llama `createAppointment` sin `sede`; la validación de sede agregada después no quedó cubierta por la prueba. El Test 2 pasó solo porque RN-04 se evalúa antes de la sede. Hoy la suite no es evidencia válida de cumplimiento.

### 2.6 Interfaz: operaciones obligatorias sin UI o con datos incorrectos

| Hallazgo | Ubicación | Efecto |
|---|---|---|
| No hay botón de anular pago en la UI | `src/views/admin/PaymentsView.vue` (no usa `annulPayment`) | RF-10.10 solo es demostrable por API/Postman |
| El cierre de caja no permite ingresar el efectivo contado | `src/views/admin/CashRegisterView.vue:51-54` + `src/stores/appStore.ts:659-667` | Envía `montoInicialQ` como contado; el arqueo y la diferencia salen mal y no se puede demostrar el paso 17 del procedimiento |
| Tras cerrar, “Efectivo actual en gaveta” usa `montoFinalQ` | `CashRegisterView.vue:40-43` | El servidor devuelve `efectivoContadoQ`; la UI muestra Q0 |
| No hay vista de cierres anteriores ni resumen de arqueo | `CashRegisterView.vue` | RF-11.11 y el resumen de caja quedan parciales |
| “Registrar Movimiento” de caja es solo local | `CashRegisterView.vue:57-66` + `appStore.ts:727-737` | Se pierde al recargar; operación simulada, no persiste ni afecta totales |
| Conversión de solicitud no guarda `citaGeneradaId` | `src/views/admin/RequestsView.vue:98` | RF-06 pide conservar la referencia; la API `POST /:id/convertir` sí lo hace, pero la UI no la usa |
| Contenido educativo y actividades corporativas no son editables | `src/views/admin/InstitutionalContentView.vue:7-17` | RF-12 incompleto: no hay edición de `posts`, `actividades`, `sedes` ni logo |
| Logo no editable | `src/components/public/PublicHeader.vue:63-65` | RF-01 pide logo cambiable; hay un ícono fijo y `content.logoUrl` no se usa |
| Totales incluyen pagos anulados | `PaymentsView.vue:95-97` y `DashboardView.vue:28-31` | RN-19 se incumple en los resúmenes de la UI |
| Fechas fijas de demo | `DashboardView.vue:9` (`2026-10-10`) y `CalendarView.vue:9-11` (octubre 2026, día 10) | El dashboard y el calendario no abren en “hoy” |
| Errores no mostrados en acciones | `AppointmentsView.vue:342,351,368`, `ServicesAdminView.vue` | Confirmar/completar/cancelar y editar servicio no esperan la promesa ni muestran el error; una falla de RN-27/RN-05 pasa desapercibida |
| Edad con meses incorrectos en frontend | `appStore.ts:352-367` | Para nacimientos cuyo día aún no llegó, muestra un mes de más; el cálculo del backend sí es correcto |
| `className` de React en Vue | `PublicHeader.vue:32` | El bloque no recibe el estilo flex esperado |

### 2.7 Persistencia y arquitectura

La persistencia funciona: se verificó que un paciente, un servicio, contenido, pagos, cajas y la referencia solicitud→cita sobreviven al reinicio. El problema es el diseño: **el repositorio en memoria es la fuente de verdad operativa** y MongoDB se sincroniza “por detrás” (`server/data/repository.ts:81-128`). Consecuencias:

- Varias escrituras actualizan memoria antes de Mongo (`createService` `:191-196`, `createRequest` `:693-698`, `openCashRegister` `:821-827`, `updateContent` `:1099-1105`). Si Mongo falla, la API responde error pero el dato queda visible en memoria hasta reiniciar (dato fantasma).
- No hay transacciones para pago + caja, ni para anulación + caja.
- El correlativo no es atómico; los IDs usan `Date.now()` y pueden colisionar en el mismo milisegundo.
- Los endpoints leen de la caché, no de Mongo; no se usa `populate()` ni agregaciones. Es una “estrategia equivalente” discutible, pero no la que pide el espíritu de la sección 7.
- Tras reiniciar, las respuestas incluyen `_id`, `createdAt`, `updatedAt`, `__v` que antes no aparecían: el contrato JSON cambia según el momento.
- El modelo `MaterialAssignment` (`server/models/MaterialAssignment.ts:24`) no se usa: las asignaciones se guardan en `Material.assignedPatientIds`, por lo que no existe la colección `asignacionesMateriales` de la sección 7 ni auditoría de quién/cuándo asignó.
- `server/models/InstitutionalContent.ts` está vacío (0 bytes): archivo muerto.
- El `backend/` alterno (auth/usuarios/servicios, puerto 4000) sigue en el repo sin integrarse; README lo advierte, pero son dos contratos y confunde la entrega.

### 2.8 Fallback de datos ficticios en el frontend

`src/stores/appStore.ts:99-111` inicializa el estado con `src/data/mockData.ts` y `fetchInitialData` usa `Promise.allSettled` (`:143-200`): si una llamada falla, conserva los fixtures y la interfaz puede mostrar datos ficticios como si fueran reales. En escrituras ya no hay fallback local, pero en lecturas sí. Esto contradice el espíritu de “no se aceptarán operaciones simuladas” y puede enmascarar una API caída durante la defensa.

### 2.9 Validaciones y requisitos puntuales

- RF-04 exige como obligatorios correo, dirección y fotografía del responsable; `guardianRoutes.ts:38-52` solo exige nombres, apellidos, parentesco y teléfono (los demás quedan vacíos por defecto).
- RF-10.7 pide consultar pagos por método: `GET /api/pagos` solo filtra por paciente, cita, caja y fecha; la UI tampoco tiene filtro por método.
- RF-10.9 historial de pagos de una cita: existe `GET /api/citas/:id/pagos`, pero no está expuesto claramente en la UI.
- RF-11.11 consultar cierres anteriores: la API `GET /api/cajas` existe, pero la UI no tiene historial (`allCashRegisters` en el store nunca se llena).
- RN-13 se cumple en código (excluye CANCELADA/COMPLETADA del traslape), pero no se probó end-to-end en esta evaluación.
- RN-25: los roles de pagos/cierre están bien en los endpoints principales, pero la anulación cruzada y el cierre por un admin de caja ajena no tienen una política clara.
- RN-29: pagos y anulaciones guardan usuario/fecha; los cierres no guardan quién cerró.
- RN-30: hay validaciones manuales y códigos correctos en la mayoría de rutas, pero no hay manejador centralizado de errores ni esquema de validación; varias rutas devuelven 500 para errores de datos y no diferencian 400/404/409.
- Seguridad: sin `helmet`, sin rate limiting, `cors()` abierto (`server.ts:34`), token en `localStorage`, 24 h de vigencia y sin revocación; un usuario desactivado conserva acceso hasta que expire su token (RN-08 solo cubre el login).

---

## 3. Cumplimiento por requisito funcional (RF)

| RF | Estado | Observación |
|---|---|---|
| RF-01 Portal público | **Parcial-alto** | Inicio con carrusel de 5 imágenes, navegación, servicios, misión/visión, educativo, corporativo, horarios, contacto y solicitud. Falla: logo no cambiable, contenido educativo/corporativo no editable y algunas imágenes externas. |
| RF-02 Autenticación y roles | **Parcial** | JWT + bcrypt + login/inactivo + RBAC en usuarios/contenido/servicios/materiales. Brechas graves de autorización en pacientes, responsables, citas, pagos y cajas. |
| RF-03 Pacientes | **Cumple** | CRUD, búsqueda, baja lógica, foto, edad automática (backend correcto), historial de citas/pagos en el detalle. Observación: edad en meses del frontend y foto opcional. |
| RF-04 Responsables | **Parcial** | Asociación múltiple y consulta funcionan. Correo, dirección y foto no son obligatorios como pide la consigna. |
| RF-05 Servicios | **Cumple** | CRUD, activo/inactivo, filtro público de activos y bloqueo de inactivos al agendar; precio copiado a la cita. |
| RF-06 Solicitudes | **Parcial** | Público crea PENDIENTE; recepción lista, rechaza y convierte. La UI no guarda `citaGeneradaId` aunque la API sí. |
| RF-07 Citas | **Parcial-alto** | Programar, confirmar, reprogramar, cancelar, completar, filtros e historial; RN-01/02/03/04/07/11/12/14 verificadas. Falla el bypass por `PUT` (precio y estados). |
| RF-08 Calendario | **Cumple** | Cuadrícula mensual, días con citas, detalle del día, filtro por profesional y datos vía API. Observación: mes/día iniciales fijos. |
| RF-09 Materiales | **Parcial-alto** | CRUD, activo/inactivo, asignación a pacientes activos y consulta. No usa la colección `asignacionesMateriales` ni auditoría de asignación. |
| RF-10 Pagos | **Parcial** | Abonos, pagos completos, saldo, comprobante, anulación API, filtros de fecha. Faltan UI de anulación, filtro por método y el resumen de la UI suma anulados. |
| RF-11 Caja diaria | **Parcial** | APERTURA, totales por método, cierre y diferencia funcionan por API. La UI no permite ingresar el contado, no muestra arqueo/cierre anterior y los movimientos manuales son locales. Brechas de autorización y RN-20 admin. |
| RF-12 Contenido institucional | **Parcial** | Edita nombre, slogan, teléfonos, correo, misión, visión y horarios. No edita publicaciones educativas, actividades corporativas, sedes ni logo. |
| RF-13 Usuarios | **Cumple** | Crear, consultar, modificar, rol, activar/desactivar y restablecer contraseña; admin-only; sin exponer hashes (verificado). |

---

## 4. Cumplimiento por regla de negocio (RN-01 a RN-30)

| RN | Estado | Evidencia |
|---|---|---|
| RN-01 | ✅ Verificada | Traslape 10:15 contra 10:00–10:45 → 400 RN-01; contigua 10:45 permitida. |
| RN-02 | ✅ Verificada | Domingo inactivo → 400 RN-02; horario dentro de apertura/cierre. |
| RN-03 | ✅ Verificada | Profesional inactivo → 400 RN-03; paciente/servicio inexistentes también se validan. |
| RN-04 | ✅ Verificada | Menor sin responsable → 400 RN-04. |
| RN-05 | ⚠️ Parcial | `PATCH` bloquea CANCELADA→COMPLETADA; `PUT /citas/:id` lo permite. |
| RN-06 | ✅ Verificada | Reprogramar COMPLETADA → 400 RN-06. |
| RN-07 | ✅ Verificada | Servicio inactivo → 400 RN-07. |
| RN-08 | ✅ Verificada | Login de usuario inactivo → 403 RN-08. Observación: token ya emitido sigue funcionando. |
| RN-09 | ✅ Verificada | Material a paciente inactivo → 400 RN-09. |
| RN-10 | ❌ Incumplida | Múltiples rutas privadas sin rol/ownership (sección 2.2). |
| RN-11 | ✅ Verificada | Fecha pasada → 400 RN-11. |
| RN-12 | ✅ Verificada | 45 min → 10:00–10:45. |
| RN-13 | ✅ En código | CANCELADA/COMPLETADA se excluyen del traslape; no se ejecutó caso dedicado. |
| RN-14 | ✅ Verificada | Paciente inactivo → 400 RN-14. |
| RN-15 | ✅ Verificada | Pago sin cita válida → 400 RN-15. |
| RN-16 | ✅ Verificada | Monto 0 → 400 RN-16. |
| RN-17 | ✅ Verificada | Pago superior al saldo → 400 RN-17. |
| RN-18 | ✅ Verificada | Saldo/estado PARCIAL/PAGADO automáticos. |
| RN-19 | ✅ En código | Pagos ANULADO excluidos del saldo y recálculo de caja; la UI de resúmenes no los excluye. |
| RN-20 | ⚠️ Parcial | Recepcionista sin caja → 400; ADMIN puede usar caja ajena (incumple). |
| RN-21 | ✅ Verificada | Caja cerrada no recibe pagos ni permite anular sus pagos. |
| RN-22 | ✅ Verificada | Segunda caja abierta → 400 RN-22. |
| RN-23 | ✅ Verificada | Cierre recalcula totales y diferencia (Q-10). |
| RN-24 | ✅ Verificada | Movimientos de caja persisten tras reinicio. |
| RN-25 | ⚠️ Parcial | Roles de cobro/cierre correctos; anulación cruzada sin ownership. |
| RN-26 | ✅ Verificada | `DELETE /api/pagos/:id` → 405. |
| RN-27 | ⚠️ Parcial | `PATCH` bloquea; `PUT /citas/:id` lo evade. |
| RN-28 | ✅ Aceptable | `roundQ()` redondea a 2 decimales; no usa centavos enteros pero cumple el resultado práctico. |
| RN-29 | ⚠️ Parcial | Pagos/anulaciones guardan usuario y fecha; cierres no guardan usuario. |
| RN-30 | ⚠️ Parcial | Muchas validaciones y códigos correctos, pero sin manejador central ni validación de esquema. |

---

## 5. Matriz de rúbrica (estimación)

| Criterio | Máx. | Estimado | Justificación |
|---|---:|---:|---|
| Portal público y navegación | 8 | **7.0** | Todos los módulos, carrusel de 5, router, responsive por clases; logo no editable y detalles visuales menores. |
| Administración de contenido institucional | 7 | **4.5** | Misión, visión, info principal, contacto y horarios editables; faltan educativo, corporativo, sedes y logo. |
| Autenticación, roles y seguridad | 15 | **9.5** | JWT/bcrypt/login/inactivo correctos, pero brechas de autorización y sin endurecimiento OWASP. |
| Gestión de pacientes y responsables | 12 | **10.5** | CRUD, baja lógica, asociación e historial; fallas de rol y campos obligatorios de responsable. |
| Gestión de citas y calendario | 15 | **12.0** | Casi todas las RN de citas verificadas y calendario funcional; bypass por PUT y errores de UI. |
| Gestión de pagos y control financiero | 12 | **8.5** | Núcleo de pagos/caja funciona y persiste; faltan UI de anulación/arqueo, RN-20 admin, concurrencia y totales. |
| Gestión de materiales | 5 | **4.0** | CRUD/asignación/RN-09 correctos; colección de asignaciones sin usar. |
| Integración Vue.js, API REST y MongoDB | 13 | **9.5** | Integración real y persistencia comprobada; caché en memoria, concurrencia, fallback mock y producción roto. |
| Validaciones y reglas de negocio | 5 | **3.5** | Mayoría implementada; RN-10, RN-20, RN-25, RN-27, RN-29 y RN-30 parciales. |
| Documentación y ejecución | 4 | **3.0** | README completo y Postman; suite rota, Docker no arranca y faltan evidencias. |
| **Subtotal evaluable** | **96** | **72.0** | |
| Defensa individual | 4 | No evaluada | Depende de la presentación del equipo. |
| **Total proyectado** | **100** | **72–76** | Aprobado con observaciones; no cumple plenamente. |

---

## 6. Entregables de la sección 12

| Entregable | Estado | Observación |
|---|---|---|
| A. Código fuente | ✅ | Frontend, backend, modelos, rutas, configuración, seed y `.env.example`. Existe un backend alterno parcial que conviene retirar. |
| B. Repositorio GitHub con historial | ⚠️ Parcial | Remoto y 8 commits; mensajes genéricos (“Fase4”, “fase 3”) y sin evidencia de autoría por integrante. |
| C. README | ✅/⚠️ | Muy completo (tecnologías, instalación, Mongo, variables, credenciales, seed, matriz RN); los integrantes siguen como “Estudiante 1/2/3” y afirma pruebas que hoy fallan. |
| D. Colección Postman | ✅/⚠️ | 23 solicitudes organizadas y variables dinámicas; solo los 3 login tienen scripts de prueba, no todas las carpetas como sugiere el README. |
| E. Evidencias | ⚠️/❌ | `docs/07-diseno` contiene prototipos/diseño, no capturas de la aplicación ejecutándose. No hay evidencias de pacientes, calendario, pagos y caja funcionando. |
| F. ZIP/Canvas | No verificable | Fuera del repositorio. |
| Datos de prueba (sección 11) | ✅ | 6 usuarios (1 admin, 2 recepción, 3 profesionales), 10 pacientes, 5 responsables, 5 servicios, 15 citas, 5 materiales, 5 solicitudes, 10 pagos, 3 cajas (1 abierta/2 cerradas), 7 horarios y contenido. |
| Credenciales demo | ✅ | Documentadas y coinciden con el seed; hashes con bcrypt. |

---

## 7. Lo que sí está bien

- Stack completo y correcto: Vue 3 + Pinia + Vue Router, Express 5, Mongoose/MongoDB, TypeScript.
- Los 13 módulos funcionales existen y están conectados a la API; no es una maqueta.
- El portal público está bien resuelto visualmente y cubre navegación, servicios, contenido, horarios y contacto.
- La mayoría de las reglas de negocio de citas y pagos está implementada y **verificada end-to-end** (RN-01, 02, 03, 04, 05 vía PATCH, 06, 07, 08, 09, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23, 24, 26).
- La persistencia en MongoDB funciona y sobrevive reinicios; el seed cumple los mínimos.
- El README y el mapa son honestos al declarar que faltaba validación end-to-end; el mapa es una buena base, aunque no detecta las brechas de este informe.
- `lint` y `build` local pasan.

---

## 8. Prioridades de corrección

### P0 — antes de la entrega

1. **Arreglar el arranque de producción:** cambiar `app.get('*', ...)` por `app.use((req,res) => ...)` o el patrón válido de Express 5 (`'/{*splat}'`) y probar `NODE_ENV=production` / Compose.
2. **Cerrar las brechas de autorización:** `requireRole` en pacientes, responsables, citas, pagos y cajas; ownership en `GET /cajas/:id`, movimientos y anulación; profesional solo sus citas y pacientes básicos; dashboard/reportes sin finanzas para profesional.
3. **Endurecer `PUT /api/citas/:id`:** lista blanca de campos, bloquear `precioQ`, `estado`, `pacienteId` y aplicar RN-05/RN-27/RN-03/RN-04/RN-14.
4. **Corregir integridad financiera:** eliminar el fallback de caja ajena del admin, exigir ownership para anular, generar correlativo con contador atómico/transacción y usar una transacción para pago+caja.
5. **Reparar `npm test`:** pasar `sede` en las llamadas o hacer la validación tolerante; idealmente añadir pruebas de integración con Mongo.
6. **Completar la UI de caja:** input de efectivo contado, mostrar esperado/diferencia, historial de cierres, y persistir o retirar el “movimiento manual”.

### P1 — importante para la defensa

- Exponer la anulación de pagos en `PaymentsView` y excluir anulados de los totales del dashboard y de pagos.
- Guardar `citaGeneradaId` en la conversión de solicitudes desde la UI (o usar `POST /:id/convertir`).
- Editar publicaciones educativas, actividades corporativas, sedes y logo desde contenido institucional.
- Agregar filtro por método de pago y por fecha en la UI de pagos; historial de pagos por cita.
- Corregir fechas fijas del dashboard/calendario y usar la zona `America/Guatemala` en fechas de negocio.
- Persistir el usuario que cierra la caja (RN-29) y usar la colección `asignacionesMateriales` o documentar la desviación.
- Manejar errores en las acciones de citas/servicios/contenido y mostrar confirmación/errores al usuario.
- Quitar el fallback de `mockData` en lecturas o marcar claramente el estado “sin conexión”.

### P2 — calidad y sostenibilidad

- Retirar `backend/`, `server/models/InstitutionalContent.ts` y `MaterialAssignment` si no se usan; unificar contratos.
- Añadir `helmet`, rate limiting, CORS con allowlist, validación con esquema (zod/express-validator), manejador global de errores y revocación/validación de usuario activo en cada request.
- Mapear DTOs para no exponer `_id`, `__v`, `createdAt`/`updatedAt` ni detalles internos.
- IDs con `crypto.randomUUID()` y correlativos por año.
- Añadir CI (lint + build + test) y capturas reales de la app para el entregable E.
- Reemplazar placeholders de integrantes y documentar la distribución real.

---

## 9. Conclusión

El proyecto **sí demuestra la integración tecnológica y el alcance funcional** que pide el curso: portal público, administración, citas, calendario, pagos, caja y MongoDB. La mayoría de los flujos principales se ejecutan y persisten. No obstante, **no cumple plenamente** la consigna en los ejes de seguridad/autorización, reglas de negocio financieras, algunas funcionalidades de la UI (anulación, arqueo, contenido educativo/corporativo) y ejecución en producción. Con las correcciones P0/P1, el proyecto puede pasar de un estimado de 72–76 a un rango de 85–90 sobre 100.
