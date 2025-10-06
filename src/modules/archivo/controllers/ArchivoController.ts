import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Radicado, TipoOficio, EstadoOficio, PrioridadOficio } from '../models/Archivo';
import { PermisosManager, TipoRecurso, TipoPermiso } from '../../../models/Rol';
import mongoose from 'mongoose';

export class ArchivoController {
  /**
   * Listar todos los radicados con filtros y paginación
   */
  static async listarRadicados(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        tipo, 
        estado, 
        prioridad, 
        search, 
        categoria,
        fechaInicio,
        fechaFin,
        proyectoId,
        confidencial
      } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filtros: any = {};
      
      if (tipo && Object.values(TipoOficio).includes(tipo as TipoOficio)) {
        filtros.tipoOficio = tipo;
      }
      
      if (estado && Object.values(EstadoOficio).includes(estado as EstadoOficio)) {
        filtros.estado = estado;
      }

      if (prioridad && Object.values(PrioridadOficio).includes(prioridad as PrioridadOficio)) {
        filtros.prioridad = prioridad;
      }

      if (categoria) {
        filtros.categoria = { $regex: categoria, $options: 'i' };
      }

      if (proyectoId) {
        filtros.proyectoId = proyectoId;
      }

      // Filtro de confidencialidad
      if (confidencial === 'true') {
        filtros.esConfidencial = true;
        // Solo mostrar documentos confidenciales si el usuario está autorizado
        filtros.$or = [
          { usuariosAutorizados: req.usuario._id },
          { creadoPor: req.usuario._id }
        ];
      } else if (confidencial === 'false') {
        filtros.esConfidencial = false;
      }

      // Filtro por fechas
      if (fechaInicio || fechaFin) {
        filtros.fechaRadicado = {};
        if (fechaInicio) filtros.fechaRadicado.$gte = new Date(fechaInicio as string);
        if (fechaFin) filtros.fechaRadicado.$lte = new Date(fechaFin as string);
      }

