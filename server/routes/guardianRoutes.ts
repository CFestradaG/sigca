import { Router, Response } from 'express';
import { Repository } from '../data/repository';
import { authenticateToken } from '../middleware/auth';

export const guardianRouter = Router();

guardianRouter.use(authenticateToken);

// GET /api/responsables
guardianRouter.get('/', (_req, res: Response) => {
  const list = Repository.getGuardians();
  return res.status(200).json({ success: true, count: list.length, data: list });
});

// GET /api/responsables/:id
guardianRouter.get('/:id', (req, res: Response) => {
  const guardian = Repository.getGuardianById(req.params.id);
  if (!guardian) {
    return res.status(404).json({ success: false, message: 'Responsable no encontrado' });
  }
  return res.status(200).json({ success: true, data: guardian });
});

// POST /api/responsables
guardianRouter.post('/', async (req, res: Response) => {
  try {
    const { nombres, apellidos, parentesco, telefono, email, direccion, fotoUrl, patientIds } = req.body;

    if (!nombres || !apellidos || !parentesco || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Nombres, apellidos, parentesco y teléfono son campos obligatorios',
      });
    }

    const created = await Repository.createGuardian({
      nombres,
      apellidos,
      parentesco,
      telefono,
      email: email || '',
      direccion: direccion || '',
      fotoUrl: fotoUrl || '',
      patientIds: patientIds || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Responsable registrado y asociado exitosamente',
      data: created,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/responsables/:id
guardianRouter.put('/:id', async (req, res: Response) => {
  try {
    const updated = await Repository.updateGuardian(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Responsable no encontrado' });
    }
    return res.status(200).json({
      success: true,
      message: 'Responsable actualizado exitosamente',
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
