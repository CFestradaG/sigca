import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'RECEPCION' | 'PROFESIONAL';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: { id: string; nombre: string; email: string; rol: string }): string {
  return jwt.sign(
    {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Token no proporcionado',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado. Inicie sesión nuevamente.',
    });
  }
}

export function requireRole(allowedRoles: Array<'ADMIN' | 'RECEPCION' | 'PROFESIONAL'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado: No se encontró sesión',
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado: El rol ${req.user.rol} no tiene permisos para esta acción`,
      });
    }

    next();
  };
}
