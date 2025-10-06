import { Router } from 'express';
import { ProyectoController } from '../controllers/ProyectoController';
import { AuthMiddleware } from '../middleware/auth';
import { ProyectoValidation, UsuarioValidation } from '../utils/validations';

const router = Router();

// Todas las rutas requieren autenticación
router.use(AuthMiddleware.verificarToken);

/**
 * @route   GET /api/proyectos
 * @desc    Listar todos los proyectos con paginación y filtros
 * @access  Private
 */
router.get('/',
  ProyectoController.listar
);

/**
 * @route   GET /api/proyectos/estadisticas
 * @desc    Obtener estadísticas de proyectos
 * @access  Private
 */
router.get('/estadisticas',
  ProyectoController.estadisticas
);

/**
 * @route   GET /api/proyectos/:id
 * @desc    Obtener un proyecto por ID
 * @access  Private
 */
router.get('/:id',
  UsuarioValidation.validarId(),
  ProyectoController.obtenerPorId
);

/**
 * @route   POST /api/proyectos
 * @desc    Crear nuevo proyecto
 * @access  Private (Interventor o Admin)
 */
router.post('/',
  AuthMiddleware.esInterventorOAdmin,
  ProyectoValidation.crear(),
  ProyectoController.crear
);

/**
 * @route   PUT /api/proyectos/:id
 * @desc    Actualizar proyecto
 * @access  Private (Según permisos)
 */
router.put('/:id',
  ProyectoValidation.actualizar(),
  ProyectoController.actualizar
);

/**
 * @route   PATCH /api/proyectos/:id/estado
 * @desc    Cambiar estado de proyecto
 * @access  Private (Según permisos)
 */
router.patch('/:id/estado',
  ProyectoValidation.cambiarEstado(),
  ProyectoController.cambiarEstado
);

/**
 * @route   PUT /api/proyectos/:id/hitos/:hitoId
 * @desc    Actualizar hito de proyecto
 * @access  Private (Según permisos)
 */
router.put('/:id/hitos/:hitoId',
  ProyectoValidation.actualizarHito(),
  ProyectoController.actualizarHito
);

/**
 * @route   DELETE /api/proyectos/:id
 * @desc    Eliminar proyecto
 * @access  Private (Admin)
 */
router.delete('/:id',
  AuthMiddleware.esAdministrador,
  UsuarioValidation.validarId(),
  ProyectoController.eliminar
);

export default router;