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

const STORAGE_PREFIX = 'sigca_armonia_vue_';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    currentUser: (initialUsers[0] as User | null),
    selectedPatientId: ('pac-1' as string | null),
    selectedPaymentForPrint: (null as Payment | null),

    users: loadFromStorage<User[]>('users', initialUsers),
    patients: loadFromStorage<Patient[]>('patients', initialPatients),
    guardians: loadFromStorage<Guardian[]>('guardians', initialGuardians),
    services: loadFromStorage<ClinicalService[]>('services', initialServices),
    appointments: loadFromStorage<Appointment[]>('appointments', initialAppointments),
    requests: loadFromStorage<AppointmentRequest[]>('requests', initialRequests),
    payments: loadFromStorage<Payment[]>('payments', initialPayments),
    cashRegister: loadFromStorage<DailyCashRegister>('cashRegister', initialCashRegister),
    materials: loadFromStorage<EducationalMaterial[]>('materials', initialMaterials),
    content: loadFromStorage<InstitutionalContent>('content', initialContent),
    messages: loadFromStorage<ContactMessage[]>('messages', initialMessages),
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
    persistAll() {
      saveToStorage('users', this.users);
      saveToStorage('patients', this.patients);
      saveToStorage('guardians', this.guardians);
      saveToStorage('services', this.services);
      saveToStorage('appointments', this.appointments);
      saveToStorage('requests', this.requests);
      saveToStorage('payments', this.payments);
      saveToStorage('cashRegister', this.cashRegister);
      saveToStorage('materials', this.materials);
      saveToStorage('content', this.content);
      saveToStorage('messages', this.messages);
    },

    setCurrentUser(user: User | null) {
      this.currentUser = user;
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
      return this.guardians.filter((g) => g.patientIds.includes(patientId));
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
      const totalPaid = pPays.reduce((sum, p) => sum + (p.montoQ || 0), 0);
      return {
        totalCharged,
        totalPaid,
        balance: Math.max(0, totalCharged - totalPaid),
      };
    },

    addPatient(patientData: Omit<Patient, 'id'>): Patient {
      const newPatient: Patient = {
        ...patientData,
        id: `pac-${Date.now()}`,
      };
      this.patients.unshift(newPatient);
      this.persistAll();
      return newPatient;
    },

    updatePatient(id: string, updated: Partial<Patient>) {
      const index = this.patients.findIndex((p) => p.id === id);
      if (index !== -1) {
        this.patients[index] = { ...this.patients[index], ...updated };
        this.persistAll();
      }
    },

    togglePatientStatus(id: string) {
      const p = this.patients.find((pt) => pt.id === id);
      if (p) {
        p.estado = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        this.persistAll();
      }
    },

    addGuardian(gData: Omit<Guardian, 'id'>): Guardian {
      const newG: Guardian = {
        ...gData,
        id: `gua-${Date.now()}`,
      };
      this.guardians.push(newG);
      this.persistAll();
      return newG;
    },

    updateGuardian(id: string, updated: Partial<Guardian>) {
      const index = this.guardians.findIndex((g) => g.id === id);
      if (index !== -1) {
        this.guardians[index] = { ...this.guardians[index], ...updated };
        this.persistAll();
      }
    },

    linkGuardianToPatient(guardianId: string, patientId: string) {
      const g = this.guardians.find((gua) => gua.id === guardianId);
      if (g && !g.patientIds.includes(patientId)) {
        g.patientIds.push(patientId);
        this.persistAll();
      }
    },

    addService(srvData: Omit<ClinicalService, 'id'>) {
      const newSrv: ClinicalService = {
        ...srvData,
        id: `srv-${Date.now()}`,
      };
      this.services.push(newSrv);
      this.persistAll();
    },

    updateService(id: string, updated: Partial<ClinicalService>) {
      const index = this.services.findIndex((s) => s.id === id);
      if (index !== -1) {
        this.services[index] = { ...this.services[index], ...updated };
        this.persistAll();
      }
    },

    submitAppointmentRequest(req: Omit<AppointmentRequest, 'id' | 'estado' | 'fechaCreacion'>) {
      const now = new Date();
      const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newReq: AppointmentRequest = {
        ...req,
        id: `sol-${Date.now()}`,
        estado: 'PENDIENTE',
        fechaCreacion: formatted,
      };
      this.requests.unshift(newReq);
      this.persistAll();
    },

    updateRequestStatus(id: string, status: 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA') {
      const r = this.requests.find((req) => req.id === id);
      if (r) {
        r.estado = status;
        this.persistAll();
      }
    },

    createAppointment(aptData: Omit<Appointment, 'id' | 'fechaCreacion'>): Appointment {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const newApt: Appointment = {
        ...aptData,
        id: `cit-${Date.now().toString().slice(-4)}`,
        fechaCreacion: dateStr,
      };
      this.appointments.unshift(newApt);
      this.persistAll();
      return newApt;
    },

    updateAppointmentStatus(id: string, status: Appointment['estado']) {
      const apt = this.appointments.find((a) => a.id === id);
      if (apt) {
        apt.estado = status;
        this.persistAll();
      }
    },

    rescheduleAppointment(id: string, fecha: string, horaInicio: string, horaFin: string) {
      const apt = this.appointments.find((a) => a.id === id);
      if (apt) {
        apt.fecha = fecha;
        apt.horaInicio = horaInicio;
        apt.horaFin = horaFin;
        this.persistAll();
      }
    },

    registerPayment(paymentData: Omit<Payment, 'id' | 'numeroComprobante' | 'fecha'>): Payment {
      const now = new Date();
      const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const receiptNum = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPayment: Payment = {
        ...paymentData,
        id: `pag-${Date.now()}`,
        numeroComprobante: receiptNum,
        fecha: dateFormatted,
      };

      this.payments.unshift(newPayment);

      if (this.cashRegister.estado === 'ABIERTA') {
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newMovement: CashMovement = {
          id: `mov-${Date.now()}`,
          tipo: 'INGRESO',
          montoQ: newPayment.montoQ,
          concepto: newPayment.concepto,
          hora: timeStr,
          metodoPago: newPayment.metodoPago,
          comprobanteRef: receiptNum,
        };
        this.cashRegister.movimientos.unshift(newMovement);
      }

      this.persistAll();
      return newPayment;
    },

    openCashRegister(montoInicialQ: number) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.cashRegister = {
        id: `caja-${dateStr}`,
        fecha: dateStr,
        estado: 'ABIERTA',
        montoInicialQ,
        usuarioNombre: this.currentUser?.name || 'Recepción',
        horaApertura: timeStr,
        movimientos: [],
      };
      this.persistAll();
    },

    closeCashRegister() {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const totalCashIngresos = this.cashRegister.movimientos
        .filter((m) => m.tipo === 'INGRESO' && m.metodoPago === 'EFECTIVO')
        .reduce((acc, m) => acc + m.montoQ, 0);
      const totalCashEgresos = this.cashRegister.movimientos
        .filter((m) => m.tipo === 'EGRESO' && m.metodoPago === 'EFECTIVO')
        .reduce((acc, m) => acc + m.montoQ, 0);
      const finalAmount = this.cashRegister.montoInicialQ + totalCashIngresos - totalCashEgresos;

      this.cashRegister.estado = 'CERRADA';
      this.cashRegister.horaCierre = timeStr;
      this.cashRegister.montoFinalQ = finalAmount;
      this.persistAll();
    },

    addCashMovement(mov: Omit<CashMovement, 'id' | 'hora'>) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newMovement: CashMovement = {
        ...mov,
        id: `mov-${Date.now()}`,
        hora: timeStr,
      };
      this.cashRegister.movimientos.unshift(newMovement);
      this.persistAll();
    },

    addMaterial(mat: Omit<EducationalMaterial, 'id' | 'fechaRegistro'>) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const newM: EducationalMaterial = {
        ...mat,
        id: `mat-${Date.now()}`,
        fechaRegistro: dateStr,
      };
      this.materials.push(newM);
      this.persistAll();
    },

    updateMaterial(id: string, updated: Partial<EducationalMaterial>) {
      const index = this.materials.findIndex((m) => m.id === id);
      if (index !== -1) {
        this.materials[index] = { ...this.materials[index], ...updated };
        this.persistAll();
      }
    },

    assignMaterialToPatient(materialId: string, patientId: string) {
      const mat = this.materials.find((m) => m.id === materialId);
      if (mat && !mat.assignedPatientIds.includes(patientId)) {
        mat.assignedPatientIds.push(patientId);
        this.persistAll();
      }
    },

    removeMaterialFromPatient(materialId: string, patientId: string) {
      const mat = this.materials.find((m) => m.id === materialId);
      if (mat) {
        mat.assignedPatientIds = mat.assignedPatientIds.filter((id) => id !== patientId);
        this.persistAll();
      }
    },

    updateInstitutionalContent(updated: Partial<InstitutionalContent>) {
      this.content = { ...this.content, ...updated };
      this.persistAll();
    },

    submitContactMessage(msg: Omit<ContactMessage, 'id' | 'fecha' | 'leido'>) {
      const now = new Date();
      const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newMsg: ContactMessage = {
        ...msg,
        id: `msg-${Date.now()}`,
        fecha: dateFormatted,
        leido: false,
      };
      this.messages.unshift(newMsg);
      this.persistAll();
    },

    markMessageRead(id: string) {
      const m = this.messages.find((msg) => msg.id === id);
      if (m) {
        m.leido = true;
        this.persistAll();
      }
    },
  },
});
