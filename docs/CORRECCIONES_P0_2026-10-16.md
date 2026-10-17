# Correcciones P0 aplicadas — SIGCA Centro Armonía

**Fecha:** 2026-10-16
**Base:** commit `e86db3c` + cambios de esta sesión
**Objetivo:** resolver los bloqueantes identificados en `docs/EVALUACION_CUMPLIMIENTO_2026-10-16.md`.

---

## 1. Resultado general

| Verificación | Antes | Después |
|---|---|---|
| `npm run lint` | ✅ | ✅ |
| `npm run build` | ✅ | ✅ |
| `npm test` | ❌ TypeError en Test 3 | ✅ **22/22 pruebas** |
| Arranque `NODE_ENV=production` | ❌ `Missing parameter name` | ✅ Arranca y sirve el SPA |
| Prueba E2E de bloqueantes P0 | 14 fallos | ✅ **43/43 verificaciones** |
| Persistencia tras reinicio | ✅ | ✅ |
| Correlativo en cobros concurrentes | ❌ duplicado/fallo | ✅ único y serializado |

Comando de verificación usado: servidor real + instancia efímera de MongoDB (`mongodb-memory-server`), ejecutando login, roles, citas, pagos, cajas, reinicio y arranque en producción.

---

## 2. Arranque en producción / Docker

**Problema:** `server.ts` usaba `app.get('*')`, patrón inválido en Express 5 (`path-to-regexp` v8).

**Corrección (`server.ts`):**
- Fallback del SPA con middleware: `app.use((_req, res) => res.sendFile(...))`.
- Middleware `/api` que devuelve **JSON 404** para rutas de API inexistentes, en lugar de HTML.

**Verificado:** `NODE_ENV=production` arranca, `GET /` devuelve el HTML del SPA y `GET /api/no-existe` devuelve `404 {"success":false,...}`.

---

## 3. Autorización por roles y ownership

**Problema:** pacientes, responsables y citas solo validaban token; un PROFESIONAL podía crear pacientes/responsables, gestionar cualquier cita, ver pagos/cajas y consultar citas ajenas.

**Correcciones:**

| Archivo | Cambio |
|---|---|
| `server/routes/patientRoutes.ts` | `POST/PUT/PATCH` solo ADMIN/RECEPCIÓN. GET filtrado a pacientes con citas del profesional; detalle sin datos financieros para PROFESIONAL; `/pagos` solo ADMIN/RECEPCIÓN. |
| `server/routes/guardianRoutes.ts` | Escritura solo ADMIN/RECEPCIÓN; lectura filtrada a responsables de pacientes del profesional. |
| `server/routes/appointmentRoutes.ts` | Crear/reprogramar solo ADMIN/RECEPCIÓN; `GET /:id` verifica que la cita sea del profesional; `PATCH` de PROFESIONAL solo sus citas y solo a COMPLETADA; pagos/saldo de cita solo ADMIN/RECEPCIÓN. |
| `server/routes/paymentRoutes.ts` | Todo el módulo de pagos requiere ADMIN/RECEPCIÓN. |
| `server/routes/cashRoutes.ts` | Todo el módulo de cajas requiere ADMIN/RECEPCIÓN; recepción solo consulta sus propias cajas/movimientos; `/actual` ya no reutiliza la caja de otro usuario. |
| `server/routes/reportRoutes.ts` | Métricas financieras solo ADMIN/RECEPCIÓN. |
| `server/middleware/auth.ts` | Revalida el usuario contra la base en cada request: token de usuario desactivado deja de servir (403) y el rol se toma del estado actual. |
| `server/routes/userRoutes.ts` | Nuevo `GET /api/usuarios/directorio` (id, nombre, rol, especialidad) para mostrar agendas sin exponer datos privados. |

**Frontend acompañante:**
- `src/stores/appStore.ts`: `fetchInitialData` solo llama módulos permitidos por el rol; evita conservar fixtures financieros ficticios; usa el directorio para roles no admin; estado de caja vacío cuando no hay caja.
- `DashboardView`: oculta recaudación/solicitudes y acciones de gestión al PROFESIONAL.
- `AppointmentsView`: oculta programar/confirmar/reprogramar/cancelar al PROFESIONAL; muestra solo “Completar”; errores de acción visibles.
- `PatientsView` y `PatientDetailModal`: PROFESIONAL en modo lectura; sin edición, alta de responsables, programar cita ni pestaña de pagos/saldo.
- `ServicesAdminView`: RECEPCIÓN en modo lectura (el backend ya exigía ADMIN).
- `MaterialsView`: ya restringía creación/edición a ADMIN y asignación a ADMIN/PROFESIONAL.

