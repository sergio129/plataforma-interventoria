import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/auth';
import { UsuarioValidation } from '../utils/validations';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', 
  UsuarioValidation.login(),
  AuthController.login
);

/**
 * @route   GET /api/auth/perfil
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get('/perfil',
  AuthMiddleware.verificarToken,
  AuthController.perfil
);

/**
 * @route   PUT /api/auth/perfil
 * @desc    Actualizar perfil del usuario actual
 * @access  Private
 */
router.put('/perfil',
  AuthMiddleware.verificarToken,
  UsuarioValidation.actualizarPerfil(),
  AuthController.actualizarPerfil
);

/**
 * @route   PUT /api/auth/cambiar-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Private
 */
router.put('/cambiar-password',
  AuthMiddleware.verificarToken,
  UsuarioValidation.cambiarPassword(),
  AuthController.cambiarPassword
);

export default router;