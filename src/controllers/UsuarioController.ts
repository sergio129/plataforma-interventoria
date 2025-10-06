import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { Usuario, TipoUsuario, EstadoUsuario } from '../models/Usuario';

export class UsuarioController {
  /**
   * Listar todos los usuarios (solo administradores)
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, tipo, estado, search } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filtros: any = {};
      
      if (tipo && Object.values(TipoUsuario).includes(tipo as TipoUsuario)) {
        filtros.tipoUsuario = tipo;
      }
      
      if (estado && Object.values(EstadoUsuario).includes(estado as EstadoUsuario)) {
        filtros.estado = estado;
      }

      if (search) {
        filtros.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { apellido: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { cedula: { $regex: search, $options: 'i' } }
        ];
      }

      // Obtener usuarios con paginación
      const usuarios = await Usuario
        .find(filtros)
        .select('-password')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Usuario.countDocuments(filtros);

      res.json({
        success: true,
        data: {
          usuarios,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: usuarios.length,
            totalRecords: total
          }
        }
      });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener un usuario por ID
   */
  static async obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usuario = await Usuario.findById(id).select('-password');
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo usuario (solo administradores)
   */
  static async crear(req: Request, res: Response): Promise<void> {
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

      const {
        nombre,
        apellido,
        email,
        password,
        telefono,
        cedula,
        tipoUsuario,
        profesion,
        experiencia,
        certificaciones
      } = req.body;

      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ 
        $or: [
          { email: email.toLowerCase() },
          { cedula }
        ]
      });

      if (usuarioExistente) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un usuario con ese email o cédula'
        });
        return;
      }

      // Hashear contraseña
      const saltRounds = 10;
      const passwordHasheada = await bcrypt.hash(password, saltRounds);

      const nuevoUsuario = new Usuario({
        nombre,
        apellido,
        email: email.toLowerCase(),
        password: passwordHasheada,
        telefono,
        cedula,
        tipoUsuario,
        estado: EstadoUsuario.ACTIVO,
        profesion,
        experiencia,
        certificaciones: certificaciones || []
      });

      await nuevoUsuario.save();

      // Retornar usuario sin contraseña
      const usuarioRespuesta = await Usuario.findById(nuevoUsuario._id).select('-password');

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: usuarioRespuesta
      });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar usuario (solo administradores)
   */
  static async actualizar(req: Request, res: Response): Promise<void> {
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

      const { id } = req.params;
      const usuario = await Usuario.findById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar si el nuevo email o cédula ya existe en otro usuario
      if (req.body.email || req.body.cedula) {
        const conflicto = await Usuario.findOne({
          _id: { $ne: id },
          $or: [
            req.body.email ? { email: req.body.email.toLowerCase() } : {},
            req.body.cedula ? { cedula: req.body.cedula } : {}
          ].filter(obj => Object.keys(obj).length > 0)
        });

        if (conflicto) {
          res.status(400).json({
            success: false,
            message: 'Ya existe otro usuario con ese email o cédula'
          });
          return;
        }
      }

      // Actualizar campos
      if (req.body.nombre) usuario.nombre = req.body.nombre;
      if (req.body.apellido) usuario.apellido = req.body.apellido;
      if (req.body.email) usuario.email = req.body.email.toLowerCase();
      if (req.body.telefono) usuario.telefono = req.body.telefono;
      if (req.body.cedula) usuario.cedula = req.body.cedula;
      if (req.body.tipoUsuario) usuario.tipoUsuario = req.body.tipoUsuario;
      if (req.body.estado) usuario.estado = req.body.estado;
      if (req.body.profesion) usuario.profesion = req.body.profesion;
      if (req.body.experiencia) usuario.experiencia = req.body.experiencia;
      if (req.body.certificaciones) usuario.certificaciones = req.body.certificaciones;

      await usuario.save();

      const usuarioActualizado = await Usuario.findById(id).select('-password');

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: usuarioActualizado
      });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado de usuario (activar/desactivar)
   */
  static async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!Object.values(EstadoUsuario).includes(estado)) {
        res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
        return;
      }

      const usuario = await Usuario.findById(id);
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      usuario.estado = estado;
      await usuario.save();

      res.json({
        success: true,
        message: `Usuario ${estado} exitosamente`,
        data: {
          id: usuario._id,
          estado: usuario.estado
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar usuario (solo administradores)
   */
  static async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // No permitir que un admin se elimine a sí mismo
      if (req.usuario._id.toString() === id) {
        res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
        return;
      }

      const usuario = await Usuario.findById(id);
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      await Usuario.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de usuarios (solo administradores)
   */
  static async estadisticas(req: Request, res: Response): Promise<void> {
    try {
      const totalUsuarios = await Usuario.countDocuments();
      const usuariosActivos = await Usuario.countDocuments({ estado: EstadoUsuario.ACTIVO });
      const usuariosInactivos = await Usuario.countDocuments({ estado: EstadoUsuario.INACTIVO });
      const usuariosSuspendidos = await Usuario.countDocuments({ estado: EstadoUsuario.SUSPENDIDO });

      const usuariosPorTipo = await Usuario.aggregate([
        {
          $group: {
            _id: '$tipoUsuario',
            count: { $sum: 1 }
          }
        }
      ]);

      const usuariosRecientes = await Usuario.aggregate([
        {
          $match: {
            fechaCreacion: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$fechaCreacion' },
              month: { $month: '$fechaCreacion' },
              day: { $dayOfMonth: '$fechaCreacion' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          resumen: {
            total: totalUsuarios,
            activos: usuariosActivos,
            inactivos: usuariosInactivos,
            suspendidos: usuariosSuspendidos
          },
          porTipo: usuariosPorTipo,
          registrosRecientes: usuariosRecientes
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}