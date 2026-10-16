import { Router, Response } from 'express';
import { Repository } from '../data/repository';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export const appointmentRouter = Router();

appointmentRouter.use(authenticateToken);

appointmentRouter.get('/disponibilidad', (req, res: Response) => {
  const { pacienteId, servicioId, profesionalId, fecha, horaInicio, sede, idToIgnore } = req.query;
  if (!pacienteId || !servicioId || !profesionalId || !fecha || !horaInicio || !sede) {
    return res.status(400).json({ success: false, message: 'Paciente, servicio, profesional, fecha, hora y sede son obligatorios.' });
  }
  const result = Repository.validateAppointmentRules({
    pacienteId: String(pacienteId), servicioId: String(servicioId), profesionalId: String(profesionalId),
    fecha: String(fecha), horaInicio: String(horaInicio), sede: String(sede), idToIgnore: idToIgnore ? String(idToIgnore) : undefined,
  });
  return res.status(200).json({ success: true, data: {
    available: result.valid, message: result.error || `Disponible de ${horaInicio} a ${result.calculatedHoraFin}.`,
    horaFin: result.calculatedHoraFin, precioQ: result.precioQ,
  } });
});

// GET /api/citas
appointmentRouter.get('/', (req: AuthRequest, res: Response) => {
  const { pacienteId, profesionalId, fecha, estado } = req.query;

  // If user is a PROFESIONAL, filter to only their appointments unless they are ADMIN or RECEPCION
  let profId = profesionalId as string;
  if (req.user?.rol === 'PROFESIONAL') {
    profId = req.user.id;
  }

  const appointments = Repository.getAppointments({
    pacienteId: pacienteId as string,
    profesionalId: profId,
    fecha: fecha as string,
    estado: estado as string,
  });

  return res.status(200).json({ success: true, count: appointments.length, data: appointments });
});

// GET /api/citas/:id
appointmentRouter.get('/:id', (req, res: Response) => {
  const app = Repository.getAppointmentById(String(req.params.id));
  if (!app) {
    return res.status(404).json({ success: false, message: 'Cita no encontrada' });
  }
  return res.status(200).json({ success: true, data: app });
});

// POST /api/citas
appointmentRouter.post('/', async (req, res: Response) => {
  try {
    const { pacienteId, servicioId, profesionalId, fecha, horaInicio, observaciones, sede } = req.body;

    if (!pacienteId || !servicioId || !profesionalId || !fecha || !horaInicio || !sede) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Todos los datos son requeridos (paciente, servicio, profesional, fecha, horaInicio)',
      });
    }

    const created = await Repository.createAppointment({
      pacienteId,
      servicioId,
      profesionalId,
      fecha,
      horaInicio,
      observaciones,
      sede,
    });

    return res.status(201).json({
      success: true,
      message: 'Cita médica programada exitosamente',
      data: created,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// PUT /api/citas/:id (Reschedule or modify)
appointmentRouter.put('/:id', async (req, res: Response) => {
  try {
    const updated = await Repository.updateAppointment(String(req.params.id), req.body);
    return res.status(200).json({
      success: true,
      message: 'Cita reprogramada exitosamente',
      data: updated,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// PATCH /api/citas/:id/estado (PENDIENTE, CONFIRMADA, COMPLETADA, CANCELADA)
appointmentRouter.patch('/:id/estado', async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = req.body;
    if (!['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Opciones: PENDIENTE, CONFIRMADA, COMPLETADA, CANCELADA',
      });
    }

    // Role check: PROFESIONAL can mark as COMPLETADA (RF-02)
    const updated = await Repository.changeAppointmentStatus(String(req.params.id), estado);
    return res.status(200).json({
      success: true,
      message: `Estado de la cita actualizado a ${estado}`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// GET /api/citas/:id/pagos
appointmentRouter.get('/:id/pagos', (req, res: Response) => {
  const pagos = Repository.getPayments({ citaId: String(req.params.id) });
  return res.status(200).json({ success: true, count: pagos.length, data: pagos });
});

// GET /api/citas/:id/saldo
appointmentRouter.get('/:id/saldo', (req, res: Response) => {
  const app = Repository.getAppointmentById(String(req.params.id));
  if (!app) {
    return res.status(404).json({ success: false, message: 'Cita no encontrada' });
  }

  return res.status(200).json({
    success: true,
    data: {
      citaId: app.id,
      precioQ: app.precioQ,
      totalPagadoQ: app.totalPagadoQ,
      saldoPendienteQ: app.saldoPendienteQ,
      estadoFinanciero: app.estadoFinanciero,
    },
  });
});
