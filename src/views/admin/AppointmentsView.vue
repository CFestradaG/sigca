<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import { Appointment, AppointmentStatus } from '../../types';

const store = useAppStore();
const router = useRouter();

const statusFilter = ref<'TODAS' | AppointmentStatus>('TODAS');
const professionalFilter = ref<string>('TODOS');
const dateFilter = ref<string>('');

const showNewAptModal = ref(false);
const reschedulingApt = ref<Appointment | null>(null);
const errorMsg = ref('');

const form = ref({
  pacienteId: store.patients[0]?.id || '',
  servicioId: store.services[0]?.id || '',
  profesionalId: store.users.find((u) => u.role === 'PROFESIONAL')?.id || store.users[0]?.id || '',
  fecha: new Date().toISOString().slice(0, 10),
  horaInicio: '09:00',
  horaFin: '09:45',
  sede: 'Zona 10 - Sixtino II',
  observaciones: '',
});

const rescheduleData = ref({
  fecha: '',
  horaInicio: '09:00',
  horaFin: '09:45',
});

const handleOpenNew = () => {
  errorMsg.value = '';
  form.value = {
    pacienteId: store.patients[0]?.id || '',
    servicioId: store.services[0]?.id || '',
    profesionalId: store.users.find((u) => u.role === 'PROFESIONAL')?.id || store.users[0]?.id || '',
    fecha: new Date().toISOString().slice(0, 10),
    horaInicio: '09:00',
    horaFin: '09:45',
    sede: 'Zona 10 - Sixtino II',
    observaciones: '',
  };
  showNewAptModal.value = true;
};

const handleCreateAppointment = () => {
  const patient = store.patients.find((p) => p.id === form.value.pacienteId);
  if (!patient) return;

  // RF-04 Validation: minor must have guardian
  if (store.isMinor(patient.fechaNacimiento)) {
    const guardians = store.getPatientGuardians(patient.id);
    if (guardians.length === 0) {
      errorMsg.value = `Regla RF-04: El paciente ${patient.nombres} ${patient.apellidos} es menor de 18 años y debe tener al menos un responsable registrado antes de programar una cita.`;
      return;
    }
  }

  const srv = store.services.find((s) => s.id === form.value.servicioId) || store.services[0];

  store.createAppointment({
    pacienteId: form.value.pacienteId,
    servicioId: srv.id,
    profesionalId: form.value.profesionalId,
    fecha: form.value.fecha,
    horaInicio: form.value.horaInicio,
    horaFin: form.value.horaFin,
    precioQ: srv.precioQ,
    estado: 'PENDIENTE',
    observaciones: form.value.observaciones.trim(),
    sede: form.value.sede,
  });

  showNewAptModal.value = false;
};

const handleSaveReschedule = () => {
  if (!reschedulingApt.value) return;
  store.rescheduleAppointment(
    reschedulingApt.value.id,
    rescheduleData.value.fecha,
    rescheduleData.value.horaInicio,
    rescheduleData.value.horaFin
  );
  reschedulingApt.value = null;
};

const filteredAppointments = computed(() => {
  return store.appointments
    .filter((a) => (statusFilter.value === 'TODAS' ? true : a.estado === statusFilter.value))
    .filter((a) => (professionalFilter.value === 'TODOS' ? true : a.profesionalId === professionalFilter.value))
    .filter((a) => (dateFilter.value ? a.fecha === dateFilter.value : true))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
});

