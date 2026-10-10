<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/appStore';
import { AppointmentRequest } from '../../types';

const store = useAppStore();
const router = useRouter();

const filter = ref<'TODAS' | 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA'>('TODAS');
const convertingRequest = ref<AppointmentRequest | null>(null);

const conversionForm = ref({
  pacienteId: store.patients[0]?.id || '',
  profesionalId: store.users.find((u) => u.role === 'PROFESIONAL')?.id || store.users[0]?.id || '',
  fecha: '',
  horaInicio: '09:00',
  horaFin: '09:45',
  sede: 'Zona 10 - Sixtino II',
  observaciones: '',
});

const handleStartConversion = (req: AppointmentRequest) => {
  const matchedPatient = store.patients.find(
    (p) => `${p.nombres} ${p.apellidos}`.toLowerCase().includes(req.solicitanteNombre.toLowerCase())
  );

  conversionForm.value = {
    pacienteId: matchedPatient?.id || store.patients[0]?.id || '',
    profesionalId: store.users.find((u) => u.role === 'PROFESIONAL')?.id || store.users[0]?.id || '',
    fecha: req.fechaPreferida || new Date().toISOString().slice(0, 10),
    horaInicio: '09:00',
    horaFin: '09:45',
    sede: req.sedePreferida || 'Zona 10 - Sixtino II',
    observaciones: `Originada por solicitud web: ${req.mensaje || 'Sin notas'}`,
  };
  convertingRequest.value = req;
};

const handleConfirmConversion = () => {
  if (!convertingRequest.value) return;

  const srv = store.services.find((s) => s.id === convertingRequest.value?.servicioId) || store.services[0];

  store.createAppointment({
    pacienteId: conversionForm.value.pacienteId,
    servicioId: srv.id,
    profesionalId: conversionForm.value.profesionalId,
    fecha: conversionForm.value.fecha,
    horaInicio: conversionForm.value.horaInicio,
    horaFin: conversionForm.value.horaFin,
    precioQ: srv.precioQ,
    estado: 'CONFIRMADA',
    observaciones: conversionForm.value.observaciones,
    sede: conversionForm.value.sede,
  });

  store.updateRequestStatus(convertingRequest.value.id, 'ATENDIDA');
  convertingRequest.value = null;
  router.push('/admin/citas');
};

