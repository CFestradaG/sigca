<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../../stores/appStore';
import { PaymentMethod } from '../../types';

const store = useAppStore();

const showOpenModal = ref(false);
const showMovementModal = ref(false);
const initialCashInput = ref(500);

const movementForm = ref({
  tipo: 'INGRESO' as 'INGRESO' | 'EGRESO',
  montoQ: 100,
  concepto: '',
  metodoPago: 'EFECTIVO' as PaymentMethod,
  comprobanteRef: '',
});

const isOpened = computed(() => store.cashRegister.estado === 'ABIERTA');

const totalCashIngresos = computed(() => {
  return store.cashRegister.movimientos
    .filter((m) => m.tipo === 'INGRESO' && m.metodoPago === 'EFECTIVO')
    .reduce((sum, m) => sum + m.montoQ, 0);
});

const totalOtherIngresos = computed(() => {
  return store.cashRegister.movimientos
    .filter((m) => m.tipo === 'INGRESO' && m.metodoPago !== 'EFECTIVO')
    .reduce((sum, m) => sum + m.montoQ, 0);
});

const totalCashEgresos = computed(() => {
  return store.cashRegister.movimientos
    .filter((m) => m.tipo === 'EGRESO' && m.metodoPago === 'EFECTIVO')
    .reduce((sum, m) => sum + m.montoQ, 0);
});

const currentCashInDrawer = computed(() => {
  return isOpened.value
    ? store.cashRegister.montoInicialQ + totalCashIngresos.value - totalCashEgresos.value
    : store.cashRegister.montoFinalQ || 0;
});

const handleOpenRegister = () => {
  store.openCashRegister(Number(initialCashInput.value));
  showOpenModal.value = false;
};

const handleCloseRegister = () => {
  if (window.confirm('¿Está seguro de que desea cerrar la caja diaria actual?')) {
    store.closeCashRegister();
  }
};

