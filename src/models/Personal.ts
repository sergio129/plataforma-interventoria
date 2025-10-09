import mongoose, { Schema, Document } from 'mongoose';

// Enums para personal
export enum EstadoPersonal {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  TERMINADO = 'terminado',
  SUSPENDIDO = 'suspendido'
}

export enum TipoContrato {
  INDEFINIDO = 'indefinido',
  FIJO = 'fijo',
  OBRA_LABOR = 'obra_labor',
  PRESTACION_SERVICIOS = 'prestacion_servicios'
}

// Interface para Personal
export interface IPersonal extends Document {
  nombre: string;
  apellido: string;
  cedula: string;
  email?: string;
  telefono?: string;
  cargo: string;
  tipoContrato: TipoContrato;
  estado: EstadoPersonal;
  fechaIngreso: Date;
  fechaTerminacion?: Date;
  salario?: number;
  observaciones?: string;
  proyectoId?: mongoose.Types.ObjectId; // Proyecto al que está asignado
  fechaCreacion: Date;
  fechaActualizacion: Date;
  creadoPor: mongoose.Types.ObjectId;
}

// Schema para Personal
const PersonalSchema: Schema = new Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },
  cedula: {
    type: String,
    required: [true, 'La cédula es requerida'],
    trim: true,
    unique: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  telefono: {
    type: String,
    trim: true,
    maxlength: [20, 'El teléfono no puede exceder 20 caracteres']
  },
  cargo: {
    type: String,
    required: [true, 'El cargo es requerido'],
    trim: true,
    maxlength: [100, 'El cargo no puede exceder 100 caracteres']
  },
  tipoContrato: {
    type: String,
    enum: Object.values(TipoContrato),
    required: [true, 'El tipo de contrato es requerido'],
    default: TipoContrato.INDEFINIDO
  },
  estado: {
    type: String,
    enum: Object.values(EstadoPersonal),
    default: EstadoPersonal.ACTIVO
  },
  fechaIngreso: {
    type: Date,
    required: [true, 'La fecha de ingreso es requerida']
  },
  fechaTerminacion: {
    type: Date
  },
  salario: {
    type: Number,
    min: [0, 'El salario debe ser positivo']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
  },
  proyectoId: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto'
  },
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
    required: [true, 'El creador es requerido']
  }
});

// Middleware para actualizar fechaActualizacion
PersonalSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Índices
PersonalSchema.index({ estado: 1 });
PersonalSchema.index({ proyectoId: 1 });
PersonalSchema.index({ fechaIngreso: -1 });
PersonalSchema.index({ fechaCreacion: -1 });

export const Personal = mongoose.models.Personal || mongoose.model<IPersonal>('Personal', PersonalSchema);