      // Búsqueda de texto
      if (search) {
        filtros.$or = [
          { consecutivo: { $regex: search, $options: 'i' } },
          { asunto: { $regex: search, $options: 'i' } },
          { resumen: { $regex: search, $options: 'i' } },
          { destinatario: { $regex: search, $options: 'i' } },
          { remitente: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } }
        ];
      }

      // Obtener radicados con paginación
      const radicados = await Radicado
        .find(filtros)
        .populate('proyectoId', 'nombre codigo')
        .populate('creadoPor', 'nombre apellido email')
        .populate('archivoDigitalizado', 'nombre rutaArchivo tipoArchivo')
        .populate('archivosAdjuntos', 'nombre rutaArchivo tipoArchivo')
        .populate('respondeA', 'consecutivo asunto')
        .sort({ fechaRadicado: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Radicado.countDocuments(filtros);

      res.json({
        success: true,
        data: {
          radicados,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: radicados.length,
            totalRecords: total
          }
        }
      });
    } catch (error) {
      console.error('Error al listar radicados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener un radicado por ID
   */
  static async obtenerRadicadoPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const radicado = await Radicado.findById(id)
        .populate('proyectoId', 'nombre codigo descripcion')
        .populate('creadoPor', 'nombre apellido email telefono')
        .populate('archivoDigitalizado')
        .populate('archivosAdjuntos')
        .populate('respondeA')
        .populate('usuariosAutorizados', 'nombre apellido email');

      if (!radicado) {
        res.status(404).json({
          success: false,
          message: 'Radicado no encontrado'
        });
        return;
      }

      // Verificar acceso a documentos confidenciales
      if (radicado.esConfidencial) {
        const tieneAcceso = radicado.usuariosAutorizados.some(
          (usuario: any) => usuario._id.toString() === req.usuario._id.toString()
        ) || radicado.creadoPor._id.toString() === req.usuario._id.toString();

        if (!tieneAcceso) {
          res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a este documento confidencial'
          });
          return;
        }
      }

      res.json({
        success: true,
        data: radicado
      });
    } catch (error) {
      console.error('Error al obtener radicado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo radicado
   */
  static async crearRadicado(req: Request, res: Response): Promise<void> {
    try {
      // Verificar permisos
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.DOCUMENTOS,
        TipoPermiso.CREAR
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear radicados'
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

      const radicadoData = {
        ...req.body,
        creadoPor: req.usuario._id,
        fechaCreacion: new Date()
      };

      const nuevoRadicado = new Radicado(radicadoData);
      await nuevoRadicado.save();

      const radicadoCreado = await Radicado.findById(nuevoRadicado._id)
        .populate('proyectoId', 'nombre codigo')
        .populate('creadoPor', 'nombre apellido email')
        .populate('archivoDigitalizado')
        .populate('archivosAdjuntos');

      res.status(201).json({
        success: true,
        message: 'Radicado creado exitosamente',
        data: radicadoCreado
      });
    } catch (error) {
      console.error('Error al crear radicado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar radicado
   */
  static async actualizarRadicado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const radicado = await Radicado.findById(id);
      if (!radicado) {
        res.status(404).json({
          success: false,
          message: 'Radicado no encontrado'
        });
        return;
      }

      // Verificar permisos de edición
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.DOCUMENTOS,
        TipoPermiso.EDITAR
      );

      const esCreador = radicado.creadoPor.toString() === req.usuario._id.toString();

      if (!tienePermiso && !esCreador) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este radicado'
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

      Object.assign(radicado, req.body);
      radicado.fechaActualizacion = new Date();

      await radicado.save();

      const radicadoActualizado = await Radicado.findById(id)
        .populate('proyectoId', 'nombre codigo')
        .populate('creadoPor', 'nombre apellido email')
        .populate('archivoDigitalizado')
        .populate('archivosAdjuntos');

      res.json({
        success: true,
        message: 'Radicado actualizado exitosamente',
        data: radicadoActualizado
      });
    } catch (error) {
      console.error('Error al actualizar radicado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar radicado
   */
  static async eliminarRadicado(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const radicado = await Radicado.findById(id);
      if (!radicado) {
        res.status(404).json({
          success: false,
          message: 'Radicado no encontrado'
        });
        return;
      }

      // Verificar permisos de eliminación
      const tienePermiso = await PermisosManager.usuarioTienePermiso(
        req.usuario._id,
        TipoRecurso.DOCUMENTOS,
        TipoPermiso.ELIMINAR
      );

      if (!tienePermiso) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar radicados'
        });
        return;
      }

      await Radicado.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Radicado eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar radicado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas del archivo
   */
  static async obtenerEstadisticas(req: Request, res: Response): Promise<void> {
    try {
      const { proyectoId, fechaInicio, fechaFin } = req.query;
      
      const filtros: any = {};
      
      if (proyectoId) {
        filtros.proyectoId = proyectoId;
      }
      
      if (fechaInicio || fechaFin) {
        filtros.fechaRadicado = {};
        if (fechaInicio) filtros.fechaRadicado.$gte = new Date(fechaInicio as string);
        if (fechaFin) filtros.fechaRadicado.$lte = new Date(fechaFin as string);
      }

      // Estadísticas por tipo de oficio
      const porTipoOficio = await Radicado.aggregate([
        { $match: filtros },
        { $group: { _id: '$tipoOficio', count: { $sum: 1 } } }
      ]);

      // Estadísticas por estado
      const porEstado = await Radicado.aggregate([
        { $match: filtros },
        { $group: { _id: '$estado', count: { $sum: 1 } } }
      ]);

      // Estadísticas por prioridad
      const porPrioridad = await Radicado.aggregate([
        { $match: filtros },
        { $group: { _id: '$prioridad', count: { $sum: 1 } } }
      ]);

      // Estadísticas por categoría
      const porCategoria = await Radicado.aggregate([
        { $match: filtros },
        { $group: { _id: '$categoria', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Radicados por mes (últimos 12 meses)
      const porMes = await Radicado.aggregate([
        { 
          $match: { 
            ...filtros,
            fechaRadicado: { 
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
            }
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$fechaRadicado' },
              month: { $month: '$fechaRadicado' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const totalRadicados = await Radicado.countDocuments(filtros);
      const pendientesRespuesta = await Radicado.countDocuments({
        ...filtros,
        requiereRespuesta: true,
        fechaRespuesta: { $exists: false }
      });

      res.json({
        success: true,
        data: {
          totalRadicados,
          pendientesRespuesta,
          porTipoOficio,
          porEstado,
          porPrioridad,
          porCategoria,
          porMes
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
   * Generar consecutivo siguiente
   */
  static async generarConsecutivo(req: Request, res: Response): Promise<void> {
    try {
      const year = new Date().getFullYear();
      const count = await Radicado.countDocuments({
        fechaRadicado: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });
      
      const consecutivo = `RAD-${year}-${String(count + 1).padStart(4, '0')}`;

      res.json({
        success: true,
        data: { consecutivo }
      });
    } catch (error) {
      console.error('Error al generar consecutivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}