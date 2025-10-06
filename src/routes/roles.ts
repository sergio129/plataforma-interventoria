import { Router } from 'express';
import { RolController } from '../controllers/RolController';
import { AuthMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = Router();

// Todas las rutas requieren autenticación
router.use(AuthMiddleware.verificarToken);

/**
 * @route   GET /api/roles
 * @desc    Listar todos los roles
 * @access  Private (Admin)
 */
router.get('/',
  AuthMiddleware.esAdministrador,
  RolController.listar
);

/**
 * @route   GET /api/roles/recursos
 * @desc    Obtener recursos y permisos disponibles
 * @access  Private (Admin)
 */
router.get('/recursos',
  AuthMiddleware.esAdministrador,
  RolController.recursosDisponibles
);

/**
 * @route   GET /api/roles/:id
 * @desc    Obtener un rol por ID
 * @access  Private (Admin)
 */
router.get('/:id',
  AuthMiddleware.esAdministrador,
  param('id').isMongoId().withMessage('ID de rol inválido'),
  RolController.obtenerPorId
);

/**
 * @route   POST /api/roles
 * @desc    Crear nuevo rol
 * @access  Private (Admin)
 */
router.post('/',
  AuthMiddleware.esAdministrador,
  [
    body('nombre')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre debe tener entre 3 y 50 caracteres'),
    body('descripcion')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('La descripción debe tener entre 10 y 200 caracteres'),
    body('permisos')
      .isArray({ min: 1 })
      .withMessage('Debe proporcionar al menos un permiso')
  ],
  RolController.crear
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Actualizar rol
 * @access  Private (Admin)
 */
router.put('/:id',
  AuthMiddleware.esAdministrador,
  [
    param('id').isMongoId().withMessage('ID de rol inválido'),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El nombre debe tener entre 3 y 50 caracteres'),
    body('descripcion')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('La descripción debe tener entre 10 y 200 caracteres'),
    body('permisos')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Debe proporcionar al menos un permiso'),
    body('activo')
      .optional()
      .isBoolean()
      .withMessage('Activo debe ser verdadero o falso')
  ],
  RolController.actualizar
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Eliminar rol
 * @access  Private (Admin)
 */
router.delete('/:id',
  AuthMiddleware.esAdministrador,
  param('id').isMongoId().withMessage('ID de rol inválido'),
  RolController.eliminar
);

/**
 * @route   GET /api/roles/usuarios/:userId/permisos
 * @desc    Obtener permisos de un usuario
 * @access  Private
 */
router.get('/usuarios/:userId/permisos',
  param('userId').isMongoId().withMessage('ID de usuario inválido'),
  RolController.permisosUsuario
);

/**
 * @route   POST /api/roles/usuarios/:userId/asignar
 * @desc    Asignar roles a un usuario
 * @access  Private (Admin)
 */
router.post('/usuarios/:userId/asignar',
  AuthMiddleware.esAdministrador,
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    body('roles')
      .isArray()
      .withMessage('Los roles deben ser un array')
      .custom((roles) => {
        if (!Array.isArray(roles)) return false;
        return roles.every(roleId => typeof roleId === 'string' && roleId.match(/^[0-9a-fA-F]{24}$/));
      })
      .withMessage('Todos los roles deben ser IDs válidos de MongoDB')
  ],
  RolController.asignarRoles
);

/**
 * @route   POST /api/roles/usuarios/:userId/verificar-permiso
 * @desc    Verificar si un usuario tiene un permiso específico
 * @access  Private
 */
router.post('/usuarios/:userId/verificar-permiso',
  [
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    body('recurso')
      .notEmpty()
      .withMessage('El recurso es requerido'),
    body('accion')
      .notEmpty()
      .withMessage('La acción es requerida')
  ],
  RolController.verificarPermiso
);

export default router;