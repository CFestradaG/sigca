import { Router, Response } from 'express';
import { Repository } from '../data/repository';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const cashRouter = Router();

cashRouter.use(authenticateToken);

// POST /api/cajas/abrir (RF-11, RN-22)
cashRouter.post('/abrir', requireRole(['ADMIN', 'RECEPCION']), async (req: AuthRequest, res: Response) => {
  try {
    const { montoInicialQ } = req.body;
    const initial = Number(montoInicialQ || 0);

    if (initial < 0) {
      return res.status(400).json({ success: false, message: 'El monto inicial no puede ser negativo' });
    }

    const nuevaCaja = await Repository.openCashRegister(req.user!.id, req.user!.nombre, initial);

    return res.status(201).json({
      success: true,
      message: 'Caja diaria abierta exitosamente',
      data: nuevaCaja,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/cajas/actual (Gets active open register for the current user)
cashRouter.get('/actual', (req: AuthRequest, res: Response) => {
  let caja = Repository.getUserOpenCashRegister(req.user!.id);

  // If user is ADMIN and has no personal open box, check if there's any active open box
  if (!caja && req.user!.rol === 'ADMIN') {
    const anyOpen = Repository.getCashRegisters({ estado: 'ABIERTA' });
    if (anyOpen.length > 0) {
      caja = anyOpen[0];
    }
  }

  if (!caja) {
    return res.status(200).json({
      success: true,
      hasOpenRegister: false,
      data: null,
      message: 'No tiene ninguna caja abierta en este momento',
    });
  }

  // Recalculate up-to-date totals
  const recalculated = Repository.recalculateCashRegister(caja.id);

  return res.status(200).json({
    success: true,
    hasOpenRegister: true,
    data: recalculated || caja,
  });
});

// GET /api/cajas
cashRouter.get('/', (req: AuthRequest, res: Response) => {
  const { estado, usuarioId } = req.query;

  // Recepcionista only sees their own registers unless Admin (RF-11)
  let userFilter = usuarioId as string;
  if (req.user?.rol === 'RECEPCION') {
    userFilter = req.user.id;
  }

  const list = Repository.getCashRegisters({
    usuarioId: userFilter,
    estado: estado as string,
  });

  return res.status(200).json({ success: true, count: list.length, data: list });
});

// GET /api/cajas/:id
cashRouter.get('/:id', (req, res: Response) => {
  const caja = Repository.getCashRegisterById(String(req.params.id));
  if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' });

  // Recalculate totals
  const refreshed = Repository.recalculateCashRegister(caja.id);
  return res.status(200).json({ success: true, data: refreshed || caja });
});

// GET /api/cajas/:id/movimientos
cashRouter.get('/:id/movimientos', (req, res: Response) => {
  const caja = Repository.getCashRegisterById(String(req.params.id));
  if (!caja) return res.status(404).json({ success: false, message: 'Caja no encontrada' });
  return res.status(200).json({ success: true, count: caja.movimientos.length, data: caja.movimientos });
});

// POST /api/cajas/:id/cerrar (RF-11: Arqueo, efectivo contado, diferencia y cierre)
cashRouter.post('/:id/cerrar', requireRole(['ADMIN', 'RECEPCION']), async (req: AuthRequest, res: Response) => {
  try {
    const { efectivoContadoQ, observaciones } = req.body;

    if (efectivoContadoQ === undefined || efectivoContadoQ === null || isNaN(Number(efectivoContadoQ))) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Debe indicar el monto en efectivo contado al cierre para el arqueo',
      });
    }

    const closed = await Repository.closeCashRegister(
      String(req.params.id),
      req.user!.id,
      Number(efectivoContadoQ),
      observaciones
    );

    return res.status(200).json({
      success: true,
      message: 'Caja diaria cerrada exitosamente. Arqueo completado.',
      data: closed,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});
