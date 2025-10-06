import { Router } from 'express';
import { body, param } from 'express-validator';
import { ArchivoController } from '../controllers/ArchivoController';
import { auth } from '../../../middleware/auth';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(auth);

/**
 * @route   GET /api/archivo/radicados
 * @desc    Listar todos los radicados con filtros y paginación
 * @access  Private
 */
router.get('/radicados', ArchivoController.listarRadicados);

/**
 * @route   GET /api/archivo/radicados/estadisticas
 * @desc    Obtener estadísticas del archivo
 * @access  Private
 */
router.get('/radicados/estadisticas', ArchivoController.obtenerEstadisticas);

/**
 * @route   GET /api/archivo/radicados/consecutivo
 * @desc    Generar consecutivo siguiente
 * @access  Private
 */
router.get('/radicados/consecutivo', ArchivoController.generarConsecutivo);

/**
 * @route   GET /api/archivo/radicados/:id
 * @desc    Obtener un radicado por ID
 * @access  Private
 */
router.get('/radicados/:id', [
  param('id').isMongoId().withMessage('ID inválido')
], ArchivoController.obtenerRadicadoPorId);

/**
 * @route   POST /api/archivo/radicados
 * @desc    Crear nuevo radicado
 * @access  Private
 */
router.post('/radicados', [
  body('fechaOficio')
    .isISO8601()
    .withMessage('Fecha de oficio inválida'),
  body('tipoOficio')
    .isIn(['entrada', 'salida', 'interno', 'circular'])
    .withMessage('Tipo de oficio inválido'),
  body('asunto')
    .notEmpty()
    .withMessage('El asunto es requerido')
    .isLength({ max: 500 })
    .withMessage('El asunto no puede exceder 500 caracteres'),
  body('resumen')
    .notEmpty()
    .withMessage('El resumen es requerido')
    .isLength({ max: 2000 })
    .withMessage('El resumen no puede exceder 2000 caracteres'),
  body('destinatario')
    .notEmpty()
    .withMessage('El destinatario es requerido'),
  body('categoria')
    .notEmpty()
    .withMessage('La categoría es requerida'),
  body('estado')
    .optional()
    .isIn(['borrador', 'enviado', 'recibido', 'archivado'])
    .withMessage('Estado inválido'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'media', 'alta', 'urgente'])
    .withMessage('Prioridad inválida'),
  body('emailDestinatario')
    .optional()
    .isEmail()
    .withMessage('Email del destinatario inválido'),
  body('fechaVencimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento inválida'),
  body('requiereRespuesta')
    .optional()
    .isBoolean()
    .withMessage('Requiere respuesta debe ser verdadero o falso'),
  body('esConfidencial')
    .optional()
    .isBoolean()
    .withMessage('Es confidencial debe ser verdadero o falso'),
  body('proyectoId')
    .optional()
    .isMongoId()
    .withMessage('ID de proyecto inválido'),
  body('respondeA')
    .optional()
    .isMongoId()
    .withMessage('ID de radicado respuesta inválido')
], ArchivoController.crearRadicado);

/**
 * @route   PUT /api/archivo/radicados/:id
 * @desc    Actualizar radicado
 * @access  Private
 */
router.put('/radicados/:id', [
  param('id').isMongoId().withMessage('ID inválido'),
  body('fechaOficio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de oficio inválida'),
  body('tipoOficio')
    .optional()
    .isIn(['entrada', 'salida', 'interno', 'circular'])
    .withMessage('Tipo de oficio inválido'),
  body('asunto')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El asunto no puede exceder 500 caracteres'),
  body('resumen')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('El resumen no puede exceder 2000 caracteres'),
  body('estado')
    .optional()
    .isIn(['borrador', 'enviado', 'recibido', 'archivado'])
    .withMessage('Estado inválido'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'media', 'alta', 'urgente'])
    .withMessage('Prioridad inválida'),
  body('emailDestinatario')
    .optional()
    .isEmail()
    .withMessage('Email del destinatario inválido'),
  body('fechaVencimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento inválida'),
  body('fechaRespuesta')
    .optional()
    .isISO8601()
    .withMessage('Fecha de respuesta inválida'),
  body('requiereRespuesta')
    .optional()
    .isBoolean()
    .withMessage('Requiere respuesta debe ser verdadero o falso'),
  body('esConfidencial')
    .optional()
    .isBoolean()
    .withMessage('Es confidencial debe ser verdadero o falso'),
  body('proyectoId')
    .optional()
    .isMongoId()
    .withMessage('ID de proyecto inválido'),
  body('respondeA')
    .optional()
    .isMongoId()
    .withMessage('ID de radicado respuesta inválido')
], ArchivoController.actualizarRadicado);

/**
 * @route   DELETE /api/archivo/radicados/:id
 * @desc    Eliminar radicado
 * @access  Private
 */
router.delete('/radicados/:id', [
  param('id').isMongoId().withMessage('ID inválido')
], ArchivoController.eliminarRadicado);

export default router;