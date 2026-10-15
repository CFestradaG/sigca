import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Repository } from '../data/repository';
import { authenticateToken, generateToken, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'RN-30: Debe proporcionar correo electrónico y contraseña',
      });
    }

    const user = Repository.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas: Correo o contraseña incorrectos',
      });
    }

    // RN-08: Inactive users cannot log in
    if (!user.activo) {
      return res.status(403).json({
        success: false,
        message: 'RN-08: Su usuario se encuentra inactivo. Contacte a la administración.',
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas: Correo o contraseña incorrectos',
      });
    }

    const token = generateToken(user);
    const { passwordHash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error en autenticación',
    });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  const user = Repository.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  return res.status(200).json({
    success: true,
    user,
  });
});
