import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Repository } from '../data/repository';
import { authenticateToken, requireRole } from '../middleware/auth';

export const userRouter = Router();

// Require ADMIN role for user management (RF-13, RN-10)
userRouter.use(authenticateToken, requireRole(['ADMIN']));

// GET /api/usuarios
userRouter.get('/', (_req, res: Response) => {
  const users = Repository.getUsers();
  return res.status(200).json({ success: true, count: users.length, data: users });
});

// GET /api/usuarios/:id
userRouter.get('/:id', (req, res: Response) => {
  const user = Repository.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  return res.status(200).json({ success: true, data: user });
});

// POST /api/usuarios
userRouter.post('/', async (req, res: Response) => {
  try {
    const { nombre, email, password, rol, especialidad, telefono, avatarUrl } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Datos incompletos. Nombre, correo, contraseña y rol son obligatorios.',
      });
    }

    const existing = Repository.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario registrado con este correo electrónico',
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = await Repository.createUser({
      nombre,
      email,
      passwordHash,
      rol,
      especialidad,
      telefono,
      avatarUrl,
      activo: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/usuarios/:id
userRouter.put('/:id', async (req, res: Response) => {
  try {
    const { nombre, email, rol, especialidad, telefono, avatarUrl, activo } = req.body;
    const updated = await Repository.updateUser(req.params.id, {
      nombre,
      email,
      rol,
      especialidad,
      telefono,
      avatarUrl,
      activo,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/usuarios/:id/password (RF-13)
userRouter.patch('/:id/password', async (req, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres',
      });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    const updated = await Repository.updateUser(req.params.id, { passwordHash });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      success: true,
      message: 'Contraseña restablecida exitosamente',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
