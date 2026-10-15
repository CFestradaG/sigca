import { Router, Response } from 'express';
import { Repository } from '../data/repository';
import { authenticateToken } from '../middleware/auth';

export const reportRouter = Router();

reportRouter.use(authenticateToken);

// GET /api/reportes/dashboard
reportRouter.get('/dashboard', (_req, res: Response) => {
  const metrics = Repository.getDashboardMetrics();
  return res.status(200).json({ success: true, data: metrics });
});
