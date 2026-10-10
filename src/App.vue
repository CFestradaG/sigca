<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from './stores/appStore';

import PublicHeader from './components/public/PublicHeader.vue';
import PublicFooter from './components/public/PublicFooter.vue';
import AdminSidebar from './components/admin/AdminSidebar.vue';
import AdminHeader from './components/admin/AdminHeader.vue';
import PrintableVoucherModal from './components/admin/PrintableVoucherModal.vue';

const store = useAppStore();
const route = useRoute();

const isSidebarOpen = ref(false);

const isAdminRoute = computed(() => {
  return route.path.startsWith('/admin');
});

const closeVoucherModal = () => {
  store.setSelectedPaymentForPrint(null);
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#fef9f0] text-[#1d1c16] antialiased">
    <!-- Admin Interface -->
    <div v-if="isAdminRoute" class="flex min-h-screen">
      <!-- Admin Sidebar -->
      <AdminSidebar
        :isOpen="isSidebarOpen"
        @close="isSidebarOpen = false"
      />

      <!-- Main Admin Area -->
      <div class="flex-1 lg:pl-72 flex flex-col min-h-screen">
        <AdminHeader @toggleSidebar="isSidebarOpen = !isSidebarOpen" />

        <main class="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Public Portal -->
    <div v-else class="flex flex-col min-h-screen">
      <PublicHeader />

      <main class="flex-1 pt-28">
        <router-view />
      </main>

      <PublicFooter />
    </div>

    <!-- Global Printable Voucher Modal -->
    <PrintableVoucherModal
      v-if="store.selectedPaymentForPrint"
      :payment="store.selectedPaymentForPrint"
      @close="closeVoucherModal"
    />
  </div>
</template>
