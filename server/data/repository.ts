import {
  SEED_USERS,
  SEED_SERVICES,
  SEED_PATIENTS,
  SEED_GUARDIANS,
  SEED_APPOINTMENTS,
  SEED_MATERIALS,
  SEED_REQUESTS,
  SEED_CASH_REGISTERS,
  SEED_PAYMENTS,
  SEED_SCHEDULES,
  SEED_CONTENT,
  SEED_MESSAGES,
} from './initialData';
import { isDbConnected } from '../config/db';
import { UserModel } from '../models/User';
import { PatientModel } from '../models/Patient';
import { GuardianModel } from '../models/Guardian';
import { ServiceModel } from '../models/Service';
import { AppointmentModel } from '../models/Appointment';
import { RequestModel } from '../models/Request';
import { MaterialModel } from '../models/Material';
import { PaymentModel } from '../models/Payment';
import { CashRegisterModel } from '../models/CashRegister';
import { ScheduleModel } from '../models/Schedule';
import { ContactMessageModel } from '../models/ContactMessage';
import { ContentModel } from '../models/Content';

// RN-28: Monetary precision to 2 decimal places using cents rounding
export function roundQ(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

// Age calculation helper from YYYY-MM-DD
export function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Time helper to add minutes to HH:mm string (RN-12)
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Conflict overlap check between two intervals [start1, end1) and [start2, end2)
export function isOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  return !(end1 <= start2 || start1 >= end2);
}

class DataRepository {
  private users = JSON.parse(JSON.stringify(SEED_USERS));
  private services = JSON.parse(JSON.stringify(SEED_SERVICES));
  private patients = JSON.parse(JSON.stringify(SEED_PATIENTS));
  private guardians = JSON.parse(JSON.stringify(SEED_GUARDIANS));
  private appointments = JSON.parse(JSON.stringify(SEED_APPOINTMENTS));
  private materials = JSON.parse(JSON.stringify(SEED_MATERIALS));
  private requests = JSON.parse(JSON.stringify(SEED_REQUESTS));
  private cashRegisters = JSON.parse(JSON.stringify(SEED_CASH_REGISTERS));
  private payments = JSON.parse(JSON.stringify(SEED_PAYMENTS));
  private schedules = JSON.parse(JSON.stringify(SEED_SCHEDULES));
  private content = JSON.parse(JSON.stringify(SEED_CONTENT));
  private messages = JSON.parse(JSON.stringify(SEED_MESSAGES));

  private isSeededInMongo = false;

  constructor() {
    this.trySyncToMongo();
  }

