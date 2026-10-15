<script setup lang="ts">
import { useAppStore } from '../../stores/appStore';

const emit = defineEmits<{
  (e: 'toggleSidebar'): void;
  (e: 'openLogin'): void;
}>();

const store = useAppStore();

const todayFormatted = new Date().toLocaleDateString('es-GT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
</script>

<template>
  <header class="sticky top-0 z-30 h-20 bg-[#fef9f0]/95 backdrop-blur-md border-b border-[#e7e2d9] px-4 sm:px-8 flex items-center justify-between gap-4">
    <div class="flex items-center gap-3 flex-1 max-w-xl">
      <!-- Toggle sidebar button for mobile -->
      <button
        @click="emit('toggleSidebar')"
        class="lg:hidden p-2 rounded-xl bg-white border border-[#bcc9c6] text-[#3d4947] hover:bg-[#f2ede4] cursor-pointer"
      >
        <span class="material-symbols-outlined text-xl">menu</span>
      </button>

      <!-- Sede selector -->
      <div class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f2ede4] text-xs text-[#3d4947] border border-[#bcc9c6]">
        <span class="material-symbols-outlined text-[#a33d23] text-base">location_on</span>
        <span class="font-bold text-[#1d1c16]">Sede:</span>
        <select class="bg-transparent font-semibold text-[#1d1c16] focus:outline-none cursor-pointer">
          <option value="z10">Zona 10 - Pradera Sixtino II</option>
          <option value="z14">Zona 14 - Europlaza Las Conchas</option>
          <option value="todas">Todas las sedes</option>
        </select>
      </div>

      <!-- Quick Search -->
      <div class="relative flex-1 max-w-xs">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6d7a77]">
          search
        </span>
        <input
          type="search"
          placeholder="Buscar paciente, expediente..."
          class="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-[#bcc9c6] text-xs text-[#1d1c16] placeholder:text-[#6d7a77] focus:outline-none focus:ring-2 focus:ring-[#00685d]"
        />
      </div>
    </div>

    <!-- Right User Meta -->
    <div class="flex items-center gap-4">
      <!-- Date in Guatemala -->
      <div class="hidden md:flex flex-col text-right">
        <span class="text-[11px] text-[#6d7a77] font-medium">Fecha en Guatemala</span>
        <span class="text-xs font-bold text-[#1d1c16] capitalize">
          {{ todayFormatted }}
        </span>
      </div>

      <div class="hidden md:block h-7 w-px bg-[#bcc9c6]/40"></div>

      <!-- User Card -->
      <button
        @click="emit('openLogin')"
        type="button"
        title="Cambiar usuario / autenticar con JWT"
        class="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-[#f2ede4] transition-colors cursor-pointer text-left"
      >
        <img
          :src="store.currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'"
          :alt="store.currentUser?.name"
          class="w-9 h-9 rounded-full object-cover ring-2 ring-[#00685d]/20"
        />
        <div class="hidden xl:flex flex-col text-left">
          <span class="text-xs font-bold text-[#1d1c16] leading-tight flex items-center gap-1">
            <span>{{ store.currentUser?.name }}</span>
            <span class="material-symbols-outlined text-[13px] text-[#6d7a77]">swap_horiz</span>
          </span>
          <span class="text-[11px] text-[#00685d] font-semibold leading-none">
            {{ store.currentUser?.role === 'ADMIN' ? 'Administrador General' : store.currentUser?.role === 'RECEPCION' ? 'Recepción y Caja' : 'Terapeuta Clínico' }}
          </span>
        </div>
      </button>

      <!-- Logout -->
      <router-link
        to="/inicio"
        title="Salir al portal público"
        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ffdad2] hover:bg-[#a33d23] text-[#731a04] hover:text-white transition-all text-xs font-bold cursor-pointer"
      >
        <span class="material-symbols-outlined text-base">logout</span>
        <span class="hidden sm:inline">Cerrar sesión</span>
      </router-link>
    </div>
  </header>
</template>
