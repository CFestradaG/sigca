import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';
import {
  ClinicalServiceModel,
  ServiceCategory,
  ServiceStatus,
  serviceCategories,
  toPublicService,
} from './service.model.js';

export const servicesRouter = Router();
const adminOnly = [requireAuth, requireRoles('ADMIN')];
const serviceStatuses: ServiceStatus[] = ['ACTIVO', 'INACTIVO'];

function parsePriceInCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const asText = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(asText)) return null;
  const [whole, fraction = ''] = asText.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

function validateServiceInput(input: Record<string, unknown>, partial = false) {
  const updates: Record<string, unknown> = {};
  const fields: Array<[string, (value: unknown) => unknown | null]> = [
    ['nombre', (value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 160 ? value.trim() : null],
    ['descripcion', (value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 2000 ? value.trim() : null],
    ['duracionMinutos', (value) => Number.isInteger(value) && Number(value) >= 15 && Number(value) <= 480 && Number(value) % 5 === 0 ? Number(value) : null],
    ['precioQ', (value) => parsePriceInCents(value)],
    ['imagenUrl', (value) => {
      if (typeof value !== 'string' || value.length > 2048) return null;
      if (!value.trim()) return '';
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
      } catch {
        return null;
      }
    }],
    ['categoria', (value) => typeof value === 'string' && serviceCategories.includes(value as ServiceCategory) ? value : null],
    ['estado', (value) => typeof value === 'string' && serviceStatuses.includes(value as ServiceStatus) ? value : null],
  ];

  for (const [field, validate] of fields) {
    if (!(field in input)) {
      if (!partial && field !== 'imagenUrl' && field !== 'estado') return { error: `Falta el campo ${field}.` };
      continue;
    }

    const parsed = validate(input[field]);
    if (parsed === null) return { error: `El campo ${field} no es válido.` };
    if (field === 'precioQ') updates.precioCentavos = parsed;
    else updates[field] = parsed;
  }

  return { updates };
}

servicesRouter.get('/', async (request, response) => {
  const filter: Record<string, unknown> = { estado: 'ACTIVO' };
  if (request.query.categoria !== undefined) {
    if (typeof request.query.categoria !== 'string' || !serviceCategories.includes(request.query.categoria as ServiceCategory)) {
      response.status(400).json({ error: 'Categoría inválida.' });
      return;
    }
    filter.categoria = request.query.categoria;
  }

  const services = await ClinicalServiceModel.find(filter).sort({ nombre: 1 });
  response.json({ services: services.map(toPublicService) });
});

servicesRouter.get('/admin', ...adminOnly, async (_request, response) => {
  const services = await ClinicalServiceModel.find().sort({ nombre: 1 });
  response.json({ services: services.map(toPublicService) });
});

servicesRouter.post('/', ...adminOnly, async (request, response) => {
  const input = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : {};
  const { error, updates } = validateServiceInput(input);
  if (error || !updates) {
    response.status(400).json({ error: error ?? 'Datos del servicio inválidos.' });
    return;
  }

  const service = await ClinicalServiceModel.create(updates);
  response.status(201).json({ service: toPublicService(service) });
});

servicesRouter.put('/:id', ...adminOnly, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Identificador de servicio inválido.' });
    return;
  }

  const input = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : {};
  const { error, updates } = validateServiceInput(input, true);
  if (error || !updates || Object.keys(updates).length === 0) {
    response.status(400).json({ error: error ?? 'Debe proporcionar al menos un campo válido.' });
    return;
  }

  const service = await ClinicalServiceModel.findByIdAndUpdate(request.params.id, updates, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!service) {
    response.status(404).json({ error: 'Servicio no encontrado.' });
    return;
  }
  response.json({ service: toPublicService(service) });
});

servicesRouter.patch('/:id/estado', ...adminOnly, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Identificador de servicio inválido.' });
    return;
  }
  if (!serviceStatuses.includes(request.body?.estado)) {
    response.status(400).json({ error: 'Estado inválido.' });
    return;
  }

  const service = await ClinicalServiceModel.findByIdAndUpdate(
    request.params.id,
    { estado: request.body.estado },
    { returnDocument: 'after', runValidators: true },
  );
  if (!service) {
    response.status(404).json({ error: 'Servicio no encontrado.' });
    return;
  }
  response.json({ service: toPublicService(service) });
});