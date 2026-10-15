import { Router, Response } from 'express';
import { Repository } from '../data/repository';
import { authenticateToken } from '../middleware/auth';

export const patientRouter = Router();

patientRouter.use(authenticateToken);

// GET /api/pacientes
patientRouter.get('/', (req, res: Response) => {
  const { search, estado } = req.query;
  const patients = Repository.getPatients({
    search: search as string,
    estado: estado as string,
  });
  return res.status(200).json({ success: true, count: patients.length, data: patients });
});

// GET /api/pacientes/:id
patientRouter.get('/:id', (req, res: Response) => {
  const patient = Repository.getPatientById(req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
  }

  // Also include appointments and payments history (RF-03)
  const citas = Repository.getAppointments({ pacienteId: req.params.id });
  const pagos = Repository.getPayments({ pacienteId: req.params.id });

  return res.status(200).json({
    success: true,
    data: {
      ...patient,
      citas,
      pagos,
    },
  });
});

// POST /api/pacientes
patientRouter.post('/', async (req, res: Response) => {
  try {
    const { nombres, apellidos, fechaNacimiento, sexo, telefono, direccion, fechaInicio, observaciones, fotoUrl, responsableIds } = req.body;

    if (!nombres || !apellidos || !fechaNacimiento) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Nombres, apellidos y fecha de nacimiento son obligatorios',
      });
    }

    const created = await Repository.createPatient({
      nombres,
      apellidos,
      fechaNacimiento,
      sexo: sexo || 'M',
      telefono: telefono || '',
      direccion: direccion || '',
      fechaInicio: fechaInicio || new Date().toISOString().split('T')[0],
      observaciones: observaciones || '',
      fotoUrl: fotoUrl || '',
      estado: 'ACTIVO',
      responsableIds: responsableIds || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Paciente registrado exitosamente',
      data: created,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/pacientes/:id
patientRouter.put('/:id', async (req, res: Response) => {
  try {
    const updated = await Repository.updatePatient(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }
    return res.status(200).json({
      success: true,
      message: 'Paciente actualizado exitosamente',
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/pacientes/:id/estado (RF-03: Desactivación mediante eliminación lógica)
patientRouter.patch('/:id/estado', async (req, res: Response) => {
  try {
    const { estado } = req.body;
    if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado debe ser ACTIVO o INACTIVO' });
    }

    const updated = await Repository.updatePatient(req.params.id, { estado });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }

    return res.status(200).json({
      success: true,
      message: `Paciente marcado como ${estado} exitosamente (eliminación lógica)`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pacientes/:id/citas
patientRouter.get('/:id/citas', (req, res: Response) => {
  const citas = Repository.getAppointments({ pacienteId: req.params.id });
  return res.status(200).json({ success: true, count: citas.length, data: citas });
});

// GET /api/pacientes/:id/pagos
patientRouter.get('/:id/pagos', (req, res: Response) => {
  const pagos = Repository.getPayments({ pacienteId: req.params.id });
  return res.status(200).json({ success: true, count: pagos.length, data: pagos });
});