  public async trySyncToMongo() {
    if (this.isSeededInMongo || !isDbConnected()) return;

    try {
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log('[Database] Seeding initial collections in MongoDB...');
        await UserModel.insertMany(this.users);
        await ServiceModel.insertMany(this.services);
        await PatientModel.insertMany(this.patients);
        await GuardianModel.insertMany(this.guardians);
        await AppointmentModel.insertMany(this.appointments);
        await MaterialModel.insertMany(this.materials);
        await RequestModel.insertMany(this.requests);
        await CashRegisterModel.insertMany(this.cashRegisters);
        await PaymentModel.insertMany(this.payments);
        await ScheduleModel.insertMany(this.schedules);
        await ContactMessageModel.insertMany(this.messages);
        await ContentModel.create(this.content);
        console.log('[Database] MongoDB seeded with 13 collections successfully.');
      }
      this.isSeededInMongo = true;
    } catch (err) {
      console.warn('[Database] Sync error (will fallback to memory):', err);
    }
  }

  // --- USERS ---
  public getUsers() {
    return this.users.map(({ passwordHash, ...u }: any) => u);
  }

  public getUserById(id: string) {
    const user = this.users.find((u: any) => u.id === id);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  public getUserByEmail(email: string) {
    return this.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  }

  public async createUser(userData: any) {
    const newUser = {
      id: `usr-${Date.now()}`,
      ...userData,
      activo: userData.activo !== undefined ? userData.activo : true,
    };
    this.users.push(newUser);
    if (isDbConnected()) {
      try {
        await UserModel.create(newUser);
      } catch (e) {
        console.error(e);
      }
    }
    const { passwordHash, ...safe } = newUser;
    return safe;
  }

  public async updateUser(id: string, updates: any) {
    const index = this.users.findIndex((u: any) => u.id === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...updates };
    if (isDbConnected()) {
      try {
        await UserModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    const { passwordHash, ...safe } = this.users[index];
    return safe;
  }

  // --- SERVICES ---
  public getServices(onlyActive = false) {
    return onlyActive ? this.services.filter((s: any) => s.estado === 'ACTIVO') : this.services;
  }

  public getServiceById(id: string) {
    return this.services.find((s: any) => s.id === id) || null;
  }

  public async createService(serviceData: any) {
    const newService = {
      id: `srv-${Date.now()}`,
      nombre: serviceData.nombre,
      descripcion: serviceData.descripcion,
      duracionMinutos: Number(serviceData.duracionMinutos),
      precioQ: roundQ(serviceData.precioQ),
      imagenUrl: serviceData.imagenUrl || '',
      estado: serviceData.estado || 'ACTIVO',
      categoria: serviceData.categoria || 'General',
    };
    this.services.push(newService);
    if (isDbConnected()) {
      try {
        await ServiceModel.create(newService);
      } catch (e) {
        console.error(e);
      }
    }
    return newService;
  }

  public async updateService(id: string, updates: any) {
    const idx = this.services.findIndex((s: any) => s.id === id);
    if (idx === -1) return null;
    if (updates.precioQ !== undefined) updates.precioQ = roundQ(updates.precioQ);
    if (updates.duracionMinutos !== undefined) updates.duracionMinutos = Number(updates.duracionMinutos);
    this.services[idx] = { ...this.services[idx], ...updates };
    if (isDbConnected()) {
      try {
        await ServiceModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    return this.services[idx];
  }

  // --- PATIENTS & GUARDIANS ---
  public getPatients(filter?: { search?: string; estado?: string }) {
    let result = [...this.patients];
    if (filter?.estado) {
      result = result.filter((p: any) => p.estado === filter.estado);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.nombres.toLowerCase().includes(q) ||
          p.apellidos.toLowerCase().includes(q) ||
          (p.telefono && p.telefono.includes(q))
      );
    }
    // Calculate age on the fly
    return result.map((p: any) => ({
      ...p,
      edad: calculateAge(p.fechaNacimiento),
      responsables: this.guardians.filter((g: any) => g.patientIds?.includes(p.id) || p.responsableIds?.includes(g.id)),
    }));
  }

  public getPatientById(id: string) {
    const p = this.patients.find((pat: any) => pat.id === id);
    if (!p) return null;
    return {
      ...p,
      edad: calculateAge(p.fechaNacimiento),
      responsables: this.guardians.filter((g: any) => g.patientIds?.includes(p.id) || p.responsableIds?.includes(g.id)),
    };
  }

  public async createPatient(patientData: any) {
    const newPatient = {
      id: `pac-${Date.now()}`,
      nombres: patientData.nombres,
      apellidos: patientData.apellidos,
      fechaNacimiento: patientData.fechaNacimiento,
      sexo: patientData.sexo || 'M',
      telefono: patientData.telefono || '',
      direccion: patientData.direccion || '',
      fechaInicio: patientData.fechaInicio || new Date().toISOString().split('T')[0],
      observaciones: patientData.observaciones || '',
      fotoUrl: patientData.fotoUrl || '',
      estado: patientData.estado || 'ACTIVO',
      responsableIds: patientData.responsableIds || [],
    };
    this.patients.push(newPatient);

    // If responsableIds were supplied, link in guardians
    if (newPatient.responsableIds.length > 0) {
      this.guardians.forEach((g: any) => {
        if (newPatient.responsableIds.includes(g.id) && !g.patientIds.includes(newPatient.id)) {
          g.patientIds.push(newPatient.id);
        }
      });
    }

    if (isDbConnected()) {
      try {
        await PatientModel.create(newPatient);
      } catch (e) {
        console.error(e);
      }
    }
    return this.getPatientById(newPatient.id);
  }

  public async updatePatient(id: string, updates: any) {
    const idx = this.patients.findIndex((p: any) => p.id === id);
    if (idx === -1) return null;

    this.patients[idx] = { ...this.patients[idx], ...updates };

    // Update guardian associations if provided
    if (updates.responsableIds) {
      this.guardians.forEach((g: any) => {
        const isAssociated = updates.responsableIds.includes(g.id);
        const hasPatient = g.patientIds?.includes(id);
        if (isAssociated && !hasPatient) {
          g.patientIds = g.patientIds || [];
          g.patientIds.push(id);
        } else if (!isAssociated && hasPatient) {
          g.patientIds = g.patientIds.filter((pid: string) => pid !== id);
        }
      });
    }

    if (isDbConnected()) {
      try {
        await PatientModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    return this.getPatientById(id);
  }

  // --- GUARDIANS ---
  public getGuardians() {
    return this.guardians.map((g: any) => ({
      ...g,
      pacientesAsociados: this.patients
        .filter((p: any) => g.patientIds?.includes(p.id) || p.responsableIds?.includes(g.id))
        .map((p: any) => ({ id: p.id, nombres: p.nombres, apellidos: p.apellidos, fechaNacimiento: p.fechaNacimiento })),
    }));
  }

  public getGuardianById(id: string) {
    const g = this.guardians.find((gua: any) => gua.id === id);
    if (!g) return null;
    return {
      ...g,
      pacientesAsociados: this.patients
        .filter((p: any) => g.patientIds?.includes(p.id) || p.responsableIds?.includes(g.id))
        .map((p: any) => ({ id: p.id, nombres: p.nombres, apellidos: p.apellidos, fechaNacimiento: p.fechaNacimiento })),
    };
  }

  public async createGuardian(guardianData: any) {
    const newGuardian = {
      id: `resp-${Date.now()}`,
      nombres: guardianData.nombres,
      apellidos: guardianData.apellidos,
      parentesco: guardianData.parentesco,
      telefono: guardianData.telefono,
      email: guardianData.email || '',
      direccion: guardianData.direccion || '',
      fotoUrl: guardianData.fotoUrl || '',
      patientIds: guardianData.patientIds || [],
    };
    this.guardians.push(newGuardian);

    // Also link back in patient records
    if (newGuardian.patientIds.length > 0) {
      newGuardian.patientIds.forEach((pid: string) => {
        const pat = this.patients.find((p: any) => p.id === pid);
        if (pat) {
          pat.responsableIds = pat.responsableIds || [];
          if (!pat.responsableIds.includes(newGuardian.id)) {
            pat.responsableIds.push(newGuardian.id);
          }
        }
      });
    }

    if (isDbConnected()) {
      try {
        await GuardianModel.create(newGuardian);
      } catch (e) {
        console.error(e);
      }
    }
    return this.getGuardianById(newGuardian.id);
  }

  public async updateGuardian(id: string, updates: any) {
    const idx = this.guardians.findIndex((g: any) => g.id === id);
    if (idx === -1) return null;
    this.guardians[idx] = { ...this.guardians[idx], ...updates };

    if (updates.patientIds) {
      this.patients.forEach((p: any) => {
        const isAssociated = updates.patientIds.includes(p.id);
        const hasResp = p.responsableIds?.includes(id);
        if (isAssociated && !hasResp) {
          p.responsableIds = p.responsableIds || [];
          p.responsableIds.push(id);
        } else if (!isAssociated && hasResp) {
          p.responsableIds = p.responsableIds.filter((rid: string) => rid !== id);
        }
      });
    }

    if (isDbConnected()) {
      try {
        await GuardianModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    return this.getGuardianById(id);
  }

  // --- APPOINTMENTS & RULES VALIDATION ---
  public getAppointments(filter?: {
    pacienteId?: string;
    profesionalId?: string;
    fecha?: string;
    estado?: string;
  }) {
    let result = [...this.appointments];
    if (filter?.pacienteId) result = result.filter((a: any) => a.pacienteId === filter.pacienteId);
    if (filter?.profesionalId) result = result.filter((a: any) => a.profesionalId === filter.profesionalId);
    if (filter?.fecha) result = result.filter((a: any) => a.fecha === filter.fecha);
    if (filter?.estado) result = result.filter((a: any) => a.estado === filter.estado);

    return result.map((a: any) => this.hydrateAppointment(a));
  }

  public getAppointmentById(id: string) {
    const app = this.appointments.find((a: any) => a.id === id);
    if (!app) return null;
    return this.hydrateAppointment(app);
  }

  private hydrateAppointment(app: any) {
    const paciente = this.patients.find((p: any) => p.id === app.pacienteId);
    const servicio = this.services.find((s: any) => s.id === app.servicioId);
    const profesional = this.users.find((u: any) => u.id === app.profesionalId);

    const validPayments = this.payments.filter(
      (p: any) => p.citaId === app.id && p.estado === 'REGISTRADO'
    );
    const totalPagado = roundQ(validPayments.reduce((acc: number, p: any) => acc + p.montoQ, 0));
    const saldoPendiente = roundQ(Math.max(0, app.precioQ - totalPagado));

    let estadoFinanciero: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' = 'PENDIENTE';
    if (totalPagado >= app.precioQ && app.precioQ > 0) {
      estadoFinanciero = 'PAGADO';
    } else if (totalPagado > 0) {
      estadoFinanciero = 'PARCIAL';
    }

    return {
      ...app,
      pacienteNombre: paciente ? `${paciente.nombres} ${paciente.apellidos}` : 'Paciente desconocido',
      servicioNombre: servicio ? servicio.nombre : 'Servicio desconocido',
      profesionalNombre: profesional ? profesional.nombre : 'Profesional no asignado',
      totalPagadoQ: totalPagado,
      saldoPendienteQ: saldoPendiente,
      estadoFinanciero,
      pagos: validPayments,
    };
  }

  public validateAppointmentRules(appointmentData: {
    pacienteId: string;
    servicioId: string;
    profesionalId: string;
    fecha: string;
    horaInicio: string;
    idToIgnore?: string;
  }): { valid: boolean; error?: string; code?: string; calculatedHoraFin?: string; precioQ?: number } {
    const { pacienteId, servicioId, profesionalId, fecha, horaInicio, idToIgnore } = appointmentData;

    // RN-14 & RN-03: Patient must exist and be ACTIVE
    const patient = this.patients.find((p: any) => p.id === pacienteId);
    if (!patient) {
      return { valid: false, error: 'Paciente no encontrado en el sistema', code: 'RN-03' };
    }
    if (patient.estado !== 'ACTIVO') {
      return { valid: false, error: 'RN-14: No se pueden programar citas para pacientes inactivos', code: 'RN-14' };
    }

    // RN-04: Minor (<18 yo) must have at least one registered guardian
    const age = calculateAge(patient.fechaNacimiento);
    const hasGuardian =
      (patient.responsableIds && patient.responsableIds.length > 0) ||
      this.guardians.some((g: any) => g.patientIds?.includes(patient.id));
    if (age < 18 && !hasGuardian) {
      return {
        valid: false,
        error: `RN-04: El paciente es menor de edad (${age} años) y debe tener al menos un responsable registrado antes de programar una cita`,
        code: 'RN-04',
      };
    }

    // RN-07 & RN-03: Service must exist and be ACTIVE
    const service = this.services.find((s: any) => s.id === servicioId);
    if (!service) {
      return { valid: false, error: 'Servicio clínico no encontrado', code: 'RN-03' };
    }
    if (service.estado !== 'ACTIVO') {
      return { valid: false, error: 'RN-07: Los servicios inactivos no pueden seleccionarse para nuevas citas', code: 'RN-07' };
    }

    // RN-03: Professional must exist and be ACTIVE
    const prof = this.users.find((u: any) => u.id === profesionalId);
    if (!prof) {
      return { valid: false, error: 'Profesional no encontrado', code: 'RN-03' };
    }
    if (!prof.activo) {
      return { valid: false, error: 'RN-03: El profesional seleccionado está inactivo', code: 'RN-03' };
    }

    // RN-11: Cannot book appointment in past date / time (allow today with past hour check)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (fecha < todayStr) {
      return { valid: false, error: 'RN-11: No se pueden programar citas en fechas pasadas', code: 'RN-11' };
    }
    if (fecha === todayStr) {
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (horaInicio < currentHHMM) {
        return { valid: false, error: 'RN-11: La hora de inicio no puede ser anterior a la hora actual', code: 'RN-11' };
      }
    }

    // RN-12: End time calculated using service duration
    const calculatedHoraFin = addMinutesToTime(horaInicio, service.duracionMinutos);

    // RN-02: Respect schedule hours configured in MongoDB/Repository
    const dateObj = new Date(`${fecha}T00:00:00`);
    let dayOfWeekNum = dateObj.getDay(); // 0 is Sunday, 1 is Monday
    dayOfWeekNum = dayOfWeekNum === 0 ? 7 : dayOfWeekNum; // Map to 1-7
    const schedule = this.schedules.find((s: any) => s.diaNumero === dayOfWeekNum);

    if (!schedule || !schedule.activo) {
      return {
        valid: false,
        error: `RN-02: El centro no atiende los días ${schedule?.dia || 'seleccionados'}`,
        code: 'RN-02',
      };
    }

    if (horaInicio < schedule.horaApertura || calculatedHoraFin > schedule.horaCierre) {
      return {
        valid: false,
        error: `RN-02: El horario de la cita (${horaInicio} - ${calculatedHoraFin}) debe estar dentro del horario de atención (${schedule.horaApertura} - ${schedule.horaCierre})`,
        code: 'RN-02',
      };
    }

    // RN-01 & RN-13: No overlapping appointments for the same professional
    // (Cancelled and Completed appointments do NOT block future appointments, RN-13)
    const existingActiveAppointments = this.appointments.filter(
      (a: any) =>
        a.profesionalId === profesionalId &&
        a.fecha === fecha &&
        a.id !== idToIgnore &&
        a.estado !== 'CANCELADA' &&
        a.estado !== 'COMPLETADA'
    );

    for (const app of existingActiveAppointments) {
      if (isOverlapping(horaInicio, calculatedHoraFin, app.horaInicio, app.horaFin)) {
        return {
          valid: false,
          error: `RN-01: El profesional ya tiene una cita programada entre las ${app.horaInicio} y las ${app.horaFin} (${app.estado})`,
          code: 'RN-01',
        };
      }
    }

    return {
      valid: true,
      calculatedHoraFin,
      precioQ: service.precioQ,
    };
  }

  public async createAppointment(appointmentData: any) {
    const validation = this.validateAppointmentRules({
      pacienteId: appointmentData.pacienteId,
      servicioId: appointmentData.servicioId,
      profesionalId: appointmentData.profesionalId,
      fecha: appointmentData.fecha,
      horaInicio: appointmentData.horaInicio,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const newAppointment = {
      id: `cit-${Date.now()}`,
      pacienteId: appointmentData.pacienteId,
      servicioId: appointmentData.servicioId,
      profesionalId: appointmentData.profesionalId,
      fecha: appointmentData.fecha,
      horaInicio: appointmentData.horaInicio,
      horaFin: validation.calculatedHoraFin!,
      precioQ: validation.precioQ!, // Copies price from service at scheduling time (RF-07)
      estado: appointmentData.estado || 'PENDIENTE',
      observaciones: appointmentData.observaciones || '',
      sede: appointmentData.sede || 'Sede Central - Zona 10',
      fechaCreacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    this.appointments.push(newAppointment);

    if (isDbConnected()) {
      try {
        await AppointmentModel.create(newAppointment);
      } catch (e) {
        console.error(e);
      }
    }

    return this.getAppointmentById(newAppointment.id);
  }

  public async updateAppointment(id: string, updates: any) {
    const app = this.appointments.find((a: any) => a.id === id);
    if (!app) throw new Error('Cita no encontrada');

    // RN-06: Completed appointments CANNOT be rescheduled
    if (app.estado === 'COMPLETADA') {
      if (updates.fecha || updates.horaInicio || updates.horaFin) {
        throw new Error('RN-06: Las citas COMPLETADAS no pueden reprogramarse');
      }
    }

    // If rescheduling, validate rules
    if (updates.fecha || updates.horaInicio || updates.servicioId || updates.profesionalId) {
      const validation = this.validateAppointmentRules({
        pacienteId: updates.pacienteId || app.pacienteId,
        servicioId: updates.servicioId || app.servicioId,
        profesionalId: updates.profesionalId || app.profesionalId,
        fecha: updates.fecha || app.fecha,
        horaInicio: updates.horaInicio || app.horaInicio,
        idToIgnore: id,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      updates.horaFin = validation.calculatedHoraFin;
    }

    const idx = this.appointments.findIndex((a: any) => a.id === id);
    this.appointments[idx] = { ...this.appointments[idx], ...updates };

    if (isDbConnected()) {
      try {
        await AppointmentModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }

    return this.getAppointmentById(id);
  }

  public async changeAppointmentStatus(id: string, newStatus: 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA') {
    const app = this.appointments.find((a: any) => a.id === id);
    if (!app) throw new Error('Cita no encontrada');

    // RN-05: Citas CANCELADAS cannot transition directly to COMPLETADA
    if (app.estado === 'CANCELADA' && newStatus === 'COMPLETADA') {
      throw new Error('RN-05: Las citas CANCELADAS no pueden pasar directamente a COMPLETADA');
    }

    // RN-27: A cita with valid payments cannot be CANCELADA unless payments are annulled first!
    if (newStatus === 'CANCELADA') {
      const validPayments = this.payments.filter((p: any) => p.citaId === id && p.estado === 'REGISTRADO');
      if (validPayments.length > 0) {
        throw new Error(
          'RN-27: Para mantener consistencia financiera, una cita con pagos válidos no puede cancelarse. Primero deben anularse sus pagos mientras la caja correspondiente permanezca abierta.'
        );
      }
    }

    return this.updateAppointment(id, { estado: newStatus });
  }

  // --- APPOINTMENT REQUESTS ---
  public getRequests(estado?: string) {
    let result = [...this.requests];
    if (estado) result = result.filter((r: any) => r.estado === estado);
    return result.map((r: any) => {
      const s = this.services.find((serv: any) => serv.id === r.servicioId);
      return {
        ...r,
        servicioNombre: s ? s.nombre : 'Servicio solicitado',
      };
    });
  }

  public async createRequest(requestData: any) {
    const newReq = {
      id: `req-${Date.now()}`,
      solicitanteNombre: requestData.solicitanteNombre,
      email: requestData.email,
      telefono: requestData.telefono,
      servicioId: requestData.servicioId,
      fechaPreferida: requestData.fechaPreferida,
      sedePreferida: requestData.sedePreferida || 'Sede Central - Zona 10',
      mensaje: requestData.mensaje || '',
      estado: 'PENDIENTE' as const,
      fechaCreacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.requests.unshift(newReq);
    if (isDbConnected()) {
      try {
        await RequestModel.create(newReq);
      } catch (e) {
        console.error(e);
      }
    }
    return newReq;
  }

  public async updateRequestStatus(id: string, estado: 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA', citaGeneradaId?: string) {
    const idx = this.requests.findIndex((r: any) => r.id === id);
    if (idx === -1) return null;
    this.requests[idx].estado = estado;
    if (citaGeneradaId) this.requests[idx].citaGeneradaId = citaGeneradaId;

    if (isDbConnected()) {
      try {
        await RequestModel.findOneAndUpdate({ id }, { estado, citaGeneradaId });
      } catch (e) {
        console.error(e);
      }
    }
    return this.requests[idx];
  }

  // --- MATERIALS ---
  public getMaterials(pacienteId?: string) {
    if (pacienteId) {
      return this.materials.filter((m: any) => m.assignedPatientIds?.includes(pacienteId));
    }
    return this.materials;
  }

  public async createMaterial(materialData: any) {
    const newMat = {
      id: `mat-${Date.now()}`,
      titulo: materialData.titulo,
      descripcion: materialData.descripcion,
      tipo: materialData.tipo,
      enlaceRecurso: materialData.enlaceRecurso,
      fechaRegistro: new Date().toISOString().split('T')[0],
      estado: materialData.estado || 'ACTIVO',
      assignedPatientIds: materialData.assignedPatientIds || [],
    };
    this.materials.push(newMat);
    if (isDbConnected()) {
      try {
        await MaterialModel.create(newMat);
      } catch (e) {
        console.error(e);
      }
    }
    return newMat;
  }

  public async updateMaterial(id: string, updates: any) {
    const idx = this.materials.findIndex((m: any) => m.id === id);
    if (idx === -1) return null;
    this.materials[idx] = { ...this.materials[idx], ...updates };
    if (isDbConnected()) {
      try {
        await MaterialModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    return this.materials[idx];
  }

  // RN-09: Assign material only to ACTIVE patients
  public async assignMaterialToPatient(materialId: string, pacienteId: string) {
    const material = this.materials.find((m: any) => m.id === materialId);
    if (!material) throw new Error('Material no encontrado');

    const patient = this.patients.find((p: any) => p.id === pacienteId);
    if (!patient) throw new Error('Paciente no encontrado');

    if (patient.estado !== 'ACTIVO') {
      throw new Error('RN-09: Los materiales solamente pueden asignarse a pacientes activos');
    }

    material.assignedPatientIds = material.assignedPatientIds || [];
    if (!material.assignedPatientIds.includes(pacienteId)) {
      material.assignedPatientIds.push(pacienteId);
    }

    if (isDbConnected()) {
      try {
        await MaterialModel.findOneAndUpdate({ id: materialId }, { assignedPatientIds: material.assignedPatientIds });
      } catch (e) {
        console.error(e);
      }
    }
    return material;
  }

  // --- CASH REGISTERS (CAJAS) ---
  public getCashRegisters(filter?: { usuarioId?: string; estado?: string }) {
    let result = [...this.cashRegisters];
    if (filter?.usuarioId) result = result.filter((c: any) => c.usuarioId === filter.usuarioId);
    if (filter?.estado) result = result.filter((c: any) => c.estado === filter.estado);
    return result;
  }

  public getCashRegisterById(id: string) {
    return this.cashRegisters.find((c: any) => c.id === id) || null;
  }

  public getUserOpenCashRegister(usuarioId: string) {
    return this.cashRegisters.find((c: any) => c.usuarioId === usuarioId && c.estado === 'ABIERTA') || null;
  }

  // RN-22: Each user can only have ONE open cash register at a time
  public async openCashRegister(usuarioId: string, usuarioNombre: string, montoInicialQ: number) {
    const existingOpen = this.getUserOpenCashRegister(usuarioId);
    if (existingOpen) {
      throw new Error(`RN-22: El usuario ya tiene una caja abierta (ID: ${existingOpen.id}). Debe cerrarla primero.`);
    }

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const initialRounded = roundQ(montoInicialQ || 0);

    const newCash = {
      id: `caj-${Date.now()}`,
      usuarioId,
      usuarioNombre,
      fecha: formattedDate,
      fechaApertura: `${formattedDate} ${formattedTime}:00`,
      horaApertura: formattedTime,
      montoInicialQ: initialRounded,
      estado: 'ABIERTA' as const,
      totalEfectivoQ: 0.0,
      totalTransferenciasQ: 0.0,
      totalTarjetaQ: 0.0,
      totalIngresosQ: 0.0,
      efectivoEsperadoQ: initialRounded,
      movimientos: [],
    };

    this.cashRegisters.unshift(newCash);
    if (isDbConnected()) {
      try {
        await CashRegisterModel.create(newCash);
      } catch (e) {
        console.error(e);
      }
    }
    return newCash;
  }

  // RN-23 & Recalculate cash register totals from valid payments
  public recalculateCashRegister(cajaId: string) {
    const caja = this.cashRegisters.find((c: any) => c.id === cajaId);
    if (!caja) return null;

    const validPayments = this.payments.filter((p: any) => p.cajaId === cajaId && p.estado === 'REGISTRADO');

    let totalEfectivo = 0;
    let totalTransferencias = 0;
    let totalTarjeta = 0;

    validPayments.forEach((p: any) => {
      if (p.metodoPago === 'EFECTIVO') totalEfectivo += p.montoQ;
      else if (p.metodoPago === 'TRANSFERENCIA') totalTransferencias += p.montoQ;
      else if (p.metodoPago === 'TARJETA') totalTarjeta += p.montoQ;
    });

    caja.totalEfectivoQ = roundQ(totalEfectivo);
    caja.totalTransferenciasQ = roundQ(totalTransferencias);
    caja.totalTarjetaQ = roundQ(totalTarjeta);
    caja.totalIngresosQ = roundQ(totalEfectivo + totalTransferencias + totalTarjeta);
    caja.efectivoEsperadoQ = roundQ(caja.montoInicialQ + caja.totalEfectivoQ);

    return caja;
  }

  public async closeCashRegister(
    cajaId: string,
    usuarioId: string,
    efectivoContadoQ: number,
    observaciones?: string
  ) {
    const caja = this.cashRegisters.find((c: any) => c.id === cajaId);
    if (!caja) throw new Error('Caja no encontrada');

    if (caja.estado === 'CERRADA') {
      throw new Error('La caja ya se encuentra cerrada');
    }

    // RN-25: Authorized user validation
    if (caja.usuarioId !== usuarioId) {
      const user = this.users.find((u: any) => u.id === usuarioId);
      if (user?.rol !== 'ADMIN') {
        throw new Error('RN-25: Solamente el usuario responsable o un administrador pueden cerrar esta caja');
      }
    }

    this.recalculateCashRegister(cajaId);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const counted = roundQ(efectivoContadoQ);
    const diferencia = roundQ(counted - caja.efectivoEsperadoQ);

    caja.estado = 'CERRADA';
    caja.efectivoContadoQ = counted;
    caja.diferenciaQ = diferencia;
    caja.fechaCierre = `${formattedDate} ${formattedTime}:00`;
    caja.horaCierre = formattedTime;
    caja.observacionesCierre = observaciones || (diferencia === 0 ? 'Cierre sin diferencias' : `Diferencia de Q${diferencia}`);

    if (isDbConnected()) {
      try {
        await CashRegisterModel.findOneAndUpdate({ id: cajaId }, caja);
      } catch (e) {
        console.error(e);
      }
    }
    return caja;
  }

  // --- PAYMENTS ---
  public getPayments(filter?: { pacienteId?: string; citaId?: string; cajaId?: string; fecha?: string }) {
    let result = [...this.payments];
    if (filter?.pacienteId) result = result.filter((p: any) => p.pacienteId === filter.pacienteId);
    if (filter?.citaId) result = result.filter((p: any) => p.citaId === filter.citaId);
    if (filter?.cajaId) result = result.filter((p: any) => p.cajaId === filter.cajaId);
    if (filter?.fecha) result = result.filter((p: any) => p.fecha.startsWith(filter.fecha!));

    return result.map((p: any) => {
      const pac = this.patients.find((pat: any) => pat.id === p.pacienteId);
      const app = this.appointments.find((a: any) => a.id === p.citaId);
      return {
        ...p,
        pacienteNombre: pac ? `${pac.nombres} ${pac.apellidos}` : 'Paciente',
        citaDetalle: app ? `${app.fecha} ${app.horaInicio}` : 'Cita',
      };
    });
  }

  public getPaymentById(id: string) {
    const p = this.payments.find((pay: any) => pay.id === id);
    if (!p) return null;
    const pac = this.patients.find((pat: any) => pat.id === p.pacienteId);
    const app = this.appointments.find((a: any) => a.id === p.citaId);
    return {
      ...p,
      pacienteNombre: pac ? `${pac.nombres} ${pac.apellidos}` : 'Paciente',
      citaDetalle: app ? `${app.fecha} ${app.horaInicio}` : 'Cita',
    };
  }

  public async registerPayment(paymentData: {
    citaId: string;
    montoQ: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
    concepto?: string;
    notas?: string;
    usuario: { id: string; nombre: string; rol: string };
  }) {
    const { citaId, metodoPago, concepto, notas, usuario } = paymentData;
    const montoQ = roundQ(paymentData.montoQ);

    // RN-16: Monto must be > 0
    if (montoQ <= 0) {
      throw new Error('RN-16: No se pueden registrar pagos con montos menores o iguales a cero');
    }

    // RN-15: Appointment must exist
    const app = this.appointments.find((a: any) => a.id === citaId);
    if (!app) {
      throw new Error('RN-15: El pago debe estar asociado a una cita válida existente');
    }

    // RN-20 & RN-21: Payment must link to an OPEN cash register of the user registering it
    let caja = this.getUserOpenCashRegister(usuario.id);
    if (!caja) {
      // If user is Admin and doesn't have an open box, check if there is an active open box or open one
      if (usuario.rol === 'ADMIN') {
        const anyOpen = this.cashRegisters.find((c: any) => c.estado === 'ABIERTA');
        if (anyOpen) {
          caja = anyOpen;
        } else {
          caja = await this.openCashRegister(usuario.id, usuario.nombre, 0);
        }
      } else {
        throw new Error('RN-20: Debe tener una caja diaria ABIERTA antes de registrar pagos. Abra una caja primero.');
      }
    }

    if (caja.estado === 'CERRADA') {
      throw new Error('RN-21: No pueden registrarse pagos en una caja cerrada');
    }

    // RN-17 & RN-18: Total payments cannot exceed appointment price
    const existingValidPayments = this.payments.filter((p: any) => p.citaId === citaId && p.estado === 'REGISTRADO');
    const currentlyPaid = roundQ(existingValidPayments.reduce((acc: number, p: any) => acc + p.montoQ, 0));
    const pendingBalance = roundQ(app.precioQ - currentlyPaid);

    if (montoQ > pendingBalance + 0.001) {
      throw new Error(
        `RN-17: El monto a pagar (Q${montoQ.toFixed(2)}) supera el saldo pendiente de la cita (Q${pendingBalance.toFixed(2)}). El total pagado no puede superar el costo de la cita (Q${app.precioQ.toFixed(2)}).`
      );
    }

    const now = new Date();
    const formattedDateTime = now.toISOString().replace('T', ' ').substring(0, 19);
    const voucherCount = this.payments.length + 1;
    const voucherNumber = `REC-2026-${String(voucherCount).padStart(4, '0')}`;

    const newPayment = {
      id: `pag-${Date.now()}`,
      numeroComprobante: voucherNumber,
      pacienteId: app.pacienteId,
      citaId: app.id,
      cajaId: caja.id,
      montoQ,
      metodoPago,
      fecha: formattedDateTime,
      concepto: concepto || `Pago de cita clínica (${metodoPago})`,
      notas: notas || '',
      atendidoPor: usuario.nombre,
      usuarioId: usuario.id,
      estado: 'REGISTRADO' as const,
    };

    this.payments.push(newPayment);

    // Add cash movement to the cash register (RN-24)
    caja.movimientos.push({
      id: `mov-${Date.now()}`,
      tipo: 'INGRESO',
      montoQ,
      concepto: `${newPayment.concepto} - Comprobante ${voucherNumber}`,
      hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      metodoPago,
      comprobanteRef: voucherNumber,
      pagoId: newPayment.id,
    });

    this.recalculateCashRegister(caja.id);

    if (isDbConnected()) {
      try {
        await PaymentModel.create(newPayment);
        await CashRegisterModel.findOneAndUpdate({ id: caja.id }, caja);
      } catch (e) {
        console.error(e);
      }
    }

    return this.getPaymentById(newPayment.id);
  }

  // RN-19, RN-27, RN-29: Justified annulment of payment in an OPEN register
  public async annulPayment(
    paymentId: string,
    motivoAnulacion: string,
    usuario: { id: string; nombre: string; rol: string }
  ) {
    const payment = this.payments.find((p: any) => p.id === paymentId);
    if (!payment) throw new Error('Pago no encontrado');

    if (payment.estado === 'ANULADO') {
      throw new Error('El pago ya se encuentra anulado');
    }

    if (!motivoAnulacion || motivoAnulacion.trim().length < 5) {
      throw new Error('Debe proporcionar un motivo justificado para anular el pago (mínimo 5 caracteres)');
    }

    // Check if the cash register is still open (RF-11: only payments in open boxes can be annulled)
    const caja = this.cashRegisters.find((c: any) => c.id === payment.cajaId);
    if (!caja || caja.estado === 'CERRADA') {
      throw new Error(
        'RN-21: Los pagos de cajas cerradas quedan bloqueados para anulación; solamente pueden anularse pagos pertenecientes a cajas abiertas.'
      );
    }

    const now = new Date();
    const formattedDateTime = now.toISOString().replace('T', ' ').substring(0, 19);

    payment.estado = 'ANULADO';
    payment.motivoAnulacion = motivoAnulacion;
    payment.anuladoPor = usuario.nombre;
    payment.fechaAnulacion = formattedDateTime;

    // Remove or balance cash register movement
    caja.movimientos.push({
      id: `mov-anul-${Date.now()}`,
      tipo: 'EGRESO',
      montoQ: payment.montoQ,
      concepto: `ANULACIÓN de Comprobante ${payment.numeroComprobante}: ${motivoAnulacion}`,
      hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      metodoPago: payment.metodoPago,
      comprobanteRef: payment.numeroComprobante,
      pagoId: payment.id,
    });

    this.recalculateCashRegister(caja.id);

    if (isDbConnected()) {
      try {
        await PaymentModel.findOneAndUpdate({ id: paymentId }, payment);
        await CashRegisterModel.findOneAndUpdate({ id: caja.id }, caja);
      } catch (e) {
        console.error(e);
      }
    }

    return payment;
  }

  // --- INSTITUTIONAL CONTENT & SCHEDULES ---
  public getContent() {
    return this.content;
  }

  public async updateContent(updates: any) {
    this.content = { ...this.content, ...updates };
    if (isDbConnected()) {
      try {
        await ContentModel.findOneAndUpdate({ id: 'main-content' }, this.content, { upsert: true });
      } catch (e) {
        console.error(e);
      }
    }
    return this.content;
  }

  public getSchedules() {
    return this.schedules;
  }

  public async updateSchedule(id: string, updates: any) {
    const idx = this.schedules.findIndex((s: any) => s.id === id);
    if (idx === -1) return null;
    this.schedules[idx] = { ...this.schedules[idx], ...updates };
    if (isDbConnected()) {
      try {
        await ScheduleModel.findOneAndUpdate({ id }, updates);
      } catch (e) {
        console.error(e);
      }
    }
    return this.schedules[idx];
  }

  // --- CONTACT MESSAGES ---
  public getMessages() {
    return this.messages;
  }

  public async createMessage(msgData: any) {
    const newMsg = {
      id: `msg-${Date.now()}`,
      nombre: msgData.nombre,
      email: msgData.email,
      telefono: msgData.telefono || '',
      asunto: msgData.asunto,
      mensaje: msgData.mensaje,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      leido: false,
    };
    this.messages.unshift(newMsg);
    if (isDbConnected()) {
      try {
        await ContactMessageModel.create(newMsg);
      } catch (e) {
        console.error(e);
      }
    }
    return newMsg;
  }

  public async markMessageAsRead(id: string) {
    const msg = this.messages.find((m: any) => m.id === id);
    if (!msg) return null;
    msg.leido = true;
    if (isDbConnected()) {
      try {
        await ContactMessageModel.findOneAndUpdate({ id }, { leido: true });
      } catch (e) {
        console.error(e);
      }
    }
    return msg;
  }

  // --- DASHBOARD METRICS ---
  public getDashboardMetrics() {
    const totalPacientes = this.patients.filter((p: any) => p.estado === 'ACTIVO').length;
    const totalCitasHoy = this.appointments.filter(
      (a: any) => a.fecha === new Date().toISOString().split('T')[0] && a.estado !== 'CANCELADA'
    ).length;
    const solicitudesPendientes = this.requests.filter((r: any) => r.estado === 'PENDIENTE').length;
    const validPayments = this.payments.filter((p: any) => p.estado === 'REGISTRADO');
    const totalRecaudadoQ = roundQ(validPayments.reduce((acc: number, p: any) => acc + p.montoQ, 0));

    return {
      totalPacientes,
      totalCitasHoy,
      solicitudesPendientes,
      totalRecaudadoQ,
      totalCajasAbiertas: this.cashRegisters.filter((c: any) => c.estado === 'ABIERTA').length,
      mensajesNoLeidos: this.messages.filter((m: any) => !m.leido).length,
    };
  }
}

export const Repository = new DataRepository();
