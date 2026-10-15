import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';
import { UserModel, UserRole, toPublicUser, userRoles } from './user.model.js';

export const usersRouter = Router();
const adminOnly = [requireAuth, requireRoles('ADMIN')];
const passwordMinLength = 12;

function validRole(role: unknown): role is UserRole {
  return typeof role === 'string' && userRoles.includes(role as UserRole);
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

usersRouter.use(...adminOnly);

usersRouter.get('/', async (_request, response) => {
  const users = await UserModel.find().sort({ name: 1 });
  response.json({ users: users.map(toPublicUser) });
});

usersRouter.post('/', async (request, response) => {
  const { name, email, password, role, phone, specialty } = request.body ?? {};
  if (
    typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
    typeof email !== 'string' || !validEmail(email.trim()) ||
    typeof password !== 'string' || password.length < passwordMinLength || password.length > 200 ||
    !validRole(role)
  ) {
    response.status(400).json({ error: `Datos inválidos. La contraseña debe tener al menos ${passwordMinLength} caracteres y el rol debe ser válido.` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await UserModel.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      active: true,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      specialty: typeof specialty === 'string' ? specialty.trim() : undefined,
    });
    response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      response.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
      return;
    }
    throw error;
  }
});

usersRouter.put('/:id', async (request, response) => {
  const { name, email, role, active, phone, specialty } = request.body ?? {};
  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      response.status(400).json({ error: 'Nombre inválido.' });
      return;
    }
    updates.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || !validEmail(email.trim())) {
      response.status(400).json({ error: 'Correo inválido.' });
      return;
    }
    updates.email = email.trim().toLowerCase();
  }
  if (role !== undefined) {
    if (!validRole(role)) {
      response.status(400).json({ error: 'Rol inválido.' });
      return;
    }
    updates.role = role;
  }
  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      response.status(400).json({ error: 'El estado activo debe ser booleano.' });
      return;
    }
    updates.active = active;
  }
  if (phone !== undefined) updates.phone = typeof phone === 'string' ? phone.trim() : undefined;
  if (specialty !== undefined) updates.specialty = typeof specialty === 'string' ? specialty.trim() : undefined;

  try {
    const user = await UserModel.findByIdAndUpdate(request.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!user) {
      response.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    response.json({ user: toPublicUser(user) });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      response.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
      return;
    }
    throw error;
  }
});

usersRouter.patch('/:id/password', async (request, response) => {
  const password = request.body?.password;
  if (typeof password !== 'string' || password.length < passwordMinLength || password.length > 200) {
    response.status(400).json({ error: `La contraseña debe tener entre ${passwordMinLength} y 200 caracteres.` });
    return;
  }

  const user = await UserModel.findById(request.params.id);
  if (!user) {
    response.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();
  response.sendStatus(204);
});