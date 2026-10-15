import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, UserRole, toPublicUser } from '../users/user.model.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: ReturnType<typeof toPublicUser>;
    }
  }
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ error: 'Se requiere un token Bearer válido.' });
    return;
  }

  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    response.status(401).json({ error: 'Token inválido o vencido.' });
    return;
  }

  if (typeof payload === 'string' || !payload.sub) {
    response.status(401).json({ error: 'Token inválido o vencido.' });
    return;
  }

  const user = await UserModel.findById(payload.sub);
  if (!user?.active) {
    response.status(401).json({ error: 'Token inválido o cuenta inactiva.' });
    return;
  }

  request.authUser = toPublicUser(user);
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser) {
      response.status(401).json({ error: 'Autenticación requerida.' });
      return;
    }

    if (!roles.includes(request.authUser.role)) {
      response.status(403).json({ error: 'No tienes permiso para esta operación.' });
      return;
    }

    next();
  };
}