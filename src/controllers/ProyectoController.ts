import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Proyecto, TipoProyecto, EstadoProyecto, PrioridadProyecto } from '../models/Proyecto';
import { PermisosManager, TipoRecurso, TipoPermiso } from '../models/Rol';

export class ProyectoController {
  /**
   * Listar todos los proyectos con filtros y paginación
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, tipo, estado, prioridad, search, asignado } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filtros: any = {};
      
      if (tipo && Object.values(TipoProyecto).includes(tipo as TipoProyecto)) {
        filtros.tipoProyecto = tipo;
      }
      
      if (estado && Object.values(EstadoProyecto).includes(estado as EstadoProyecto)) {
        filtros.estado = estado;
      }

      if (prioridad && Object.values(PrioridadProyecto).includes(prioridad as PrioridadProyecto)) {
        filtros.prioridad = prioridad;
      }

      if (search) {
        filtros.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { codigo: { $regex: search, $options: 'i' } },
          { descripcion: { $regex: search, $options: 'i' } },
          { 'ubicacion.ciudad': { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } }
        ];
      }

      // Filtrar por proyectos asignados al usuario actual si no es admin
      if (asignado === 'true' || req.usuario.tipoUsuario !== 'administrador') {
        filtros.$or = [
          { contratista: req.usuario._id },
          { interventor: req.usuario._id },
          { supervisor: req.usuario._id },
          { creadoPor: req.usuario._id }
        ];
      }

      // Obtener proyectos con paginación
      const proyectos = await Proyecto
        .find(filtros)
        .populate('contratista', 'nombre apellido email profesion')
        .populate('interventor', 'nombre apellido email profesion')
        .populate('supervisor', 'nombre apellido email profesion')
        .populate('creadoPor', 'nombre apellido email')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Proyecto.countDocuments(filtros);

      res.json({
        success: true,
        data: {
          proyectos,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: proyectos.length,
            totalRecords: total
          }
        }
      });
    } catch (error) {
      console.error('Error al listar proyectos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener un proyecto por ID
   */
  static async obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const proyecto = await Proyecto.findById(id)
        .populate('contratista', 'nombre apellido email telefono profesion')
        .populate('interventor', 'nombre apellido email telefono profesion')
        .populate('supervisor', 'nombre apellido email telefono profesion')
        .populate('creadoPor', 'nombre apellido email');

