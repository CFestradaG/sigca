# SIGCA — Centro Armonía
### Sistema Integral de Gestión de Citas y Atención (Vue.js + Pinia + Vue Router)

Aplicación web empresarial desarrollada para **Centro Armonía**, centro especializado en psicología infantil, estimulación auditivo-verbal y salud mental familiar en Ciudad de Guatemala (Sedes Zona 10 Sixtino II y Zona 14 Europlaza).

> Mapa de arquitectura, módulos, estado actual y prioridades: [docs/MAPA_DEL_PROYECTO.md](docs/MAPA_DEL_PROYECTO.md).

---

## 🛠️ Tecnologías Principales

- **Frontend Framework**: [Vue 3](https://vuejs.org/) (Composition API con `<script setup lang="ts">`)
- **Enrutamiento**: [Vue Router 4](https://router.vuejs.org/) con rutas completas para portal público y sistema administrativo
- **Gestión de Estado**: [Pinia 3](https://pinia.vuejs.org/) con persistencia reactiva en `localStorage`
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) con paleta y tokens clínicos serenos
- **Bundler y Servidor**: [Vite 6](https://vite.dev/) en puerto 3000

---

## 🏛️ Arquitectura del Sistema

### 1. Portal Público
- **Inicio**: Hero cálido con carrusel clínico, sedes y llamadas a la acción directas.
- **Servicios y Tratamientos**: Catálogo con precios en Quetzales (Q), duración estimada y categorías (Psicología Infantil, Terapia de Lenguaje, Estimulación Auditivo-Verbal).
- **Misión y Visión**: Filosofía institucional, valores y enfoque integral centrado en la familia.
- **Contenido Educativo**: Artículos clínicos, guías de estimulación y recursos descargables.
- **Corporativo**: Evaluaciones para colegios, talleres para docentes y programas para empresas.
- **Horarios y Contacto**: Información de sedes, PBX, WhatsApp y formulario directo de consultas.
- **Solicitud de Cita en Línea**: Formulario de recepción con generación de código de seguimiento y derivación a la bandeja de recepción.

### 2. Sistema Administrativo Integral (RBAC)
- **Control de Roles**:
  - `ADMIN`: Acceso irrestricto a todos los módulos y configuración institucional.
  - `RECEPCION`: Pacientes, tutores, citas, bandeja de solicitudes, cobros y caja diaria.
  - `PROFESIONAL`: Agenda clínica asignada, expediente de sus pacientes y materiales.
- **Pacientes y Expediente Clínico**:
  - Cálculo automático de edad en años y meses.
  - Validación de tutores para menores de edad.
  - Historial de citas, pagos y saldo pendiente del paciente.
- **Bandeja de Solicitudes Web**:
  - Conversión de solicitudes públicas en citas confirmadas con asignación de terapeuta, horario y sede.
- **Programación de Citas y Calendario Clínico**:
  - Calendario mensual interactivo con filtros por fecha, estado y profesional.
- **Gestión de Pagos y Comprobantes Internos**:
  - Pagos completos y parciales, registro de método de pago (Efectivo, Tarjeta, Transferencia, Cheque) y generación de comprobante imprimible con correlativo interno y SAT-FEL.
- **Caja Diaria**:
  - Apertura con fondo inicial, registro de ingresos/egresos y arqueo para cierre.
- **Materiales Educativos y Contenido Web**:
  - Gestión de recursos y actualización de datos institucionales.

---

## 🚀 Ejecución del Proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (puerto 3000)
npm run dev

# Compilar para producción
npm run build
```

## MongoDB local con Docker

Docker Compose usa la imagen oficial de MongoDB y conserva los datos en el volumen `mongo_data`.
Las credenciales del ejemplo son solo para desarrollo local; no expongas MongoDB a una red pública.
En el primer arranque, MongoDB crea el usuario con esos valores. Cambiar `.env` después no rota
la contraseña dentro de un volumen ya inicializado; cámbiala también en MongoDB para mantener
el healthcheck y las conexiones funcionando. No uses `docker compose down -v` si deseas conservar
los datos del volumen.

```bash
cp .env.example .env
docker compose up -d mongo
docker compose ps
docker compose logs mongo
```

Para detener MongoDB sin borrar sus datos:

```bash
docker compose down
```

La API Express/Mongoose se construye junto con MongoDB y queda disponible localmente en
`http://localhost:4000/api/health`. Compose espera a que MongoDB esté saludable antes de iniciar la API.

```bash
docker compose up -d --build --wait
docker compose ps
curl http://localhost:4000/api/health
```

En entornos de desarrollo donde Docker no permita tráfico entre contenedores, inicia solo MongoDB
con Compose y ejecuta la API desde el workspace; esta carga las variables de `.env` desde la raíz:

```bash
docker compose up -d --wait mongo
npm run dev --prefix backend
```

### Usuarios y autenticación

Antes de iniciar la API, agrega a tu `.env` local un `JWT_SECRET` generado con
`openssl rand -hex 32`. Mantén la clave fuera de Git. Configura temporalmente
`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` y una `BOOTSTRAP_ADMIN_PASSWORD` de al menos
12 caracteres; luego crea el primer administrador con:

```bash
npm run seed:admin --prefix backend
```

El bootstrap no reemplaza usuarios existentes. Retira `BOOTSTRAP_ADMIN_PASSWORD` de `.env` después
de usarlo. La API ofrece `POST /api/auth/login`, `GET /api/auth/me` y gestión administrativa en
`/api/usuarios`; las rutas de usuarios requieren rol `ADMIN`. Los tokens Bearer duran una hora por
defecto. Roles internos: `ADMIN` (administrador), `RECEPCION` y `PROFESIONAL`.
