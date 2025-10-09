import { body, param } from 'express-validator';
import { TipoUsuario, EstadoUsuario } from '../models/Usuario';

export class UsuarioValidation {
  /**
   * Validaciones para login
   */
  static login() {
    return [
      body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
      body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
    ];
  }

  /**
   * Validaciones para crear usuario
   */
  static crear() {
    return [
      body('nombre')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
      
      body('apellido')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
      
      body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
      
      body('telefono')
        .optional()
        .isMobilePhone('es-CO')
        .withMessage('Número de teléfono inválido'),
      
      body('cedula')
        .isLength({ min: 6, max: 15 })
        .withMessage('La cédula debe tener entre 6 y 15 caracteres')
        .isNumeric()
        .withMessage('La cédula debe contener solo números'),
      
      body('tipoUsuario')
        .isIn(Object.values(TipoUsuario))
        .withMessage('Tipo de usuario inválido'),
      
      body('profesion')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('La profesión no puede exceder 100 caracteres'),
      
      body('experiencia')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La experiencia no puede exceder 1000 caracteres'),
      
      body('certificaciones')
        .optional()
        .isArray()
        .withMessage('Las certificaciones deben ser un array')
    ];
  }

  /**
   * Validaciones para actualizar usuario
   */
  static actualizar() {
    return [
      param('id')
        .isMongoId()
        .withMessage('ID de usuario inválido'),
      
      body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
      
      body('apellido')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
      
      body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
      
      body('telefono')
        .optional()
        .isMobilePhone('es-CO')
        .withMessage('Número de teléfono inválido'),
      
      body('cedula')
        .optional()
        .isLength({ min: 6, max: 15 })
        .withMessage('La cédula debe tener entre 6 y 15 caracteres')
        .isNumeric()
        .withMessage('La cédula debe contener solo números'),
      
      body('tipoUsuario')
        .optional()
        .isIn(Object.values(TipoUsuario))
        .withMessage('Tipo de usuario inválido'),
      
      body('estado')
        .optional()
        .isIn(Object.values(EstadoUsuario))
        .withMessage('Estado de usuario inválido'),
      
      body('profesion')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('La profesión no puede exceder 100 caracteres'),
      
      body('experiencia')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La experiencia no puede exceder 1000 caracteres'),
      
      body('certificaciones')
        .optional()
        .isArray()
        .withMessage('Las certificaciones deben ser un array')
    ];
  }

  /**
   * Validaciones para cambiar contraseña
   */
  static cambiarPassword() {
    return [
      body('passwordActual')
        .isLength({ min: 1 })
        .withMessage('La contraseña actual es requerida'),
      
      body('passwordNueva')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
    ];
  }

  /**
   * Validaciones para cambiar estado
   */
  static cambiarEstado() {
    return [
      param('id')
        .isMongoId()
        .withMessage('ID de usuario inválido'),
      
      body('estado')
        .isIn(Object.values(EstadoUsuario))
        .withMessage('Estado de usuario inválido')
    ];
  }

  /**
   * Validaciones para actualizar perfil
   */
  static actualizarPerfil() {
    return [
      body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
      
      body('apellido')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[A-Za-záéíóúñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
      
      body('telefono')
        .optional()
        .isMobilePhone('es-CO')
        .withMessage('Número de teléfono inválido'),
      
      body('profesion')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('La profesión no puede exceder 100 caracteres'),
      
      body('experiencia')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('La experiencia no puede exceder 1000 caracteres'),
      
      body('certificaciones')
        .optional()
        .isArray()
        .withMessage('Las certificaciones deben ser un array')
    ];
  }

  /**
   * Validación para parámetro ID
   */
  static validarId() {
    return [
      param('id')
        .isMongoId()
        .withMessage('ID inválido')
    ];
  }
}

export class ProyectoValidation {
  /**
   * Validaciones para crear proyecto
   */
  static crear() {
    return [
      body('nombre')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

      body('descripcion')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),

      body('tipoProyecto')
        .isIn(['construccion', 'infraestructura', 'tecnologia', 'consultoria', 'otros'])
        .withMessage('Tipo de proyecto inválido'),

      body('estado')
        .isIn(['planificacion', 'en_ejecucion', 'suspendido', 'finalizado', 'cancelado'])
        .withMessage('Estado de proyecto inválido'),

      body('prioridad')
        .isIn(['baja', 'media', 'alta', 'critica'])
        .withMessage('Prioridad inválida'),

      body('fechaInicio')
        .isISO8601()
        .withMessage('Fecha de inicio inválida'),

      body('fechaFin')
        .optional()
        .isISO8601()
        .withMessage('Fecha de fin inválida'),

      body('ubicacion')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('La ubicación no puede exceder 200 caracteres'),

      body('porcentajeAvance')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('El porcentaje de avance debe estar entre 0 y 100')
    ];
  }

  /**
   * Validaciones para actualizar proyecto
   */
  static actualizar() {
    return [
      body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

      body('descripcion')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),

      body('tipoProyecto')
        .optional()
        .isIn(['construccion', 'infraestructura', 'tecnologia', 'consultoria', 'otros'])
        .withMessage('Tipo de proyecto inválido'),

      body('estado')
        .optional()
        .isIn(['planificacion', 'en_ejecucion', 'suspendido', 'finalizado', 'cancelado'])
        .withMessage('Estado de proyecto inválido'),

      body('prioridad')
        .optional()
        .isIn(['baja', 'media', 'alta', 'critica'])
        .withMessage('Prioridad inválida'),

      body('fechaInicio')
        .optional()
        .isISO8601()
        .withMessage('Fecha de inicio inválida'),

      body('fechaFin')
        .optional()
        .isISO8601()
        .withMessage('Fecha de fin inválida'),

      body('ubicacion')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('La ubicación no puede exceder 200 caracteres'),

      body('porcentajeAvance')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('El porcentaje de avance debe estar entre 0 y 100')
    ];
  }
}