const filteredRequests = computed(() => {
  return store.requests.filter((r) =>
    filter.value === 'TODAS' ? true : r.estado === filter.value
  );
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="font-heading font-extrabold text-2xl text-[#1d1c16]">
          Bandeja de Solicitudes de Cita Web
        </h2>
        <p class="text-xs text-[#6d7a77]">
          Revisión de admisiones desde el portal público y conversión directa a citas programadas.
        </p>
      </div>

      <div class="flex gap-2">
        <button
          v-for="st in (['TODAS', 'PENDIENTE', 'ATENDIDA', 'RECHAZADA'] as const)"
          :key="st"
          @click="filter = st"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          :class="filter === st ? 'bg-[#00685d] text-white shadow-xs' : 'bg-white text-[#3d4947] hover:bg-[#ece8df] border border-[#e7e2d9]'"
        >
          {{ st }}
        </button>
      </div>
    </div>

    <!-- Requests Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-if="filteredRequests.length === 0" class="col-span-2 p-12 text-center bg-white rounded-2xl border border-[#e7e2d9] text-xs text-[#6d7a77]">
        No hay solicitudes que coincidan con el filtro seleccionado.
      </div>

      <div
        v-else
        v-for="req in filteredRequests"
        :key="req.id"
        class="bg-white rounded-2xl border border-[#e7e2d9] shadow-xs p-6 flex flex-col justify-between space-y-4"
      >
        <div>
          <div class="flex justify-between items-start gap-2">
            <div>
              <span class="text-[11px] font-mono font-bold text-[#6d7a77]">
                {{ req.id }} • {{ req.fechaCreacion }}
              </span>
              <h3 class="font-heading font-bold text-lg text-[#1d1c16] mt-0.5">
                {{ req.solicitanteNombre }}
              </h3>
            </div>

            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              :class="req.estado === 'PENDIENTE' ? 'bg-[#ffdad2] text-[#a33d23]' : req.estado === 'ATENDIDA' ? 'bg-[#00685d]/10 text-[#00685d]' : 'bg-[#ffdad6] text-[#ba1a1a]'"
            >
              {{ req.estado }}
            </span>
          </div>

          <div class="p-3 bg-[#f8f3ea] rounded-xl border border-[#ece8df] mt-3 space-y-1.5 text-xs text-[#3d4947]">
            <div class="flex justify-between">
              <span class="text-[#6d7a77]">Servicio Requerido:</span>
              <strong class="text-[#00685d]">{{ store.services.find((s) => s.id === req.servicioId)?.nombre || 'Consulta' }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-[#6d7a77]">Sede y Fecha Sugerida:</span>
              <span class="font-semibold">{{ req.sedePreferida }} ({{ req.fechaPreferida }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#6d7a77]">Contacto:</span>
              <span>{{ req.telefono }} • {{ req.email }}</span>
            </div>
          </div>

          <div v-if="req.mensaje" class="mt-3 text-xs text-[#3d4947] bg-[#fef9f0] p-3 rounded-xl border border-[#bcc9c6]/40 italic">
            "{{ req.mensaje }}"
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-[#ece8df] flex items-center justify-between gap-2">
          <div class="space-x-2">
            <button
              v-if="req.estado === 'PENDIENTE'"
              @click="store.updateRequestStatus(req.id, 'RECHAZADA')"
              class="text-xs font-bold text-[#ba1a1a] hover:underline cursor-pointer"
            >
              Rechazar
            </button>
          </div>

          <button
            v-if="req.estado === 'PENDIENTE'"
            @click="handleStartConversion(req)"
            class="px-4 py-2 bg-[#00685d] hover:bg-[#008376] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">event_available</span>
            <span>Convertir en Cita</span>
          </button>
          <span v-else class="text-xs font-semibold text-[#00685d] flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            <span>Solicitud Procesada</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Convert to Appointment Modal -->
    <div v-if="convertingRequest" class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#bcc9c6]">
        <div class="border-b border-[#ece8df] pb-3">
          <span class="text-xs font-bold text-[#00685d] uppercase tracking-wider">
            Conversión de Solicitud Web
          </span>
          <h3 class="font-heading font-bold text-xl text-[#1d1c16]">
            Programar Cita para {{ convertingRequest.solicitanteNombre }}
          </h3>
        </div>

        <form @submit.prevent="handleConfirmConversion" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">
              Asociar a Paciente Registrado *
            </label>
            <select
              v-model="conversionForm.pacienteId"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white focus:ring-1 focus:ring-[#00685d]"
            >
              <option v-for="p in store.patients" :key="p.id" :value="p.id">
                {{ p.nombres }} {{ p.apellidos }} ({{ p.id }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">
              Profesional / Terapeuta Asignado *
            </label>
            <select
              v-model="conversionForm.profesionalId"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white focus:ring-1 focus:ring-[#00685d]"
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
                v-model="conversionForm.fecha"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Hora Inicio *</label>
              <input
                type="time"
                required
                v-model="conversionForm.horaInicio"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Hora Fin *</label>
              <input
                type="time"
                required
                v-model="conversionForm.horaFin"
                class="w-full px-2.5 py-2 rounded-xl border border-[#bcc9c6] text-xs"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Sede de Atención *</label>
            <select
              v-model="conversionForm.sede"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option value="Zona 10 - Sixtino II">Zona 10 - Edificio Sixtino II</option>
              <option value="Zona 14 - Europlaza">Zona 14 - Europlaza Las Conchas</option>
              <option value="Modalidad En Línea">Modalidad En Línea (Teleterapia)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Observaciones</label>
            <textarea
              rows="2"
              v-model="conversionForm.observaciones"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
            />
          </div>

          <div class="pt-3 border-t border-[#ece8df] flex justify-end gap-2">
            <button
              type="button"
              @click="convertingRequest = null"
              class="px-4 py-2 bg-[#f2ede4] hover:bg-[#ece8df] text-[#1d1c16] rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-5 py-2 bg-[#00685d] hover:bg-[#008376] text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Confirmar y Generar Cita
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
