// Tipos para la API de autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    usuario: Usuario;
  };
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  tipoUsuario: TipoUsuario;
  profesion?: string;
  telefono?: string;
  cedula: string;
  estado: EstadoUsuario;
  ultimoAcceso?: string;
  fechaCreacion: string;
  roles?: string[];
}

export enum TipoUsuario {
  ADMINISTRADOR = 'administrador',
  INTERVENTOR = 'interventor',
  CONTRATISTA = 'contratista',
  SUPERVISOR = 'supervisor'
}

export enum EstadoUsuario {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  SUSPENDIDO = 'suspendido'
}

// Tipos para proyectos
export interface Proyecto {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoProyecto: TipoProyecto;
  estado: EstadoProyecto;
  prioridad: PrioridadProyecto;
  fechaInicio: string;
  fechaFinPlaneada: string;
  ubicacion: Ubicacion;
  contratista?: Usuario;
  interventor?: Usuario;
  supervisor?: Usuario;
  contactoCliente: ContactoCliente;
  presupuesto: Presupuesto;
  porcentajeAvance: number;
  hitos: Hito[];
  tags: string[];
  observaciones?: string;
  creadoPor: Usuario;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export enum TipoProyecto {
  CONSTRUCCION = 'construccion',
  INFRAESTRUCTURA = 'infraestructura',
  TECNOLOGIA = 'tecnologia',
  CONSULTORIA = 'consultoria',
  OTROS = 'otros'
}

export enum EstadoProyecto {
  PLANIFICACION = 'planificacion',
  EN_EJECUCION = 'en_ejecucion',
  SUSPENDIDO = 'suspendido',
  FINALIZADO = 'finalizado',
  CANCELADO = 'cancelado'
}

export enum PrioridadProyecto {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}

export interface Ubicacion {
  direccion: string;
  ciudad: string;
  departamento: string;
  pais: string;
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
}

export interface ContactoCliente {
  nombre: string;
  cargo: string;
  telefono?: string;
  email?: string;
}

export interface Presupuesto {
  valorTotal: number;
  valorEjecutado: number;
  moneda: string;
  fechaAprobacion: string;
}

export interface Hito {
  _id?: string;
  nombre: string;
  descripcion?: string;
  fechaPlaneada: string;
  fechaReal?: string;
  completado: boolean;
  porcentajeAvance: number;
  observaciones?: string;
}

// Tipos para roles y permisos
export interface Rol {
  _id: string;
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface Permiso {
  recurso: TipoRecurso;
  acciones: TipoPermiso[];
  condiciones?: {
    propietario?: boolean;
    estado?: string[];
    tipo?: string[];
  };
}

export enum TipoRecurso {
  USUARIOS = 'usuarios',
  PROYECTOS = 'proyectos',
  ARCHIVO = 'archivo',
  DOCUMENTOS = 'documentos',
  REPORTES = 'reportes',
  CONFIGURACION = 'configuracion'
}

export enum TipoPermiso {
  CREAR = 'crear',
  LEER = 'leer',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
  APROBAR = 'aprobar',
  EXPORTAR = 'exportar',
  CONFIGURAR = 'configurar'
}

// Tipos para respuestas de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  type: string;
  value: any;
  msg: string;
  path: string;
  location: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      current: number;
      total: number;
      count: number;
      totalRecords: number;
    };
  };
}

// Tipos para el estado de la aplicación
export interface AppState {
  isAuthenticated: boolean;
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