const handleAddMovement = () => {
  if (!movementForm.value.concepto.trim() || movementForm.value.montoQ <= 0) return;

  store.addCashMovement({
    tipo: movementForm.value.tipo,
    montoQ: Number(movementForm.value.montoQ),
    concepto: movementForm.value.concepto.trim(),
    metodoPago: movementForm.value.metodoPago,
    comprobanteRef: movementForm.value.comprobanteRef.trim() || undefined,
  });

  movementForm.value = {
    tipo: 'INGRESO',
    montoQ: 100,
    concepto: '',
    metodoPago: 'EFECTIVO',
    comprobanteRef: '',
  };
  showMovementModal.value = false;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="font-heading font-extrabold text-2xl text-[#1d1c16]">
            Control de Caja Diaria
          </h2>
          <span
            class="px-3 py-1 rounded-full text-xs font-bold"
            :class="isOpened ? 'bg-[#00685d]/10 text-[#00685d]' : 'bg-[#ffdad6] text-[#ba1a1a]'"
          >
            {{ store.cashRegister.estado }}
          </span>
        </div>
        <p class="text-xs text-[#6d7a77]">
          Fecha: {{ store.cashRegister.fecha }} • Responsable: {{ store.cashRegister.usuarioNombre }} • Apertura: {{ store.cashRegister.horaApertura }}
        </p>
      </div>

      <div class="flex gap-2">
        <template v-if="isOpened">
          <button
            @click="showMovementModal = true"
            class="px-4 py-2.5 bg-white hover:bg-[#ece8df] border border-[#bcc9c6] text-[#00685d] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">add</span>
            <span>Registrar Movimiento</span>
          </button>

          <button
            @click="handleCloseRegister"
            class="px-4 py-2.5 bg-[#a33d23] hover:bg-[#83260e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">lock</span>
            <span>Cerrar Caja Diaria</span>
          </button>
        </template>
        <button
          v-else
          @click="showOpenModal = true"
          class="px-4 py-2.5 bg-[#00685d] hover:bg-[#008376] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">lock_open</span>
          <span>Abrir Nueva Caja Diaria</span>
        </button>
      </div>
    </div>

    <!-- Cash Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white p-5 rounded-2xl border border-[#e7e2d9] shadow-xs space-y-1">
        <span class="text-[11px] font-bold text-[#6d7a77] uppercase">
          Efectivo Actual en Gaveta
        </span>
        <h3 class="text-2xl font-extrabold text-[#00685d]">
          Q {{ currentCashInDrawer.toFixed(2) }}
        </h3>
        <p class="text-[11px] text-[#3d4947]">Base inicial: Q {{ store.cashRegister.montoInicialQ.toFixed(2) }}</p>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-[#e7e2d9] shadow-xs space-y-1">
        <span class="text-[11px] font-bold text-[#6d7a77] uppercase">
          Ingresos en Efectivo
        </span>
        <h3 class="text-2xl font-extrabold text-[#00685d]">
          +Q {{ totalCashIngresos.toFixed(2) }}
        </h3>
        <p class="text-[11px] text-[#3d4947]">Cobros directos en ventanilla</p>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-[#e7e2d9] shadow-xs space-y-1">
        <span class="text-[11px] font-bold text-[#6d7a77] uppercase">
          Egresos / Gastos Menores
        </span>
        <h3 class="text-2xl font-extrabold text-[#a33d23]">
          -Q {{ totalCashEgresos.toFixed(2) }}
        </h3>
        <p class="text-[11px] text-[#3d4947]">Compras y suministros de emergencia</p>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-[#e7e2d9] shadow-xs space-y-1">
        <span class="text-[11px] font-bold text-[#6d7a77] uppercase">
          Ventas Tarjeta / POS & Transfer
        </span>
        <h3 class="text-2xl font-extrabold text-[#455f73]">
          Q {{ totalOtherIngresos.toFixed(2) }}
        </h3>
        <p class="text-[11px] text-[#3d4947]">Liquidación electrónica bancaria</p>
      </div>
    </div>

    <!-- Movements Table -->
    <div class="bg-white rounded-2xl border border-[#e7e2d9] shadow-xs overflow-hidden space-y-0">
      <div class="p-4 bg-[#f8f3ea] border-b border-[#ece8df] flex justify-between items-center">
        <h3 class="font-heading font-bold text-sm text-[#1d1c16]">
          Movimientos y Arqueo de la Jornada
        </h3>
        <span class="text-xs text-[#6d7a77]">
          {{ store.cashRegister.movimientos.length }} movimientos registrados
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#fef9f0] border-b border-[#ece8df] text-[#6d7a77] uppercase font-bold text-[11px]">
            <tr>
              <th class="py-3 px-4">Hora</th>
              <th class="py-3 px-4">Tipo</th>
              <th class="py-3 px-4">Concepto / Justificación</th>
              <th class="py-3 px-4">Método</th>
              <th class="py-3 px-4">Comprobante Ref.</th>
              <th class="py-3 px-4 text-right">Monto (Q)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ece8df]">
            <tr v-if="store.cashRegister.movimientos.length === 0">
              <td colspan="6" class="py-8 text-center text-[#6d7a77]">
                No se han registrado movimientos en esta caja aún.
              </td>
            </tr>
            <tr
              v-for="mov in store.cashRegister.movimientos"
              :key="mov.id"
              class="hover:bg-[#fef9f0] transition-colors"
            >
              <td class="py-3.5 px-4 font-mono font-bold text-[#3d4947]">
                {{ mov.hora }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="mov.tipo === 'INGRESO' ? 'bg-[#00685d]/10 text-[#00685d]' : 'bg-[#ffdad6] text-[#ba1a1a]'"
                >
                  {{ mov.tipo }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-semibold text-[#1d1c16]">
                {{ mov.concepto }}
              </td>
              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded-full bg-[#f2ede4] font-bold text-[10px] text-[#3d4947]">
                  {{ mov.metodoPago }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-mono text-[#6d7a77]">
                {{ mov.comprobanteRef || '—' }}
              </td>
              <td
                class="py-3.5 px-4 text-right font-extrabold text-sm"
                :class="mov.tipo === 'INGRESO' ? 'text-[#00685d]' : 'text-[#ba1a1a]'"
              >
                {{ mov.tipo === 'INGRESO' ? '+' : '-' }} Q {{ mov.montoQ.toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Open Cash Register Modal -->
    <div v-if="showOpenModal" class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#bcc9c6]">
        <h3 class="font-heading font-bold text-lg text-[#1d1c16]">
          Apertura de Caja Diaria
        </h3>
        <p class="text-xs text-[#3d4947]">
          Ingrese el fondo de caja inicial en efectivo (cambio y monedas) para iniciar la jornada.
        </p>

        <form @submit.prevent="handleOpenRegister" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">
              Monto Inicial en Efectivo (Q) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              v-model="initialCashInput"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-base font-bold text-[#00685d]"
            />
          </div>

          <div class="pt-3 border-t border-[#ece8df] flex justify-end gap-2">
            <button
              type="button"
              @click="showOpenModal = false"
              class="px-4 py-2 bg-[#f2ede4] rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-5 py-2 bg-[#00685d] text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Confirmar Apertura
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Register Cash Movement Modal -->
    <div v-if="showMovementModal" class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-[#bcc9c6]">
        <h3 class="font-heading font-bold text-lg text-[#1d1c16]">
          Registrar Movimiento en Caja
        </h3>

        <form @submit.prevent="handleAddMovement" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Tipo de Movimiento *</label>
              <select
                v-model="movementForm.tipo"
                class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white font-bold"
              >
                <option value="INGRESO">Ingreso (+)</option>
                <option value="EGRESO">Egreso / Gasto (-)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#1d1c16] mb-1">Monto en Quetzales *</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                v-model="movementForm.montoQ"
                class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Método de Pago *</label>
            <select
              v-model="movementForm.metodoPago"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs bg-white"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta POS</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Concepto o Justificación *</label>
            <input
              type="text"
              required
              placeholder="Ej. Compra de agua purificada para clínica"
              v-model="movementForm.concepto"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
            />
          </div>

          <div>
            <label class="block font-bold text-[#1d1c16] mb-1">Comprobante o Factura Proveedor</label>
            <input
              type="text"
              placeholder="Ej. FAC-10293"
              v-model="movementForm.comprobanteRef"
              class="w-full px-3 py-2 rounded-xl border border-[#bcc9c6] text-xs"
            />
          </div>

          <div class="pt-3 border-t border-[#ece8df] flex justify-end gap-2">
            <button
              type="button"
              @click="showMovementModal = false"
              class="px-4 py-2 bg-[#f2ede4] rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-5 py-2 bg-[#00685d] text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
