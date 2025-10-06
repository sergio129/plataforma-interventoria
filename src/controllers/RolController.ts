import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Rol, PermisosManager, TipoRecurso, TipoPermiso } from '../models/Rol';

export class RolController {
  /**
   * Listar todos los roles
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const { activo } = req.query;
      
      const filtros: any = {};
      if (activo !== undefined) {
        filtros.activo = activo === 'true';
      }

      const roles = await Rol.find(filtros).sort({ nombre: 1 });

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error al listar roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener un rol por ID
   */
  static async obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rol = await Rol.findById(id);
      if (!rol) {
        res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: rol
      });
    } catch (error) {
      console.error('Error al obtener rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo rol
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

      const { nombre, descripcion, permisos } = req.body;

      // Verificar si el rol ya existe
      const rolExistente = await Rol.findOne({ nombre });
      if (rolExistente) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un rol con ese nombre'
        });
        return;
      }

      const nuevoRol = new Rol({
        nombre,
        descripcion,
        permisos
      });

      await nuevoRol.save();

      res.status(201).json({
        success: true,
        message: 'Rol creado exitosamente',
        data: nuevoRol
      });
    } catch (error) {
      console.error('Error al crear rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar rol
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
      const { nombre, descripcion, permisos, activo } = req.body;

      const rol = await Rol.findById(id);
      if (!rol) {
        res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      // Verificar si el nuevo nombre ya existe en otro rol
      if (nombre && nombre !== rol.nombre) {
        const nombreExiste = await Rol.findOne({ nombre, _id: { $ne: id } });
        if (nombreExiste) {
          res.status(400).json({
            success: false,
            message: 'Ya existe otro rol con ese nombre'
          });
          return;
        }
      }

      // Actualizar campos
      if (nombre) rol.nombre = nombre;
      if (descripcion) rol.descripcion = descripcion;
      if (permisos) rol.permisos = permisos;
      if (activo !== undefined) rol.activo = activo;

      await rol.save();

      res.json({
        success: true,
        message: 'Rol actualizado exitosamente',
        data: rol
      });
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar rol
   */
  static async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const rol = await Rol.findById(id);
      if (!rol) {
        res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
        return;
      }

      // Verificar si hay usuarios asignados a este rol
      const { Usuario } = await import('../models/Usuario');
      const usuariosConRol = await Usuario.countDocuments({ roles: id });
      
      if (usuariosConRol > 0) {
        res.status(400).json({
          success: false,
          message: `No se puede eliminar el rol porque hay ${usuariosConRol} usuario(s) asignado(s)`
        });
        return;
      }

      await Rol.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Rol eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener permisos de un usuario
   */
  static async permisosUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario requerido'
        });
        return;
      }
      
      // Verificar que el usuario existe
      const { Usuario } = await import('../models/Usuario');
      const usuario = await Usuario.findById(userId);
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const permisos = await PermisosManager.getPermisosUsuario(userId);

      res.json({
        success: true,
        data: {
          usuario: {
            id: usuario._id,
            nombre: `${usuario.nombre} ${usuario.apellido}`,
            email: usuario.email,
            tipoUsuario: usuario.tipoUsuario
          },
          permisos
        }
      });
    } catch (error) {
      console.error('Error al obtener permisos de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar roles a un usuario
   */
  static async asignarRoles(req: Request, res: Response): Promise<void> {
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

      const { userId } = req.params;
      const { roles } = req.body;

      // Verificar que el usuario existe
      const { Usuario } = await import('../models/Usuario');
      const usuario = await Usuario.findById(userId);
      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que todos los roles existen
      const rolesExistentes = await Rol.find({ _id: { $in: roles }, activo: true });
      if (rolesExistentes.length !== roles.length) {
        res.status(400).json({
          success: false,
          message: 'Uno o más roles no existen o están inactivos'
        });
        return;
      }

      // Asignar roles
      usuario.roles = roles;
      await usuario.save();

      const usuarioConRoles = await Usuario.findById(userId)
        .populate('roles', 'nombre descripcion permisos')
        .select('-password');

      res.json({
        success: true,
        message: 'Roles asignados exitosamente',
        data: usuarioConRoles
      });
    } catch (error) {
      console.error('Error al asignar roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener recursos y permisos disponibles
   */
  static async recursosDisponibles(req: Request, res: Response): Promise<void> {
    try {
      const recursos = Object.values(TipoRecurso).map(recurso => ({
        id: recurso,
        nombre: recurso.charAt(0).toUpperCase() + recurso.slice(1),
        permisos: Object.values(TipoPermiso)
      }));

      res.json({
        success: true,
        data: {
          recursos,
          permisos: Object.values(TipoPermiso)
        }
      });
    } catch (error) {
      console.error('Error al obtener recursos disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  static async verificarPermiso(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { recurso, accion, contexto } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario requerido'
        });
        return;
      }

      if (!Object.values(TipoRecurso).includes(recurso)) {
        res.status(400).json({
          success: false,
          message: 'Recurso inválido'
        });
        return;
      }

      if (!Object.values(TipoPermiso).includes(accion)) {
        res.status(400).json({
          success: false,
          message: 'Acción inválida'
        });
        return;
      }

      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        userId,
        recurso,
        accion,
        contexto
      );

      res.json({
        success: true,
        data: {
          tienePermiso,
          recurso,
          accion,
          contexto
        }
      });
    } catch (error) {
      console.error('Error al verificar permiso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}