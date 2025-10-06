import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { AuthMiddleware } from '../middleware/auth';
import { UsuarioValidation } from '../utils/validations';

const router = Router();

// Todas las rutas requieren autenticación
router.use(AuthMiddleware.verificarToken);

/**
 * @route   GET /api/usuarios
 * @desc    Listar todos los usuarios con paginación y filtros
 * @access  Private (Admin)
 */
router.get('/',
  AuthMiddleware.esAdministrador,
  UsuarioController.listar
);

/**
 * @route   GET /api/usuarios/estadisticas
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Admin)
 */
router.get('/estadisticas',
  AuthMiddleware.esAdministrador,
  UsuarioController.estadisticas
);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener un usuario por ID
 * @access  Private (Admin o mismo usuario)
 */
router.get('/:id',
  UsuarioValidation.validarId(),
  UsuarioController.obtenerPorId
);

/**
 * @route   POST /api/usuarios
 * @desc    Crear nuevo usuario
 * @access  Private (Admin)
 */
router.post('/',
  AuthMiddleware.esAdministrador,
  UsuarioValidation.crear(),
  UsuarioController.crear
);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar usuario
 * @access  Private (Admin)
 */
router.put('/:id',
  AuthMiddleware.esAdministrador,
  UsuarioValidation.actualizar(),
  UsuarioController.actualizar
);

/**
 * @route   PATCH /api/usuarios/:id/estado
 * @desc    Cambiar estado de usuario (activo/inactivo/suspendido)
 * @access  Private (Admin)
 */
router.patch('/:id/estado',
  AuthMiddleware.esAdministrador,
  UsuarioValidation.cambiarEstado(),
  UsuarioController.cambiarEstado
);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar usuario
 * @access  Private (Admin)
 */
router.delete('/:id',
  AuthMiddleware.esAdministrador,
  UsuarioValidation.validarId(),
  UsuarioController.eliminar
);

export default router;