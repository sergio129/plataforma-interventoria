import mongoose, { Schema, Document } from 'mongoose';

// Enum para tipos de recursos
export enum TipoRecurso {
  USUARIOS = 'usuarios',
  PROYECTOS = 'proyectos',
  DOCUMENTOS = 'documentos',
  REPORTES = 'reportes',
  CONFIGURACION = 'configuracion'
}

// Enum para acciones/permisos
export enum TipoPermiso {
  CREAR = 'crear',
  LEER = 'leer',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
  APROBAR = 'aprobar',
  EXPORTAR = 'exportar',
  CONFIGURAR = 'configurar'
}

// Interface para permisos individuales
export interface IPermiso {
  recurso: TipoRecurso;
  acciones: TipoPermiso[];
  condiciones?: {
    propietario?: boolean; // Solo si es propietario del recurso
    estado?: string[]; // Solo para ciertos estados
    tipo?: string[]; // Solo para ciertos tipos
  };
}

// Interface para Rol
export interface IRol extends Document {
  nombre: string;
  descripcion: string;
  permisos: IPermiso[];
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// Schema para permisos
const PermisoSchema = new Schema({
  recurso: {
    type: String,
    enum: Object.values(TipoRecurso),
    required: true
  },
  acciones: [{
    type: String,
    enum: Object.values(TipoPermiso),
    required: true
  }],
  condiciones: {
    propietario: { type: Boolean, default: false },
    estado: [{ type: String }],
    tipo: [{ type: String }]
  }
}, { _id: false });

// Schema para Rol
const RolSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  permisos: [PermisoSchema],
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar fechaActualizacion
RolSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Métodos del modelo
RolSchema.methods.tienePermiso = function(recurso: TipoRecurso, accion: TipoPermiso): boolean {
  const permiso = this.permisos.find((p: IPermiso) => p.recurso === recurso);
  return permiso ? permiso.acciones.includes(accion) : false;
};

RolSchema.methods.getPermisosRecurso = function(recurso: TipoRecurso): IPermiso | null {
  return this.permisos.find((p: IPermiso) => p.recurso === recurso) || null;
};

// Crear el modelo
export const Rol = mongoose.models.Rol || mongoose.model<IRol>('Rol', RolSchema);

// Clase utilitaria para manejo de permisos
export class PermisosManager {
  /**
   * Verificar si un usuario tiene permiso para realizar una acción
   */
  static async usuarioTienePermiso(
    usuarioId: string, 
    recurso: TipoRecurso, 
    accion: TipoPermiso,
    contexto?: any
  ): Promise<boolean> {
    try {
      const { Usuario } = await import('./Usuario');
      const usuario = await Usuario.findById(usuarioId).populate('roles');
      
      if (!usuario || !usuario.roles || usuario.roles.length === 0) {
        return false;
      }

      // Verificar en todos los roles del usuario
      for (const rol of usuario.roles) {
        const permiso = rol.getPermisosRecurso(recurso);
        if (permiso && permiso.acciones.includes(accion)) {
          // Verificar condiciones adicionales si existen
          if (permiso.condiciones && contexto) {
            if (permiso.condiciones.propietario && contexto.propietarioId !== usuarioId) {
              continue;
            }
            if (permiso.condiciones.estado && !permiso.condiciones.estado.includes(contexto.estado)) {
              continue;
            }
            if (permiso.condiciones.tipo && !permiso.condiciones.tipo.includes(contexto.tipo)) {
              continue;
            }
          }
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Obtener todos los permisos de un usuario
   */
  static async getPermisosUsuario(usuarioId: string): Promise<IPermiso[]> {
    try {
      const { Usuario } = await import('./Usuario');
      const usuario = await Usuario.findById(usuarioId).populate('roles');
      
      if (!usuario || !usuario.roles) {
        return [];
      }

      const todosLosPermisos: IPermiso[] = [];
      
      for (const rol of usuario.roles) {
        if (rol.activo) {
          todosLosPermisos.push(...rol.permisos);
        }
      }

      // Eliminar duplicados y combinar permisos
      const permisosUnicos = new Map<string, IPermiso>();
      
      for (const permiso of todosLosPermisos) {
        const key = permiso.recurso;
        if (permisosUnicos.has(key)) {
          const existente = permisosUnicos.get(key)!;
          const accionesCombinadas = [...new Set([...existente.acciones, ...permiso.acciones])];
          existente.acciones = accionesCombinadas;
        } else {
          permisosUnicos.set(key, { ...permiso });
        }
      }

      return Array.from(permisosUnicos.values());
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      return [];
    }
  }

  /**
   * Crear roles por defecto del sistema
   */
  static async crearRolesPorDefecto(): Promise<void> {
    try {
      const rolesExistentes = await Rol.countDocuments();
      if (rolesExistentes > 0) {
        return; // Ya existen roles
      }

      const rolesPorDefecto = [
        {
          nombre: 'Super Administrador',
          descripcion: 'Acceso completo a todas las funcionalidades del sistema',
          permisos: [
            {
              recurso: TipoRecurso.USUARIOS,
              acciones: Object.values(TipoPermiso)
            },
            {
              recurso: TipoRecurso.PROYECTOS,
              acciones: Object.values(TipoPermiso)
            },
            {
              recurso: TipoRecurso.DOCUMENTOS,
              acciones: Object.values(TipoPermiso)
            },
            {
              recurso: TipoRecurso.REPORTES,
              acciones: Object.values(TipoPermiso)
            },
            {
              recurso: TipoRecurso.CONFIGURACION,
              acciones: Object.values(TipoPermiso)
            }
          ]
        },
        {
          nombre: 'Administrador',
          descripcion: 'Gestión completa de usuarios y proyectos',
          permisos: [
            {
              recurso: TipoRecurso.USUARIOS,
              acciones: [TipoPermiso.CREAR, TipoPermiso.LEER, TipoPermiso.ACTUALIZAR]
            },
            {
              recurso: TipoRecurso.PROYECTOS,
              acciones: Object.values(TipoPermiso)
            },
            {
              recurso: TipoRecurso.DOCUMENTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR, TipoPermiso.ACTUALIZAR, TipoPermiso.APROBAR]
            },
            {
              recurso: TipoRecurso.REPORTES,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR, TipoPermiso.EXPORTAR]
            }
          ]
        },
        {
          nombre: 'Interventor',
          descripcion: 'Supervisión y control de proyectos, gestión de documentos y reportes',
          permisos: [
            {
              recurso: TipoRecurso.USUARIOS,
              acciones: [TipoPermiso.LEER]
            },
            {
              recurso: TipoRecurso.PROYECTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.ACTUALIZAR],
              condiciones: { propietario: true }
            },
            {
              recurso: TipoRecurso.DOCUMENTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR, TipoPermiso.ACTUALIZAR, TipoPermiso.APROBAR]
            },
            {
              recurso: TipoRecurso.REPORTES,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR, TipoPermiso.ACTUALIZAR, TipoPermiso.EXPORTAR]
            }
          ]
        },
        {
          nombre: 'Contratista',
          descripcion: 'Acceso a proyectos asignados, carga de documentos y reportes de avance',
          permisos: [
            {
              recurso: TipoRecurso.USUARIOS,
              acciones: [TipoPermiso.LEER]
            },
            {
              recurso: TipoRecurso.PROYECTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.ACTUALIZAR],
              condiciones: { propietario: true }
            },
            {
              recurso: TipoRecurso.DOCUMENTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR]
            },
            {
              recurso: TipoRecurso.REPORTES,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR]
            }
          ]
        },
        {
          nombre: 'Supervisor',
          descripcion: 'Supervisión de proyectos específicos y revisión de documentos',
          permisos: [
            {
              recurso: TipoRecurso.USUARIOS,
              acciones: [TipoPermiso.LEER]
            },
            {
              recurso: TipoRecurso.PROYECTOS,
              acciones: [TipoPermiso.LEER],
              condiciones: { propietario: true }
            },
            {
              recurso: TipoRecurso.DOCUMENTOS,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR]
            },
            {
              recurso: TipoRecurso.REPORTES,
              acciones: [TipoPermiso.LEER, TipoPermiso.CREAR]
            }
          ]
        }
      ];

      await Rol.insertMany(rolesPorDefecto);
      console.log('✅ Roles por defecto creados exitosamente');
    } catch (error) {
      console.error('❌ Error creando roles por defecto:', error);
    }
  }
}