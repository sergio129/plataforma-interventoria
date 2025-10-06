import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { Usuario, TipoUsuario } from '../models/Usuario';

export class AuthController {
  /**
   * Login de usuario
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;

      // Buscar usuario por email
      const usuario = await Usuario.findOne({ email: email.toLowerCase() });
      if (!usuario) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      // Verificar estado del usuario
      if (usuario.estado !== 'activo') {
        res.status(401).json({
          success: false,
          message: 'Usuario inactivo. Contacte al administrador.'
        });
        return;
      }

      // Verificar contraseña
      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      // Crear token JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
        return;
      }

      const token = jwt.sign(
        {
          userId: usuario._id,
          email: usuario.email,
          tipoUsuario: usuario.tipoUsuario
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Actualizar último acceso
      usuario.ultimoAcceso = new Date();
      await usuario.save();

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          usuario: {
            id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            tipoUsuario: usuario.tipoUsuario,
            profesion: usuario.profesion,
            ultimoAcceso: usuario.ultimoAcceso
          }
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener perfil del usuario actual
   */
  static async perfil(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.usuario;

      res.json({
        success: true,
        data: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          telefono: usuario.telefono,
          cedula: usuario.cedula,
          tipoUsuario: usuario.tipoUsuario,
          profesion: usuario.profesion,
          experiencia: usuario.experiencia,
          certificaciones: usuario.certificaciones,
          fechaCreacion: usuario.fechaCreacion,
          ultimoAcceso: usuario.ultimoAcceso
        }
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar contraseña del usuario actual
   */
  static async cambiarPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
        return;
      }

      const { passwordActual, passwordNueva } = req.body;
      const usuario = await Usuario.findById(req.usuario._id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar contraseña actual
      const passwordValida = await bcrypt.compare(passwordActual, usuario.password);
      if (!passwordValida) {
        res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
        return;
      }

      // Hashear nueva contraseña
      const saltRounds = 10;
      const passwordHasheada = await bcrypt.hash(passwordNueva, saltRounds);

      // Actualizar contraseña
      usuario.password = passwordHasheada;
      await usuario.save();

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar perfil del usuario actual
   */
  static async actualizarPerfil(req: Request, res: Response): Promise<void> {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
        return;
      }

      const usuario = await Usuario.findById(req.usuario._id);
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Campos que se pueden actualizar
      if (req.body.nombre) usuario.nombre = req.body.nombre;
      if (req.body.apellido) usuario.apellido = req.body.apellido;
      if (req.body.telefono) usuario.telefono = req.body.telefono;
      if (req.body.profesion) usuario.profesion = req.body.profesion;
      if (req.body.experiencia) usuario.experiencia = req.body.experiencia;
      if (req.body.certificaciones) usuario.certificaciones = req.body.certificaciones;

      await usuario.save();

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          telefono: usuario.telefono,
          profesion: usuario.profesion,
          experiencia: usuario.experiencia,
          certificaciones: usuario.certificaciones
        }
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}