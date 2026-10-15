import { defineStore } from 'pinia';
import {
  User,
  Patient,
  Guardian,
  ClinicalService,
  Appointment,
  AppointmentRequest,
  Payment,
  DailyCashRegister,
  EducationalMaterial,
  InstitutionalContent,
  ContactMessage,
  CashMovement,
} from '../types';
import {
  initialUsers,
  initialPatients,
  initialGuardians,
  initialServices,
  initialAppointments,
  initialRequests,
  initialPayments,
  initialCashRegister,
  initialMaterials,
  initialContent,
  initialMessages,
} from '../data/mockData';

const TOKEN_KEY = 'sigca_jwt_token';
const USER_KEY = 'sigca_auth_user';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : initialUsers[0];
  } catch {
    return initialUsers[0];
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
  }
  return data;
}

export const useAppStore = defineStore('app', {
  state: () => ({
    authToken: getStoredToken(),
    currentUser: getStoredUser(),
    lastAuthError: '',
    selectedPatientId: 'pac-1' as string | null,
    selectedPaymentForPrint: null as Payment | null,

    // Collections populated directly from API with initialData fixtures as instant fallback
    users: initialUsers as User[],
    patients: initialPatients as Patient[],
    guardians: initialGuardians as Guardian[],
    services: initialServices as ClinicalService[],
    appointments: initialAppointments as Appointment[],
    requests: initialRequests as AppointmentRequest[],
    payments: initialPayments as Payment[],
    cashRegister: initialCashRegister as DailyCashRegister,
    allCashRegisters: [] as any[],
    materials: initialMaterials as EducationalMaterial[],
    content: initialContent as InstitutionalContent,
    messages: initialMessages as ContactMessage[],

    isLoadingData: false,
    apiConnected: true,
  }),

  getters: {
    pendingRequestsCount(state): number {
      return state.requests.filter((r) => r.estado === 'PENDIENTE').length;
    },
    unreadMessagesCount(state): number {
      return state.messages.filter((m) => !m.leido).length;
    },
  },

  actions: {
    async fetchInitialData() {
      this.isLoadingData = true;
      try {
        // Fetch all primary collections in parallel from API
        const [
          servicesRes,
          contentRes,
          patientsRes,
          guardiansRes,
          appointmentsRes,
          requestsRes,
          paymentsRes,
          cashRes,
          materialsRes,
          messagesRes,
          usersRes,
        ] = await Promise.allSettled([
          apiFetch('/api/servicios?all=true'),
          apiFetch('/api/contenido'),
          apiFetch('/api/pacientes'),
          apiFetch('/api/responsables'),
          apiFetch('/api/citas'),
          apiFetch('/api/solicitudes-cita'),
          apiFetch('/api/pagos'),
          apiFetch('/api/cajas/actual'),
          apiFetch('/api/materiales'),
          apiFetch('/api/contacto'),
          apiFetch('/api/usuarios'),
        ]);

        if (servicesRes.status === 'fulfilled' && servicesRes.value.data) {
          this.services = servicesRes.value.data;
        }
        if (contentRes.status === 'fulfilled' && contentRes.value.data) {
          this.content = contentRes.value.data;
        }
        if (patientsRes.status === 'fulfilled' && patientsRes.value.data) {
          this.patients = patientsRes.value.data;
        }
        if (guardiansRes.status === 'fulfilled' && guardiansRes.value.data) {
          this.guardians = guardiansRes.value.data;
        }
        if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.data) {
          this.appointments = appointmentsRes.value.data;
        }
        if (requestsRes.status === 'fulfilled' && requestsRes.value.data) {
          this.requests = requestsRes.value.data;
        }
        if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data) {
          this.payments = paymentsRes.value.data;
        }
        if (cashRes.status === 'fulfilled' && cashRes.value.data) {
          this.cashRegister = cashRes.value.data;
        }
        if (materialsRes.status === 'fulfilled' && materialsRes.value.data) {
          this.materials = materialsRes.value.data;
        }
        if (messagesRes.status === 'fulfilled' && messagesRes.value.data) {
          this.messages = messagesRes.value.data;
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.data) {
          this.users = usersRes.value.data.map((u: any) => ({
            id: u.id,
            name: u.nombre,
            email: u.email,
            role: u.rol,
            active: u.activo,
            phone: u.telefono,
            specialty: u.especialidad,
            avatarUrl: u.avatarUrl,
          }));
        }

        this.apiConnected = true;
      } catch (err) {
        console.warn('Fallback to local state:', err);
      } finally {
        this.isLoadingData = false;
      }
    },

    async login(email: string, pass: string): Promise<boolean> {
      this.lastAuthError = '';
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password: pass }),
        });

        if (res.success && res.token && res.user) {
          this.authToken = res.token;
          const userFormatted: User = {
            id: res.user.id,
            name: res.user.nombre,
            email: res.user.email,
            role: res.user.rol,
            active: res.user.activo !== false,
            phone: res.user.telefono,
            specialty: res.user.especialidad,
            avatarUrl: res.user.avatarUrl,
          };
          this.currentUser = userFormatted;

          try {
            localStorage.setItem(TOKEN_KEY, res.token);
            localStorage.setItem(USER_KEY, JSON.stringify(userFormatted));
          } catch (e) {
            console.error(e);
          }

          await this.fetchInitialData();
          return true;
        }
        return false;
      } catch (err: any) {
        this.lastAuthError = err.message || 'Error al autenticar';
        return false;
      }
    },

    logout() {
      this.authToken = null;
      this.currentUser = null;
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } catch (e) {
        console.error(e);
      }
    },

    setCurrentUser(user: User | null) {
      this.currentUser = user;
      if (user) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (e) {}
      }
    },

    setSelectedPatientId(id: string | null) {
      this.selectedPatientId = id;
    },

    setSelectedPaymentForPrint(payment: Payment | null) {
      this.selectedPaymentForPrint = payment;
    },

    calculateAge(birthDate: string): { years: number; months: number; text: string } {
      if (!birthDate) return { years: 0, months: 0, text: 'No especificada' };
      const birth = new Date(birthDate);
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
        years--;
        months = (months + 12) % 12;
      }
      return {
        years,
        months,
        text: `${years} años${months > 0 ? `, ${months} meses` : ''}`,
      };
    },

    isMinor(birthDate: string): boolean {
      const age = this.calculateAge(birthDate);
      return age.years < 18;
    },

    getPatientGuardians(patientId: string): Guardian[] {
      return this.guardians.filter((g) => g.patientIds?.includes(patientId));
    },

    getPatientAppointments(patientId: string): Appointment[] {
      return this.appointments.filter((a) => a.pacienteId === patientId);
    },

    getPatientPayments(patientId: string): Payment[] {
      return this.payments.filter((p) => p.pacienteId === patientId);
    },

    getPatientBalance(patientId: string): { totalCharged: number; totalPaid: number; balance: number } {
      const pApts = this.getPatientAppointments(patientId);
      const totalCharged = pApts
        .filter((a) => a.estado !== 'CANCELADA')
        .reduce((sum, a) => sum + (a.precioQ || 0), 0);
      const pPays = this.getPatientPayments(patientId);
      const validPayments = pPays.filter((p: any) => p.estado !== 'ANULADO');
      const totalPaid = validPayments.reduce((sum, p) => sum + (p.montoQ || 0), 0);
      return {
        totalCharged,
        totalPaid,
        balance: Math.max(0, Math.round((totalCharged - totalPaid) * 100) / 100),
      };
    },

    // --- PATIENTS ---
    async addPatient(patientData: Omit<Patient, 'id'>): Promise<Patient> {
      try {
        const res = await apiFetch('/api/pacientes', {
          method: 'POST',
          body: JSON.stringify(patientData),
        });
        if (res.data) {
          this.patients.unshift(res.data);
          return res.data;
        }
      } catch (err: any) {
        console.error('API create patient error:', err);
      }
      const fallback: Patient = { ...patientData, id: `pac-${Date.now()}` };
      this.patients.unshift(fallback);
      return fallback;
    },

    async updatePatient(id: string, updated: Partial<Patient>) {
      try {
        const res = await apiFetch(`/api/pacientes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (res.data) {
          const idx = this.patients.findIndex((p) => p.id === id);
          if (idx !== -1) this.patients[idx] = res.data;
          return;
        }
      } catch (err) {
        console.error(err);
      }
      const idx = this.patients.findIndex((p) => p.id === id);
      if (idx !== -1) this.patients[idx] = { ...this.patients[idx], ...updated };
    },

    async togglePatientStatus(id: string) {
      const p = this.patients.find((pt) => pt.id === id);
      if (!p) return;
      const nextStatus = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      try {
        await apiFetch(`/api/pacientes/${id}/estado`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: nextStatus }),
        });
      } catch (err) {
        console.error(err);
      }
      p.estado = nextStatus;
    },

    // --- GUARDIANS ---
    async addGuardian(gData: Omit<Guardian, 'id'>): Promise<Guardian> {
      try {
        const res = await apiFetch('/api/responsables', {
          method: 'POST',
          body: JSON.stringify(gData),
        });
        if (res.data) {
          this.guardians.push(res.data);
          return res.data;
        }
      } catch (err) {
        console.error(err);
      }
      const fallback: Guardian = { ...gData, id: `gua-${Date.now()}` };
      this.guardians.push(fallback);
      return fallback;
    },

    async updateGuardian(id: string, updated: Partial<Guardian>) {
      try {
        const res = await apiFetch(`/api/responsables/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (res.data) {
          const idx = this.guardians.findIndex((g) => g.id === id);
          if (idx !== -1) this.guardians[idx] = res.data;
          return;
        }
      } catch (err) {
        console.error(err);
      }
      const idx = this.guardians.findIndex((g) => g.id === id);
      if (idx !== -1) this.guardians[idx] = { ...this.guardians[idx], ...updated };
    },

    async linkGuardianToPatient(guardianId: string, patientId: string) {
      const g = this.guardians.find((gua) => gua.id === guardianId);
      if (g && !g.patientIds.includes(patientId)) {
        const nextIds = [...g.patientIds, patientId];
        await this.updateGuardian(guardianId, { patientIds: nextIds });
      }
    },

    // --- SERVICES ---
    async addService(srvData: Omit<ClinicalService, 'id'>) {
      try {
        const res = await apiFetch('/api/servicios', {
          method: 'POST',
          body: JSON.stringify(srvData),
        });
        if (res.data) {
          this.services.push(res.data);
          return;
        }
      } catch (err) {
        console.error(err);
      }
      this.services.push({ ...srvData, id: `srv-${Date.now()}` });
    },

    async updateService(id: string, updated: Partial<ClinicalService>) {
      try {
        const res = await apiFetch(`/api/servicios/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (res.data) {
          const idx = this.services.findIndex((s) => s.id === id);
          if (idx !== -1) this.services[idx] = res.data;
          return;
        }
      } catch (err) {
        console.error(err);
      }
      const idx = this.services.findIndex((s) => s.id === id);
      if (idx !== -1) this.services[idx] = { ...this.services[idx], ...updated };
    },

    // --- REQUESTS ---
    async submitAppointmentRequest(req: Omit<AppointmentRequest, 'id' | 'estado' | 'fechaCreacion'>) {
      try {
        const res = await apiFetch('/api/solicitudes-cita', {
          method: 'POST',
          body: JSON.stringify(req),
        });
        if (res.data) {
          this.requests.unshift(res.data);
          return res.data;
        }
      } catch (err) {
        console.error(err);
      }
      const fallback: AppointmentRequest = {
        ...req,
        id: `sol-${Date.now()}`,
        estado: 'PENDIENTE',
        fechaCreacion: new Date().toISOString(),
      };
      this.requests.unshift(fallback);
      return fallback;
    },

    async updateRequestStatus(id: string, status: 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA') {
      try {
        await apiFetch(`/api/solicitudes-cita/${id}/estado`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: status }),
        });
      } catch (err) {
        console.error(err);
      }
      const r = this.requests.find((req) => req.id === id);
      if (r) r.estado = status;
    },

    // --- APPOINTMENTS ---
    async createAppointment(aptData: Omit<Appointment, 'id' | 'fechaCreacion'>): Promise<Appointment> {
      try {
        const res = await apiFetch('/api/citas', {
          method: 'POST',
          body: JSON.stringify(aptData),
        });
        if (res.data) {
          this.appointments.unshift(res.data);
          return res.data;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al programar la cita');
      }
      const fallback: Appointment = {
        ...aptData,
        id: `cit-${Date.now()}`,
        fechaCreacion: new Date().toISOString(),
      };
      this.appointments.unshift(fallback);
      return fallback;
    },

    async updateAppointmentStatus(id: string, status: Appointment['estado']) {
      try {
        const res = await apiFetch(`/api/citas/${id}/estado`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: status }),
        });
        if (res.data) {
          const idx = this.appointments.findIndex((a) => a.id === id);
          if (idx !== -1) this.appointments[idx] = res.data;
          return;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al cambiar estado de cita');
      }
      const apt = this.appointments.find((a) => a.id === id);
      if (apt) apt.estado = status;
    },

    async rescheduleAppointment(id: string, fecha: string, horaInicio: string, horaFin: string) {
      try {
        const res = await apiFetch(`/api/citas/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ fecha, horaInicio }),
        });
        if (res.data) {
          const idx = this.appointments.findIndex((a) => a.id === id);
          if (idx !== -1) this.appointments[idx] = res.data;
          return;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al reprogramar la cita');
      }
      const apt = this.appointments.find((a) => a.id === id);
      if (apt) {
        apt.fecha = fecha;
        apt.horaInicio = horaInicio;
        apt.horaFin = horaFin;
      }
    },

    // --- PAYMENTS & CAJA ---
    async registerPayment(paymentData: Omit<Payment, 'id' | 'numeroComprobante' | 'fecha'>): Promise<Payment> {
      try {
        const res = await apiFetch('/api/pagos', {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });
        if (res.data) {
          this.payments.unshift(res.data);

          // Refresh cash register and appointments
          const cashRes = await apiFetch('/api/cajas/actual').catch(() => null);
          if (cashRes?.data) this.cashRegister = cashRes.data;

          const appsRes = await apiFetch('/api/citas').catch(() => null);
          if (appsRes?.data) this.appointments = appsRes.data;

          return res.data;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al registrar el pago');
      }

      const now = new Date();
      const receiptNum = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallback: Payment = {
        ...paymentData,
        id: `pag-${Date.now()}`,
        numeroComprobante: receiptNum,
        fecha: now.toISOString(),
      };
      this.payments.unshift(fallback);
      return fallback;
    },

    async annulPayment(paymentId: string, motivoAnulacion: string) {
      try {
        const res = await apiFetch(`/api/pagos/${paymentId}/anular`, {
          method: 'PATCH',
          body: JSON.stringify({ motivoAnulacion }),
        });
        if (res.data) {
          const idx = this.payments.findIndex((p) => p.id === paymentId);
          if (idx !== -1) this.payments[idx] = res.data;

          // Refresh cash register
          const cashRes = await apiFetch('/api/cajas/actual').catch(() => null);
          if (cashRes?.data) this.cashRegister = cashRes.data;

          return res.data;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al anular el pago');
      }
    },

    async openCashRegister(montoInicialQ: number) {
      try {
        const res = await apiFetch('/api/cajas/abrir', {
          method: 'POST',
          body: JSON.stringify({ montoInicialQ }),
        });
        if (res.data) {
          this.cashRegister = res.data;
          return res.data;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al abrir la caja diaria');
      }
    },

    async closeCashRegister(efectivoContadoQ?: number, observaciones?: string) {
      try {
        const cajaId = this.cashRegister.id;
        const res = await apiFetch(`/api/cajas/${cajaId}/cerrar`, {
          method: 'POST',
          body: JSON.stringify({
            efectivoContadoQ: efectivoContadoQ !== undefined ? efectivoContadoQ : this.cashRegister.montoInicialQ,
            observaciones,
          }),
        });
        if (res.data) {
          this.cashRegister = res.data;
          return res.data;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al cerrar la caja');
      }
    },

    // --- MATERIALS ---
    async addMaterial(mat: Omit<EducationalMaterial, 'id' | 'fechaRegistro'>) {
      try {
        const res = await apiFetch('/api/materiales', {
          method: 'POST',
          body: JSON.stringify(mat),
        });
        if (res.data) {
          this.materials.push(res.data);
          return res.data;
        }
      } catch (err) {
        console.error(err);
      }
      this.materials.push({ ...mat, id: `mat-${Date.now()}`, fechaRegistro: new Date().toISOString() });
    },

    async updateMaterial(id: string, updated: Partial<EducationalMaterial>) {
      try {
        const res = await apiFetch(`/api/materiales/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (res.data) {
          const idx = this.materials.findIndex((m) => m.id === id);
          if (idx !== -1) this.materials[idx] = res.data;
          return;
        }
      } catch (err) {
        console.error(err);
      }
      const idx = this.materials.findIndex((m) => m.id === id);
      if (idx !== -1) this.materials[idx] = { ...this.materials[idx], ...updated };
    },

    async assignMaterialToPatient(materialId: string, patientId: string) {
      try {
        const res = await apiFetch(`/api/materiales/${materialId}/asignar`, {
          method: 'POST',
          body: JSON.stringify({ pacienteId: patientId }),
        });
        if (res.data) {
          const idx = this.materials.findIndex((m) => m.id === materialId);
          if (idx !== -1) this.materials[idx] = res.data;
          return;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al asignar material');
      }
    },

    removeMaterialFromPatient(materialId: string, patientId: string) {
      const mat = this.materials.find((m) => m.id === materialId);
      if (mat) {
        mat.assignedPatientIds = mat.assignedPatientIds.filter((id) => id !== patientId);
        this.updateMaterial(materialId, { assignedPatientIds: mat.assignedPatientIds });
      }
    },

    addCashMovement(mov: Omit<CashMovement, 'id' | 'hora'>) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newMovement: CashMovement = {
        ...mov,
        id: `mov-${Date.now()}`,
        hora: timeStr,
      };
      this.cashRegister.movimientos = this.cashRegister.movimientos || [];
      this.cashRegister.movimientos.unshift(newMovement);
    },

    // --- CONTENT & CONTACT ---
    async updateInstitutionalContent(updated: Partial<InstitutionalContent>) {
      try {
        const res = await apiFetch('/api/contenido', {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        if (res.data) {
          this.content = res.data;
          return;
        }
      } catch (err) {
        console.error(err);
      }
      this.content = { ...this.content, ...updated };
    },

    async submitContactMessage(msg: Omit<ContactMessage, 'id' | 'fecha' | 'leido'>) {
      try {
        const res = await apiFetch('/api/contacto', {
          method: 'POST',
          body: JSON.stringify(msg),
        });
        if (res.data) {
          this.messages.unshift(res.data);
          return res.data;
        }
      } catch (err) {
        console.error(err);
      }
      this.messages.unshift({
        ...msg,
        id: `msg-${Date.now()}`,
        fecha: new Date().toISOString(),
        leido: false,
      });
    },

    async markMessageRead(id: string) {
      try {
        await apiFetch(`/api/contacto/${id}/leer`, { method: 'PATCH' });
      } catch (err) {
        console.error(err);
      }
      const m = this.messages.find((msg) => msg.id === id);
      if (m) m.leido = true;
    },
  },
});
