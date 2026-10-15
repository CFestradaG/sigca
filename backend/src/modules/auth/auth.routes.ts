import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { getJwtSecret, requireAuth } from './auth.middleware.js';
import { UserModel, toPublicUser } from '../users/user.model.js';

export const authRouter = Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta nuevamente más tarde.' },
});

authRouter.post('/login', loginRateLimit, async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';

  if (!email || !password || email.length > 254 || password.length > 200) {
    response.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    return;
  }

  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user?.active || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
    return;
  }

  const token = jwt.sign({ role: user.role }, getJwtSecret(), {
    subject: user.id,
    expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600),
  });

  response.json({ token, user: toPublicUser(user) });
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.authUser });
});