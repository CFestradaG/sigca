import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// Public Views
import HomeView from '../views/public/HomeView.vue';
import ServicesView from '../views/public/ServicesView.vue';
import MissionVisionView from '../views/public/MissionVisionView.vue';
import EducationalView from '../views/public/EducationalView.vue';
import CorporateView from '../views/public/CorporateView.vue';
import ScheduleContactView from '../views/public/ScheduleContactView.vue';
import BookingRequestView from '../views/public/BookingRequestView.vue';

// Admin Views
import DashboardView from '../views/admin/DashboardView.vue';
import PatientsView from '../views/admin/PatientsView.vue';
import GuardiansView from '../views/admin/GuardiansView.vue';
import ServicesAdminView from '../views/admin/ServicesAdminView.vue';
import RequestsView from '../views/admin/RequestsView.vue';
import AppointmentsView from '../views/admin/AppointmentsView.vue';
import CalendarView from '../views/admin/CalendarView.vue';
import MaterialsView from '../views/admin/MaterialsView.vue';
import PaymentsView from '../views/admin/PaymentsView.vue';
import CashRegisterView from '../views/admin/CashRegisterView.vue';
import InstitutionalContentView from '../views/admin/InstitutionalContentView.vue';
import UsersView from '../views/admin/UsersView.vue';
import MessagesView from '../views/admin/MessagesView.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/inicio' },
  { path: '/inicio', name: 'Home', component: HomeView },
  { path: '/servicios', name: 'Services', component: ServicesView },
  { path: '/mision-vision', name: 'MissionVision', component: MissionVisionView },
  { path: '/educativo', name: 'Educational', component: EducationalView },
  { path: '/corporativo', name: 'Corporate', component: CorporateView },
  { path: '/horarios-contacto', name: 'ScheduleContact', component: ScheduleContactView },
  { path: '/agendar-cita', name: 'BookingRequest', component: BookingRequestView },

  // Admin Routes
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/dashboard', name: 'AdminDashboard', component: DashboardView },
  { path: '/admin/pacientes', name: 'AdminPatients', component: PatientsView },
  { path: '/admin/responsables', name: 'AdminGuardians', component: GuardiansView },
  { path: '/admin/servicios', name: 'AdminServices', component: ServicesAdminView },
  { path: '/admin/solicitudes', name: 'AdminRequests', component: RequestsView },
  { path: '/admin/citas', name: 'AdminAppointments', component: AppointmentsView },
  { path: '/admin/calendario', name: 'AdminCalendar', component: CalendarView },
  { path: '/admin/materiales', name: 'AdminMaterials', component: MaterialsView },
  { path: '/admin/pagos', name: 'AdminPayments', component: PaymentsView },
  { path: '/admin/caja-diaria', name: 'AdminCashRegister', component: CashRegisterView },
  { path: '/admin/contenido', name: 'AdminContent', component: InstitutionalContentView },
  { path: '/admin/usuarios', name: 'AdminUsers', component: UsersView },
  { path: '/admin/mensajes', name: 'AdminMessages', component: MessagesView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