**Verificado end-to-end:** 15 comprobaciones de rol/ownership, incluyendo 403 para profesional en pacientes/responsables/pagos/cajas/citas ajenas y 403 al reutilizar un token de usuario desactivado.

---

## 4. `PUT /api/citas/:id` endurecido

**Problema:** aceptaba cualquier campo del body; permitía cambiar `precioQ`, `estado` y `pacienteId`, evadiendo RF-07, RN-05 y RN-27.

**Correcciones:**
- `appointmentRoutes.ts`: lista blanca de campos (`fecha`, `horaInicio`, `servicioId`, `profesionalId`, `sede`, `observaciones`); rechaza cualquier otro campo con 400.
- `repository.ts updateAppointment()`: defensa en profundidad; rechaza `precioQ`, `pacienteId`, `fechaCreacion` y campos financieros; el estado solo se cambia con `allowStatusChange` interno desde `changeAppointmentStatus`.
- El estado se actualiza únicamente por `PATCH /api/citas/:id/estado` con RN-05/RN-27.

**Verificado:** PUT con `precioQ`, `estado` o `horaFin` devuelve 400; precio original se conserva; reprogramación válida devuelve 200; RN-05/RN-27 siguen bloqueando.

---

## 5. Integridad financiera (RN-20, RN-25, RN-29, concurrencia)

**Problemas corregidos:**

1. **RN-20:** se eliminó el fallback que permitía al ADMIN cobrar sobre la caja abierta de otro usuario. Ahora todo pago exige caja abierta del usuario que lo registra.
2. **RN-25 / segregación:** `annulPayment` exige ser dueño de la caja o ADMIN; una recepcionista ya no anula pagos de otra caja.
3. **Correlativo:** nuevo modelo `server/models/Counter.ts` con `$inc` atómico en Mongo; `nextVoucherNumber()` continúa la secuencia tras reinicios.
4. **Concurrencia:** cola `financeQueue` en `repository.ts` serializa apertura, cobro, anulación y cierre dentro del proceso; dos cobros simultáneos ya no leen el mismo saldo ni el mismo correlativo.
5. **Compensación:** si falla la actualización de caja tras crear el pago, se elimina el registro incompleto y se propaga el error; en anulación se restauran pago y caja si falla la segunda escritura.
6. **RN-29:** `CashRegister` guarda `usuarioCierreId` y `cerradoPor`; el cierre los setea. El seed de cajas cerradas también los incluye.
7. **Fechas de negocio:** cajas, pagos, anulaciones y métricas usan `America/Guatemala` (`guatemalaDate`, `guatemalaTime`, `guatemalaDateTime`) en lugar de la fecha UTC del servidor.
8. **Updates sobre documentos hidratados:** se eliminan `_id`, `__v`, `createdAt` y `updatedAt` antes de persistir cajas, pagos y contenido; sin esto Mongoose rechaza modificar `_id` al operar tras un reinicio. Verificado con cobro, anulación y cierre después de reiniciar.

**Verificado:** admin sin caja → 400 RN-20; admin con caja propia → 201; anulación cruzada → 400 RN-25; cierre sin contado → 400; cierre guarda usuario; pago en caja cerrada → 400; dos cobros concurrentes → 201/201 con comprobantes `REC-2026-0012` y `REC-2026-0013`; tras reinicio el siguiente es `REC-2026-0014`.

---

## 6. Suite de pruebas

**Problema:** `scripts/test-api.ts` llamaba `validateAppointmentRules`/`createAppointment` sin `sede`, lo que provocaba un `TypeError` en el Test 3.

**Correcciones:**
- Se agregó `sede` a todas las llamadas de la suite.
- Se añadieron pruebas nuevas:
  - Rechazo de `precioQ` y `estado` por `updateAppointment`.
  - RN-20 con ADMIN sin caja.
  - RN-25 en anulación cruzada.
  - Correlativos únicos y dos cobros concurrentes.

**Resultado:** `22 PASSED, 0 FAILED`.

