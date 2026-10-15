# SIGCA — Centro Armonía
### Sistema Integral de Gestión de Citas y Atención Clínica

> **Centro Armonía**: Especialistas en Psicología Infantil, Neurodesarrollo y Estimulación Auditivo-Verbal (EAV) en Ciudad de Guatemala.

---

## 👥 Integrantes del Equipo y Distribución de Responsabilidades (Sección 13)

| Integrante | Rol Asignado | Responsabilidades Principales |
|---|---|---|
| **Estudiante 1** | Backend & Base de Datos | Modelos Mongoose, API REST, persistencia MongoDB, endpoints de Pacientes, Responsables, Servicios y Contenido. |
| **Estudiante 2** | Frontend & Integración | Interfaces Vue 3, Vue Router, Pinia, integración con API REST, formularios reactivos, portal público y calendario. |
| **Estudiante 3** | Seguridad & Control Financiero | Autenticación JWT, RBAC, gestión de citas (RN-01 a RN-07), pagos, saldos, arqueo de caja diaria y pruebas automatizadas. |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [Vue 3](https://vuejs.org/) (Composition API `<script setup lang="ts">`), [Vue Router 4](https://router.vuejs.org/) con Navigation Guards por roles, [Pinia](https://pinia.vuejs.org/).
- **Backend**: [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/).
- **Base de Datos**: [MongoDB 6](https://www.mongodb.com/) con modelado [Mongoose](https://mongoosejs.com/).
- **Seguridad**: JSON Web Tokens ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)), Hashing con [bcryptjs](https://github.com/dcodeIO/bcrypt.js).
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) y fuentes de Google Fonts (Inter, Nunito Sans, Material Symbols).
- **Contenedores**: [Docker](https://www.docker.com/) y Docker Compose con red interna y healthcheck.
- **Pruebas y API**: Suite de pruebas automatizadas en TypeScript y colección exportada de Postman.

---

## 🔐 Credenciales de Demostración (Sección 11)

| Rol | Correo Electrónico | Contraseña | Capacidades y Permisos |
|---|---|---|---|
| **ADMINISTRADOR** | `smorales@centroarmonia.com.gt` | `Admin123!` | Control total: usuarios, contenido, servicios, pacientes, citas, pagos, todas las cajas y reportes. |
| **RECEPCIONISTA 1** | `recepcion@centroarmonia.com.gt` | `Recep123!` | Registro de pacientes, tutores, citas, cobros, comprobantes y apertura/cierre de su propia caja. |
| **RECEPCIONISTA 2** | `recepcion2@centroarmonia.com.gt` | `Recep123!` | Cobros en caja alterna y programación de citas. |
| **PROFESIONAL (EAV)** | `acastillo@centroarmonia.com.gt` | `Profe123!` | Consulta de su agenda personal, expediente básico de pacientes, marcar citas completadas y asignar materiales. |
| **PROFESIONAL (Psicología)** | `evalencia@centroarmonia.com.gt` | `Profe123!` | Agenda de psicología infantil y neurodesarrollo. |
| **PROFESIONAL (Lenguaje)**| `mramirez@centroarmonia.com.gt` | `Profe123!` | Agenda de terapia del lenguaje y articulación. |

---

## 🚀 Instrucciones de Instalación y Ejecución

### 1. Requisitos Previos
- Node.js versión 18 o superior.
- npm versión 9 o superior.
- MongoDB instalado localmente (o Docker para ejecutar el contenedor de base de datos).

### 2. Variables de Entorno
Copie el archivo de ejemplo:
```bash
cp .env.example .env
```
Contenido por defecto:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/sigca_armonia
JWT_SECRET=sigca_centro_armonia_secret_key_2026_udg
```

### 3. Instalación de Dependencias
```bash
npm install
```

### 4. Carga de Datos de Prueba (Seed Script - Sección 11)
El script siembra automáticamente las 13 colecciones requeridas (1 Admin, 2 Recepcionistas, 3 Profesionales, 10 Pacientes, 5 Responsables, 5 Servicios, 15 Citas, 5 Materiales, 5 Solicitudes, 10 Pagos, 3 Cajas abiertas y cerradas, Horarios y Mensajes):
```bash
npm run seed
```

### 5. Ejecución del Servidor Integrado (Frontend + API REST)
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 6. Ejecución de Pruebas Automatizadas de Reglas de Negocio
```bash
npm test
```
Ejecuta la suite de pruebas unitarias y de integración que valida el cumplimiento estricto de las reglas RN-01 a RN-30 (traslapes, menores sin responsable, horarios, cálculo de saldo, estado financiero, no eliminación física, arqueo de caja y diferencias).

---

## 🐳 Despliegue con Docker y Docker Compose

Para levantar tanto el servicio de MongoDB como la aplicación compilada con un solo comando:

```bash
# Construir imágenes y levantar contenedores en segundo plano
docker-compose up --build -d

# Ver registros en tiempo real
docker-compose logs -f

# Detener contenedores
docker-compose down
```

El servicio `app` esperará a que el contenedor `sigca-mongodb` reporte estado saludable (`service_healthy`) antes de iniciar.

---

## 📋 Matriz de Cumplimiento de Reglas de Negocio (RN-01 a RN-30)

| Código | Regla de Negocio | Implementación en Backend | Estado |
|---|---|---|---|
| **RN-01** | No citas traslapadas para el mismo profesional | Validación de intervalo `[horaInicio, horaFin)` en `validateAppointmentRules()` | ✅ Implementado |
| **RN-02** | Respetar horarios de atención configurados | Validación contra colección `horarios` según el día de la semana | ✅ Implementado |
| **RN-03** | Paciente, servicio y profesional deben estar activos | Comprobación de estado `activo / ACTIVO` de las 3 entidades | ✅ Implementado |
| **RN-04** | Menores de 18 años requieren responsable antes de agendar | Cálculo de edad con fecha de nacimiento; exige `responsableIds.length > 0` | ✅ Implementado |
| **RN-05** | Citas CANCELADAS no pueden pasar a COMPLETADA | Validación de máquina de estados en `changeAppointmentStatus()` | ✅ Implementado |
| **RN-06** | Citas COMPLETADAS no pueden reprogramarse | Bloqueo de mutación de fecha/hora en citas en estado COMPLETADA | ✅ Implementado |
| **RN-07** | Servicios inactivos no pueden seleccionarse | Filtro y validación de estado del servicio antes de crear cita | ✅ Implementado |
| **RN-08** | Usuarios inactivos no pueden iniciar sesión | Rechazo en endpoint `POST /api/auth/login` con código HTTP 403 | ✅ Implementado |
| **RN-09** | Materiales solo a pacientes activos | Validación de estado activo en `POST /api/materiales/:id/asignar` | ✅ Implementado |
| **RN-10** | Operaciones privadas requieren autenticación/autorización | Middlewares `authenticateToken` y `requireRole` en Express | ✅ Implementado |
| **RN-11** | No citas en fechas u horas pasadas | Verificación de fecha y hora actual al programar | ✅ Implementado |
| **RN-12** | Hora de fin calculada con duración del servicio | `horaFin = horaInicio + duracionMinutos` | ✅ Implementado |
| **RN-13** | CANCELADAS y COMPLETADAS no bloquean horarios futuros | Exclusión de citas canceladas y completadas en verificación de traslape | ✅ Implementado |
| **RN-14** | Pacientes inactivos no pueden recibir nuevas citas | Validación de `paciente.estado === 'ACTIVO'` | ✅ Implementado |
| **RN-15** | Pagos asociados a citas existentes | Validación de existencia de `citaId` | ✅ Implementado |
| **RN-16** | Monto de pago > 0 | Validación estricta `montoQ > 0` | ✅ Implementado |
| **RN-17** | Total pagado no supera precio de la cita | Control `totalPagado + montoQ <= precioQ` | ✅ Implementado |
| **RN-18** | Saldo pendiente calculado automáticamente | `saldo = roundQ(precioQ - totalPagosValidos)` | ✅ Implementado |
| **RN-19** | Pagos anulados no cuentan en saldo ni ingresos | Exclusión de pagos con `estado === 'ANULADO'` en cálculos | ✅ Implementado |
| **RN-20** | Pagos vinculados a caja abierta del usuario | Asociación obligatoria a caja con `estado === 'ABIERTA'` | ✅ Implementado |
| **RN-21** | No pagos en cajas cerradas | Rechazo de transacciones sobre cajas cerradas | ✅ Implementado |
| **RN-22** | Una sola caja abierta por usuario | Restricción en `POST /api/cajas/abrir` | ✅ Implementado |
| **RN-23** | Cierre calcula totales por método y esperado | Sumatorias por EFECTIVO, TRANSFERENCIA, TARJETA y total | ✅ Implementado |
| **RN-24** | Historial de movimientos conservado | Registro inmutable de ingresos y egresos en la caja | ✅ Implementado |
| **RN-25** | Solo usuarios autorizados registran pagos y cierran caja | RBAC verificado en endpoints financieros | ✅ Implementado |
| **RN-26** | Pagos no se eliminan físicamente | `DELETE /api/pagos/:id` bloqueado con HTTP 405 | ✅ Implementado |
| **RN-27** | Cita con pagos válidos no puede cancelarse | Exige anular pagos primero en caja abierta antes de cancelar | ✅ Implementado |
| **RN-28** | Precisión monetaria de dos decimales | Estrategia de centavos enteros con función `roundQ()` | ✅ Implementado |
| **RN-29** | Auditoría de fecha y usuario en pagos/anulaciones | Registro de `usuarioId`, `atendidoPor`, `anuladoPor` y timestamps | ✅ Implementado |
| **RN-30** | Validación de datos y códigos HTTP apropiados | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict | ✅ Implementado |

---

## 📮 Colección Postman

El archivo `SIGCA-Centro-Armonia.postman_collection.json` se encuentra en la raíz del repositorio. Incluye:
- Manejo dinámico de variables de entorno (`baseUrl`, `adminToken`, `recepToken`, `profToken`).
- Solicitudes organizadas por carpetas para todos los endpoints.
- Scripts de prueba automatizados en JavaScript que guardan tokens al iniciar sesión y validan los estados de respuesta HTTP.

---

## 🧪 Procedimiento de Evaluación Funcional (Sección 16)

Para demostrar el sistema frente al docente:
1. **Iniciar sesión como Administrador**: Usar el botón "Iniciar Sesión" en la cabecera o seleccionar `smorales@centroarmonia.com.gt`.
2. **Registrar un paciente**: Ir a *Pacientes* y crear un nuevo registro.
3. **Asociar un responsable**: Asignar un tutor legal o padre de familia.
4. **Crear un servicio con precio**: En *Servicios*, registrar una nueva especialidad (ej. Estimulación Sensorial, Q350).
5. **Programar una cita**: Agendar en una fecha futura.
6. **Intentar programar cita en horario ocupado**: Comprobar el bloqueo inmediato de traslape (RN-01).
7. **Confirmar la cita**: Cambiar estado de PENDIENTE a CONFIRMADA.
8. **Consultar en Calendario**: Visualizar la cita en la vista de cuadrícula mensual.
9. **Abrir caja con monto inicial**: En *Caja Diaria*, abrir turno con Q200.00.
10. **Registrar abono parcial**: Pagar Q150.00 de una cita de Q350.00.
11. **Consultar saldo pendiente**: Verificar que refleja automáticamente Q200.00 de saldo y estado PARCIAL.
12. **Registrar segundo pago**: Abonar los Q200.00 restantes.
13. **Verificar estado PAGADO**: Comprobar que el saldo es Q0.00 y el estado cambia a PAGADO.
14. **Consultar comprobante**: Generar e imprimir el comprobante con correlativo interno `REC-2026-XXXX`.
15. **Registrar pagos multimetodo**: Efectivo, Transferencia y Tarjeta.
16. **Consultar ingresos del día**: Ver el desglose discriminado en la vista de caja.
17. **Arqueo y efectivo contado**: Ingresar el monto físico contado en caja.
18. **Cerrar la caja**: Verificar el cálculo automático de sobrante o faltante.
19. **Verificar bloqueo en caja cerrada**: Intentar registrar un pago adicional y comprobar que es rechazado (RN-21).
20. **Cambiar de rol a Profesional**: Probar ingresar a *Usuarios* y verificar que el guard de interfaz bloquea el acceso por permisos insuficientes.