      if (!proyecto) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      // Verificar permisos de acceso al proyecto
      const tieneAcceso = await ProyectoController.verificarAccesoProyecto(req.usuario._id, proyecto);
      if (!tieneAcceso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este proyecto'
        });
        return;
      }

      res.json({
        success: true,
        data: proyecto
      });
    } catch (error) {
      console.error('Error al obtener proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo proyecto
   */
  static async crear(req: Request, res: Response): Promise<void> {
    try {
      // Verificar permisos
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.CREAR
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear proyectos'
        });
        return;
      }

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

      const proyectoData = {
        ...req.body,
        creadoPor: req.usuario._id,
        fechaCreacion: new Date()
      };

      const nuevoProyecto = new Proyecto(proyectoData);
      await nuevoProyecto.save();

      const proyectoCreado = await Proyecto.findById(nuevoProyecto._id)
        .populate('contratista', 'nombre apellido email')
        .populate('interventor', 'nombre apellido email')
        .populate('supervisor', 'nombre apellido email')
        .populate('creadoPor', 'nombre apellido email');

      res.status(201).json({
        success: true,
        message: 'Proyecto creado exitosamente',
        data: proyectoCreado
      });
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar proyecto
   */
  static async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      // Verificar permisos
      const contexto = {
        propietarioId: proyecto.creadoPor.toString(),
        estado: proyecto.estado
      };

      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.ACTUALIZAR,
        contexto
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar este proyecto'
        });
        return;
      }

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

      // Actualizar campos permitidos
      const camposPermitidos = [
        'nombre', 'descripcion', 'tipoProyecto', 'estado', 'prioridad',
        'fechaInicio', 'fechaFinPlaneada', 'ubicacion', 'contratista',
        'interventor', 'supervisor', 'contactoCliente', 'presupuesto',
        'porcentajeAvance', 'hitos', 'tags', 'observaciones'
      ];

      camposPermitidos.forEach(campo => {
        if (req.body[campo] !== undefined) {
          (proyecto as any)[campo] = req.body[campo];
        }
      });

      proyecto.fechaActualizacion = new Date();
      await proyecto.save();

      const proyectoActualizado = await Proyecto.findById(id)
        .populate('contratista', 'nombre apellido email')
        .populate('interventor', 'nombre apellido email')
        .populate('supervisor', 'nombre apellido email')
        .populate('creadoPor', 'nombre apellido email');

      res.json({
        success: true,
        message: 'Proyecto actualizado exitosamente',
        data: proyectoActualizado
      });
    } catch (error) {
      console.error('Error al actualizar proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar estado del proyecto
   */
  static async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { estado, observaciones } = req.body;

      if (!Object.values(EstadoProyecto).includes(estado)) {
        res.status(400).json({
          success: false,
          message: 'Estado de proyecto inválido'
        });
        return;
      }

      const proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      // Verificar permisos
      const contexto = {
        propietarioId: proyecto.creadoPor.toString(),
        estado: proyecto.estado
      };

      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.ACTUALIZAR,
        contexto
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para cambiar el estado de este proyecto'
        });
        return;
      }

      const estadoAnterior = proyecto.estado;
      proyecto.estado = estado;
      proyecto.fechaActualizacion = new Date();

      if (observaciones) {
        proyecto.observaciones = observaciones;
      }

      await proyecto.save();

      res.json({
        success: true,
        message: `Estado del proyecto cambiado de ${estadoAnterior} a ${estado}`,
        data: {
          id: proyecto._id,
          estadoAnterior,
          estadoNuevo: estado,
          fechaActualizacion: proyecto.fechaActualizacion
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar proyecto
   */
  static async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      // Verificar permisos
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.ELIMINAR
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar proyectos'
        });
        return;
      }

      // No permitir eliminación si el proyecto está en ejecución
      if (proyecto.estado === EstadoProyecto.EN_EJECUCION) {
        res.status(400).json({
          success: false,
          message: 'No se puede eliminar un proyecto en ejecución'
        });
        return;
      }

      await Proyecto.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Proyecto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de proyectos
   */
  static async estadisticas(req: Request, res: Response): Promise<void> {
    try {
      // Verificar permisos
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.LEER
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver estadísticas'
        });
        return;
      }

      const totalProyectos = await Proyecto.countDocuments();
      
      const proyectosPorEstado = await Proyecto.aggregate([
        {
          $group: {
            _id: '$estado',
            count: { $sum: 1 }
          }
        }
      ]);

      const proyectosPorTipo = await Proyecto.aggregate([
        {
          $group: {
            _id: '$tipoProyecto',
            count: { $sum: 1 }
          }
        }
      ]);

      const proyectosPorPrioridad = await Proyecto.aggregate([
        {
          $group: {
            _id: '$prioridad',
            count: { $sum: 1 }
          }
        }
      ]);

      const avancePromedio = await Proyecto.aggregate([
        {
          $group: {
            _id: null,
            promedioAvance: { $avg: '$porcentajeAvance' }
          }
        }
      ]);

      const presupuestoTotal = await Proyecto.aggregate([
        {
          $group: {
            _id: null,
            totalPresupuesto: { $sum: '$presupuesto.valorTotal' },
            totalEjecutado: { $sum: '$presupuesto.valorEjecutado' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          resumen: {
            total: totalProyectos,
            avancePromedio: avancePromedio[0]?.promedioAvance || 0
          },
          porEstado: proyectosPorEstado,
          porTipo: proyectosPorTipo,
          porPrioridad: proyectosPorPrioridad,
          presupuesto: presupuestoTotal[0] || { totalPresupuesto: 0, totalEjecutado: 0 }
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

  /**
   * Actualizar hito del proyecto
   */
  static async actualizarHito(req: Request, res: Response): Promise<void> {
    try {
      const { id, hitoId } = req.params;
      const { porcentajeAvance, completado, fechaReal, observaciones } = req.body;

      const proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
        return;
      }

      const hito = proyecto.hitos.find(h => h._id?.toString() === hitoId);
      if (!hito) {
        res.status(404).json({
          success: false,
          message: 'Hito no encontrado'
        });
        return;
      }

      // Verificar permisos
      const contexto = {
        propietarioId: proyecto.creadoPor.toString(),
        estado: proyecto.estado
      };

      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.PROYECTOS,
        TipoPermiso.ACTUALIZAR,
        contexto
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar hitos de este proyecto'
        });
        return;
      }

      // Actualizar hito
      if (porcentajeAvance !== undefined) hito.porcentajeAvance = porcentajeAvance;
      if (completado !== undefined) hito.completado = completado;
      if (fechaReal !== undefined) hito.fechaReal = new Date(fechaReal);
      if (observaciones !== undefined) hito.observaciones = observaciones;

      // Recalcular porcentaje de avance del proyecto
      const totalHitos = proyecto.hitos.length;
      const sumaAvances = proyecto.hitos.reduce((sum, h) => sum + h.porcentajeAvance, 0);
      proyecto.porcentajeAvance = Math.round(sumaAvances / totalHitos);

      proyecto.fechaActualizacion = new Date();
      await proyecto.save();

      res.json({
        success: true,
        message: 'Hito actualizado exitosamente',
        data: {
          hito,
          porcentajeProyecto: proyecto.porcentajeAvance
        }
      });
    } catch (error) {
      console.error('Error al actualizar hito:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar si un usuario tiene acceso a un proyecto
   */
  private static async verificarAccesoProyecto(usuarioId: string, proyecto: any): Promise<boolean> {
    // Admin siempre tiene acceso
    const tienePermisoGeneral = await PermisosManager.usuarioTienePermiso(
      usuarioId,
      TipoRecurso.PROYECTOS,
      TipoPermiso.LEER
    );

    if (tienePermisoGeneral) {
      return true;
    }

    // Verificar si está asignado al proyecto
    const usuarioIdStr = usuarioId.toString();
    return proyecto.contratista?.toString() === usuarioIdStr ||
           proyecto.interventor?.toString() === usuarioIdStr ||
           proyecto.supervisor?.toString() === usuarioIdStr ||
           proyecto.creadoPor?.toString() === usuarioIdStr;
  }
}