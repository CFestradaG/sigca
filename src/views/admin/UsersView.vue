<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../../stores/appStore';

const store = useAppStore();
const searchTerm = ref('');

const filteredUsers = computed(() => {
  const q = searchTerm.value.toLowerCase().trim();
  if (!q) return store.users;
  return store.users.filter((u) =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q) ||
    (u.specialty && u.specialty.toLowerCase().includes(q))
  );
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="font-heading font-extrabold text-2xl text-[#1d1c16]">
          Gestión de Usuarios y Roles de Acceso
        </h2>
        <p class="text-xs text-[#6d7a77]">
          Roles obligatorios: Administrador General, Recepcionista y Profesional (RF-02).
        </p>
      </div>
    </div>

    <!-- RBAC Rules Box -->
    <div class="p-5 bg-[#f8f3ea] rounded-2xl border border-[#bcc9c6] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <div class="p-3 bg-white rounded-xl border border-[#ece8df] space-y-1">
        <span class="font-bold text-[#00685d] block uppercase text-[11px]">ADMINISTRADOR</span>
        <p class="text-[#3d4947]">
          Control total: usuarios, contenido institucional, servicios, pacientes, caja, pagos, citas y materiales.
        </p>
      </div>
      <div class="p-3 bg-white rounded-xl border border-[#ece8df] space-y-1">
        <span class="font-bold text-[#a33d23] block uppercase text-[11px]">RECEPCIONISTA</span>
        <p class="text-[#3d4947]">
          Pacientes, tutores, bandeja de solicitudes, programación y cancelación de citas, pagos y cierre de su caja diaria.
        </p>
      </div>
      <div class="p-3 bg-white rounded-xl border border-[#ece8df] space-y-1">
        <span class="font-bold text-[#455f73] block uppercase text-[11px]">PROFESIONAL</span>
        <p class="text-[#3d4947]">
          Consulta de citas asignadas, marcar citas completadas, información clínica de sus pacientes y asignación de materiales.
        </p>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white p-4 rounded-2xl border border-[#e7e2d9] shadow-xs flex items-center justify-between gap-4">
      <div class="relative w-full max-w-sm">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6d7a77]">
          search
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre o correo..."
          v-model="searchTerm"
          class="w-full h-10 pl-9 pr-3 rounded-xl bg-[#f8f3ea] border border-[#bcc9c6] text-xs text-[#1d1c16] focus:outline-none focus:ring-2 focus:ring-[#00685d]"
        />
      </div>
      <div class="text-xs text-[#6d7a77]">
        Total: <strong class="text-[#1d1c16]">{{ filteredUsers.length }}</strong> usuarios
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-2xl border border-[#e7e2d9] shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f8f3ea] border-b border-[#ece8df] text-[#6d7a77] uppercase font-bold text-[11px]">
            <tr>
              <th class="py-3 px-4">Usuario</th>
              <th class="py-3 px-4">Rol en SIGCA</th>
              <th class="py-3 px-4">Especialidad Clínica / Área</th>
              <th class="py-3 px-4">Teléfono</th>
              <th class="py-3 px-4">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ece8df]">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-[#fef9f0] transition-colors">
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="u.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'"
                    :alt="u.name"
                    class="w-10 h-10 rounded-xl object-cover ring-1 ring-[#bcc9c6]"
                  />
                  <div>
                    <h4 class="font-heading font-bold text-sm text-[#1d1c16]">{{ u.name }}</h4>
                    <span class="text-[11px] text-[#6d7a77]">{{ u.email }}</span>
                  </div>
                </div>
              </td>

              <td class="py-3.5 px-4">
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  :class="u.role === 'ADMIN' ? 'bg-[#8cf5e4] text-[#005048]' : u.role === 'RECEPCION' ? 'bg-[#ffdad2] text-[#a33d23]' : 'bg-[#d8e2ff] text-[#001a41]'"
                >
                  {{ u.role === 'ADMIN' ? 'Administrador' : u.role === 'RECEPCION' ? 'Recepcionista' : 'Profesional' }}
                </span>
              </td>

              <td class="py-3.5 px-4 font-medium text-[#3d4947]">
                {{ u.specialty || 'Administración General' }}
              </td>

              <td class="py-3.5 px-4 text-[#3d4947]">
                {{ u.phone || 'N/A' }}
              </td>

              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  :class="u.active ? 'bg-[#e0f5ee] text-[#00685d]' : 'bg-gray-100 text-gray-500'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="u.active ? 'bg-[#00685d]' : 'bg-gray-400'"></span>
                  <span>{{ u.active ? 'Activo' : 'Inactivo' }}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
