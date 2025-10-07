import express from 'express';
import Evidencia from '../models/Evidencia';
import { AuthMiddleware } from '../middleware/auth';
import { PermisosManager, TipoRecurso, TipoPermiso } from '../models/Rol';

const router = express.Router();

// Middleware de autenticación para todas las rutas de evidencias
router.use(AuthMiddleware.verificarToken);

// Ruta para obtener todas las evidencias
router.get('/', async (req, res) => {
  try {
    // Validar permiso de lectura
    const usuarioId = req.usuario._id;
    const tienePermiso = await PermisosManager.usuarioTienePermiso(usuarioId, TipoRecurso.EVIDENCIAS, TipoPermiso.LEER);
    if (!tienePermiso) {
      return res.status(403).json({ message: 'No tienes permiso para ver evidencias' });
    }
    const evidencias = await Evidencia.find({ eliminado: false });
    res.status(200).json(evidencias);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las evidencias', error });
  }
});

// Ruta para crear una nueva evidencia
router.post('/', async (req, res) => {
  try {
    // Validar permiso de creación
    const usuarioId = req.usuario._id;
    const tienePermiso = await PermisosManager.usuarioTienePermiso(usuarioId, TipoRecurso.EVIDENCIAS, TipoPermiso.CREAR);
    if (!tienePermiso) {
      return res.status(403).json({ message: 'No tienes permiso para crear evidencias' });
    }
    const nuevaEvidencia = new Evidencia({ ...req.body, creadoPor: usuarioId, eliminado: false });
    const evidenciaGuardada = await nuevaEvidencia.save();
    res.status(201).json(evidenciaGuardada);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la evidencia', error });
  }
});

export default router;