const goToPatient = (patientId: string) => {
  store.setSelectedPatientId(patientId);
  router.push('/admin/pacientes');
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="font-heading font-extrabold text-2xl text-[#1d1c16]">
          Gestión y Programación de Citas
        </h2>
        <p class="text-xs text-[#6d7a77]">
          Control de citas, estados clínicos, asignación de terapeutas y validación de tutores.
        </p>
      </div>

      <div class="flex gap-2">
        <router-link
          to="/admin/calendario"
          class="px-4 py-2.5 bg-white hover:bg-[#ece8df] border border-[#bcc9c6] text-[#00685d] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span class="material-symbols-outlined text-base">calendar_month</span>
          <span>Vista Calendario</span>
        </router-link>

        <button
          @click="handleOpenNew"
          class="px-4 py-2.5 bg-[#a33d23] hover:bg-[#83260e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">add_circle</span>
          <span>Programar Cita</span>
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white p-4 rounded-2xl border border-[#e7e2d9] shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          v-for="st in (['TODAS', 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'] as const)"
          :key="st"
          @click="statusFilter = st"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          :class="statusFilter === st ? 'bg-[#00685d] text-white' : 'bg-[#f2ede4] text-[#3d4947] hover:bg-[#ece8df]'"
        >
          {{ st }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1 text-xs">
          <span class="text-[#6d7a77] font-semibold">Profesional:</span>
          <select
            v-model="professionalFilter"
            class="px-2.5 py-1.5 bg-[#f8f3ea] border border-[#bcc9c6] rounded-xl text-xs font-semibold text-[#1d1c16]"
          >
            <option value="TODOS">Todos los profesionales</option>
            <option
              v-for="u in store.users.filter((u) => u.role === 'PROFESIONAL' || u.role === 'ADMIN')"
              :key="u.id"
              :value="u.id"
            >
              {{ u.name }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-1 text-xs">
          <span class="text-[#6d7a77] font-semibold">Fecha:</span>
          <input
            type="date"
            v-model="dateFilter"
            class="px-2.5 py-1.5 bg-[#f8f3ea] border border-[#bcc9c6] rounded-xl text-xs font-semibold text-[#1d1c16]"
          />
          <button
            v-if="dateFilter"
            @click="dateFilter = ''"
            class="text-xs text-[#ba1a1a] font-bold hover:underline"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Appointments List Table -->
    <div class="bg-white rounded-2xl border border-[#e7e2d9] shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f8f3ea] border-b border-[#ece8df] text-[#6d7a77] uppercase font-bold text-[11px]">
            <tr>
              <th class="py-3 px-4">Fecha y Horario</th>
              <th class="py-3 px-4">Paciente</th>
              <th class="py-3 px-4">Servicio Terapéutico</th>
              <th class="py-3 px-4">Profesional Asignado</th>
              <th class="py-3 px-4">Precio (Q)</th>
              <th class="py-3 px-4">Estado</th>
              <th class="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ece8df]">
            <tr v-if="filteredAppointments.length === 0">
              <td colspan="7" class="py-8 text-center text-[#6d7a77]">
                No se encontraron citas con los filtros seleccionados.
              </td>
            </tr>
            <tr
              v-for="apt in filteredAppointments"
              :key="apt.id"
              class="hover:bg-[#fef9f0] transition-colors"
            >
              <td class="py-3.5 px-4">
                <span class="font-bold text-[#1d1c16] block">{{ apt.fecha }}</span>
                <span class="text-[#00685d] font-semibold text-[11px]">
                  {{ apt.horaInicio }} - {{ apt.horaFin }}
                </span>
                <span class="block text-[10px] text-[#6d7a77]">{{ apt.sede }}</span>
              </td>

              <td class="py-3.5 px-4">
                <button
                  @click="goToPatient(apt.pacienteId)"
                  class="font-heading font-bold text-sm text-[#1d1c16] hover:text-[#00685d] text-left cursor-pointer"
                >
                  {{ store.patients.find((p) => p.id === apt.pacienteId)?.nombres }}
                  {{ store.patients.find((p) => p.id === apt.pacienteId)?.apellidos }}
                </button>
                <span class="block text-[11px] text-[#6d7a77]">{{ apt.pacienteId }}</span>
              </td>

              <td class="py-3.5 px-4">
                <span class="font-semibold text-[#1d1c16] block">{{ store.services.find((s) => s.id === apt.servicioId)?.nombre }}</span>
                <span class="text-[11px] text-[#6d7a77]">{{ store.services.find((s) => s.id === apt.servicioId)?.categoria }}</span>
              </td>

              <td class="py-3.5 px-4">
                <span class="font-semibold text-[#1d1c16] block">{{ store.users.find((u) => u.id === apt.profesionalId)?.name }}</span>
                <span class="text-[11px] text-[#6d7a77]">{{ store.users.find((u) => u.id === apt.profesionalId)?.specialty }}</span>
              </td>

              <td class="py-3.5 px-4">
                <span class="font-extrabold text-[#00685d] text-sm">
                  Q {{ apt.precioQ.toFixed(2) }}
                </span>
              </td>

              <td class="py-3.5 px-4">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="apt.estado === 'COMPLETADA' ? 'bg-[#00685d]/10 text-[#00685d]' : apt.estado === 'CONFIRMADA' ? 'bg-[#cae6fe] text-[#2f4a5d]' : apt.estado === 'CANCELADA' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#ffdad2] text-[#a33d23]'"
                >
                  {{ apt.estado }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <button
                  v-if="apt.estado === 'PENDIENTE'"
                  @click="store.updateAppointmentStatus(apt.id, 'CONFIRMADA')"
                  title="Confirmar cita"
                  class="px-2 py-1 bg-[#00685d] text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Confirmar
                </button>

                <button
                  v-if="apt.estado === 'CONFIRMADA'"
                  @click="store.updateAppointmentStatus(apt.id, 'COMPLETADA')"
                  title="Marcar completada / atendida"
                  class="px-2 py-1 bg-[#00685d] text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Completar
                </button>

                <template v-if="apt.estado !== 'COMPLETADA' && apt.estado !== 'CANCELADA'">
                  <button
                    @click="reschedulingApt = apt; rescheduleData = { fecha: apt.fecha, horaInicio: apt.horaInicio, horaFin: apt.horaFin }"
                    title="Reprogramar horario o fecha"
                    class="px-2 py-1 bg-[#f2ede4] hover:bg-[#ece8df] text-[#1d1c16] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Reprogramar
                  </button>

                  <button
                    @click="store.updateAppointmentStatus(apt.id, 'CANCELADA')"
                    title="Cancelar cita"
                    class="px-2 py-1 bg-[#ffdad6] hover:bg-[#ba1a1a] hover:text-white text-[#ba1a1a] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Appointment Modal -->
    <div v-if="showNewAptModal" class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#bcc9c6] max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-[#ece8df] pb-3">
          <h3 class="font-heading font-bold text-lg text-[#1d1c16]">
            Programar Nueva Cita Terapéutica
          </h3>
          <button @click="showNewAptModal = false" class="text-[#6d7a77]">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div v-if="errorMsg" class="p-3.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-xs font-semibold leading-relaxed">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="handleCreateAppointment" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Paciente *</label>
            <select
              v-model="form.pacienteId"
              @change="errorMsg = ''"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option
                v-for="p in store.patients.filter((p) => p.estado === 'ACTIVO')"
                :key="p.id"
                :value="p.id"
              >
                {{ p.nombres }} {{ p.apellidos }} ({{ p.id }}) {{ store.isMinor(p.fechaNacimiento) ? '• Menor' : '• Adulto' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">
              Servicio Clínico (Copia automáticamente duración y precio) *
            </label>
            <select
              v-model="form.servicioId"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option
                v-for="s in store.services.filter((s) => s.estado === 'ACTIVO')"
                :key="s.id"
                :value="s.id"
              >
                {{ s.nombre }} — Q {{ s.precioQ.toFixed(2) }} ({{ s.duracionMinutos }} min)
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Profesional *</label>
            <select
              v-model="form.profesionalId"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option
                v-for="u in store.users.filter((u) => u.role === 'PROFESIONAL' || u.role === 'ADMIN')"
                :key="u.id"
                :value="u.id"
              >
                {{ u.name }} ({{ u.specialty || u.role }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Fecha *</label>
              <input
                type="date"
                required
                v-model="form.fecha"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Hora Inicio *</label>
              <input
                type="time"
                required
                v-model="form.horaInicio"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Hora Fin *</label>
              <input
                type="time"
                required
                v-model="form.horaFin"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Sede *</label>
            <select
              v-model="form.sede"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option value="Zona 10 - Sixtino II">Zona 10 - Sixtino II</option>
              <option value="Zona 14 - Europlaza">Zona 14 - Europlaza</option>
              <option value="En Línea (Teleterapia)">En Línea (Teleterapia)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Observaciones</label>
            <textarea
              rows="2"
              v-model="form.observaciones"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
            />
          </div>

          <div class="pt-3 border-t border-[#ece8df] flex justify-end gap-3">
            <button
              type="button"
              @click="showNewAptModal = false"
              class="px-4 py-2 bg-[#f2ede4] hover:bg-[#ece8df] text-[#1d1c16] rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-5 py-2 bg-[#00685d] hover:bg-[#008376] text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Guardar Cita
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reschedule Modal -->
    <div v-if="reschedulingApt" class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#bcc9c6]">
        <h3 class="font-heading font-bold text-lg text-[#1d1c16]">
          Reprogramar Cita ({{ reschedulingApt.id }})
        </h3>
        <form @submit.prevent="handleSaveReschedule" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Nueva Fecha *</label>
            <input
              type="date"
              required
              v-model="rescheduleData.fecha"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Nueva Hora Inicio *</label>
              <input
                type="time"
                required
                v-model="rescheduleData.horaInicio"
                class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Nueva Hora Fin *</label>
              <input
                type="time"
                required
                v-model="rescheduleData.horaFin"
                class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
          </div>

          <div class="pt-3 border-t border-[#ece8df] flex justify-end gap-2">
            <button
              type="button"
              @click="reschedulingApt = null"
              class="px-4 py-2 bg-[#f2ede4] rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-5 py-2 bg-[#00685d] text-white rounded-xl text-xs font-bold"
            >
              Guardar Reprogramación
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
