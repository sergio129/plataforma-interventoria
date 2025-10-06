import mongoose, { Schema, Document } from 'mongoose';

// Enums para proyectos
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

// Interfaces para sub-documentos
export interface IContacto {
  nombre: string;
  cargo: string;
  telefono?: string;
  email?: string;
}

export interface IPresupuesto {
  valorTotal: number;
  valorEjecutado: number;
  moneda: string;
  fechaAprobacion: Date;
}

export interface IHito {
  nombre: string;
  descripcion?: string;
  fechaPlaneada: Date;
  fechaReal?: Date;
  completado: boolean;
  porcentajeAvance: number;
}

// Interface principal para Proyecto
export interface IProyecto extends Document {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoProyecto: TipoProyecto;
  estado: EstadoProyecto;
  prioridad: PrioridadProyecto;
  
  // Fechas
  fechaInicio: Date;
  fechaFinPlaneada: Date;
  fechaFinReal?: Date;
  
  // Ubicación
  ubicacion: {
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
    coordenadas?: {
      latitud: number;
      longitud: number;
    };
  };
  
  // Participantes
  contratista: mongoose.Types.ObjectId;
  interventor?: mongoose.Types.ObjectId;
  supervisor?: mongoose.Types.ObjectId;
  contactoCliente: IContacto;
  
  // Financiero
  presupuesto: IPresupuesto;
  
  // Avance
  porcentajeAvance: number;
  hitos: IHito[];
  
  // Documentos y archivos
  documentos: mongoose.Types.ObjectId[];
  
  // Metadatos
  fechaCreacion: Date;
  fechaActualizacion: Date;
  creadoPor: mongoose.Types.ObjectId;
  tags?: string[];
  observaciones?: string;
}

// Schema para sub-documentos
const ContactoSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  cargo: { type: String, required: true, trim: true },
  telefono: { type: String, trim: true },
  email: { 
    type: String, 
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  }
});

const PresupuestoSchema = new Schema({
  valorTotal: { 
    type: Number, 
    required: true, 
    min: [0, 'El valor total debe ser positivo'] 
  },
  valorEjecutado: { 
    type: Number, 
    default: 0, 
    min: [0, 'El valor ejecutado debe ser positivo'] 
  },
  moneda: { 
    type: String, 
    required: true, 
    default: 'COP',
    enum: ['COP', 'USD', 'EUR']
  },
  fechaAprobacion: { type: Date, required: true }
});

const HitoSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  fechaPlaneada: { type: Date, required: true },
  fechaReal: { type: Date },
  completado: { type: Boolean, default: false },
  porcentajeAvance: { 
    type: Number, 
    default: 0, 
    min: [0, 'El porcentaje no puede ser negativo'],
    max: [100, 'El porcentaje no puede exceder 100']
  }
});

// Schema principal para Proyecto
const ProyectoSchema: Schema = new Schema({
  codigo: {
    type: String,
    required: [true, 'El código del proyecto es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del proyecto es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  tipoProyecto: {
    type: String,
    enum: Object.values(TipoProyecto),
    required: [true, 'El tipo de proyecto es requerido']
  },
  estado: {
    type: String,
    enum: Object.values(EstadoProyecto),
    default: EstadoProyecto.PLANIFICACION
  },
  prioridad: {
    type: String,
    enum: Object.values(PrioridadProyecto),
    default: PrioridadProyecto.MEDIA
  },
  
  // Fechas
  fechaInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  fechaFinPlaneada: {
    type: Date,
    required: [true, 'La fecha de fin planeada es requerida']
  },
  fechaFinReal: {
    type: Date
  },
  
  // Ubicación
  ubicacion: {
    direccion: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    departamento: { type: String, required: true, trim: true },
    pais: { type: String, required: true, default: 'Colombia', trim: true },
    coordenadas: {
      latitud: { type: Number, min: -90, max: 90 },
      longitud: { type: Number, min: -180, max: 180 }
    }
  },
  
  // Participantes
  contratista: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El contratista es requerido']
  },
  interventor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  supervisor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  contactoCliente: {
    type: ContactoSchema,
    required: [true, 'El contacto del cliente es requerido']
  },
  
  // Financiero
  presupuesto: {
    type: PresupuestoSchema,
    required: [true, 'El presupuesto es requerido']
  },
  
  // Avance
  porcentajeAvance: {
    type: Number,
    default: 0,
    min: [0, 'El porcentaje no puede ser negativo'],
    max: [100, 'El porcentaje no puede exceder 100']
  },
  hitos: [HitoSchema],
  
  // Documentos
  documentos: [{
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  }],
  
  // Metadatos
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  observaciones: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las observaciones no pueden exceder 2000 caracteres']
  }
});

// Middleware para actualizar fechaActualizacion
ProyectoSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Validación personalizada para fechas
ProyectoSchema.pre('save', function(next) {
  if (this.fechaFinPlaneada <= this.fechaInicio) {
    next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  if (this.fechaFinReal && this.fechaFinReal <= this.fechaInicio) {
    next(new Error('La fecha de fin real debe ser posterior a la fecha de inicio'));
  }
  next();
});

// Índices
ProyectoSchema.index({ codigo: 1 });
ProyectoSchema.index({ nombre: 'text', descripcion: 'text' });
ProyectoSchema.index({ tipoProyecto: 1 });
ProyectoSchema.index({ estado: 1 });
ProyectoSchema.index({ prioridad: 1 });
ProyectoSchema.index({ fechaInicio: -1 });
ProyectoSchema.index({ contratista: 1 });
ProyectoSchema.index({ interventor: 1 });
ProyectoSchema.index({ supervisor: 1 });
ProyectoSchema.index({ 'ubicacion.ciudad': 1 });
ProyectoSchema.index({ tags: 1 });
ProyectoSchema.index({ fechaCreacion: -1 });

export const Proyecto = mongoose.models.Proyecto || mongoose.model<IProyecto>('Proyecto', ProyectoSchema);