---

## 7. UI de caja diaria

**Problemas:** no se podía ingresar el efectivo contado; el cierre enviaba el monto inicial; no se mostraba arqueo/diferencia; no había historial; los movimientos manuales eran locales y no persistían.

**Correcciones (`CashRegisterView.vue`, `appStore.ts`, `types/index.ts`):**
- Modal de cierre con input de **efectivo contado**, efectivo esperado y diferencia preliminar.
- Cierre real vía `POST /api/cajas/:id/cerrar`; se muestran errores del backend.
- Tarjeta de arqueo con esperado, contado, diferencia y usuario que cerró.
- **Historial de cajas/cierres anteriores** (`GET /api/cajas`) con estado, montos y diferencias.
- Se eliminó “Registrar Movimiento” local y su acción; ya no hay operaciones simuladas que se pierdan al recargar.
- Tras cerrar, la gaveta muestra el efectivo contado (no `montoFinalQ`, que el servidor nunca enviaba).

**Nota:** el arqueo y la diferencia se calcularon correctamente en la prueba E2E de API; la vista no se validó con navegador porque el entorno no dispone de uno automatizable.

---

## 8. Otros ajustes incluidos

- Pagos y dashboard excluyen comprobantes **ANULADO** de los totales (RN-19).
- Dashboard usa la fecha real de Guatemala (antes `2026-10-10` fijo).
- Se agregó anulación de pagos con motivo justificado en `PaymentsView`.
- Filtro de pagos por método/estado en el backend (`GET /api/pagos?metodoPago=...&estado=...`).
- Errores visibles en acciones de citas, servicios, contenido y caja.

---

## 9. Pendientes que NO son P0 (siguen abiertos)

1. Edición de contenido educativo, actividades corporativas, sedes y logo desde `InstitutionalContentView`.
2. Guardar `citaGeneradaId` al convertir solicitud desde la UI (la API ya lo soporta).
3. Reemplazar `mockData` como estado inicial de lecturas públicas o marcar el modo “sin conexión”.
4. Usar la colección `asignacionesMateriales` (hoy `MaterialAssignment` no se usa) o documentar la desviación.
5. Endurecimiento de seguridad: `helmet`, rate limiting, CORS con allowlist, revocación/expiración de tokens más estricta.
6. Retirar el backend alterno `backend/` y el archivo vacío `server/models/InstitutionalContent.ts`.
7. Evidencias reales (capturas de la aplicación), integrantes reales en README y CI de lint/build/test.
8. Transacciones de MongoDB multi-documento; la solución actual usa cola en proceso + compensación, suficiente para una sola instancia local, pero no para múltiples réplicas.

---

## 10. Archivos modificados/creados

**Backend**
- `server.ts`
- `server/middleware/auth.ts`
- `server/routes/patientRoutes.ts`
- `server/routes/guardianRoutes.ts`
- `server/routes/appointmentRoutes.ts`
- `server/routes/paymentRoutes.ts`
- `server/routes/cashRoutes.ts`
- `server/routes/reportRoutes.ts`
- `server/routes/userRoutes.ts`
- `server/data/repository.ts`
- `server/data/initialData.ts`
- `server/models/CashRegister.ts`
- `server/models/Counter.ts` *(nuevo)*
- `scripts/test-api.ts`
- `scripts/seed.ts`

**Frontend**
- `src/stores/appStore.ts`
- `src/types/index.ts`
- `src/views/admin/CashRegisterView.vue`
- `src/views/admin/PaymentsView.vue`
- `src/views/admin/DashboardView.vue`
- `src/views/admin/AppointmentsView.vue`
- `src/views/admin/PatientsView.vue`
- `src/views/admin/ServicesAdminView.vue`
- `src/components/admin/PatientDetailModal.vue`

---

## 11. Cómo verificar

```bash
npm install
cp .env.example .env        # completar JWT_SECRET (32+ caracteres) y MONGODB_URI
npm test                    # 22/22
npm run lint
npm run build
NODE_ENV=production npm run start   # requiere dist construido y Mongo accesible
```

Prueba E2E de bloqueantes: requiere MongoDB; se ejecutó con una instancia efímera y servidor real. Los resultados completos fueron **43/43**, incluyendo cobros, anulaciones y cierres sobre documentos ya hidratados desde Mongo.
