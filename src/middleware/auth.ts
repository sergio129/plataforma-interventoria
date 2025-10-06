import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario, TipoUsuario } from '../models/Usuario';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: any;
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  tipoUsuario: TipoUsuario;
  iat: number;
  exp: number;
}

export class AuthMiddleware {
  /**
   * Middleware para verificar el token JWT
   */
  static async verificarToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
        return;
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
        return;
      }

      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      // Buscar el usuario en la base de datos
      const usuario = await Usuario.findById(decoded.userId).select('-password');
      if (!usuario) {
        res.status(401).json({
          success: false,
          message: 'Token inválido - Usuario no encontrado'
        });
        return;
      }

      // Verificar que el usuario esté activo
      if (usuario.estado !== 'activo') {
        res.status(401).json({
          success: false,
          message: 'Usuario inactivo'
        });
        return;
      }

      req.usuario = usuario;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expirado'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Middleware para verificar roles específicos
   */
  static verificarRoles(...rolesPermitidos: TipoUsuario[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'No autorizado'
        });
        return;
      }

      if (!rolesPermitidos.includes(req.usuario.tipoUsuario)) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware para verificar que sea administrador
   */
  static esAdministrador(req: Request, res: Response, next: NextFunction): void {
    AuthMiddleware.verificarRoles(TipoUsuario.ADMINISTRADOR)(req, res, next);
  }

  /**
   * Middleware para verificar que sea interventor o administrador
   */
  static esInterventorOAdmin(req: Request, res: Response, next: NextFunction): void {
    AuthMiddleware.verificarRoles(TipoUsuario.ADMINISTRADOR, TipoUsuario.INTERVENTOR)(req, res, next);
  }
}