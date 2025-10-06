import mongoose, { Schema, Document } from 'mongoose';

// Enums para tipos de usuario
export enum TipoUsuario {
  INTERVENTOR = 'interventor',
  CONTRATISTA = 'contratista',
  SUPERVISOR = 'supervisor',
  ADMINISTRADOR = 'administrador'
}

export enum EstadoUsuario {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  SUSPENDIDO = 'suspendido'
}

// Interface para Usuario
export interface IUsuario extends Document {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  cedula: string;
  tipoUsuario: TipoUsuario;
  estado: EstadoUsuario;
  profesion?: string;
  experiencia?: string;
  certificaciones?: string[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  ultimoAcceso?: Date;
}

// Schema para Usuario
const UsuarioSchema: Schema = new Schema({
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
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Teléfono inválido']
  },
  cedula: {
    type: String,
    required: [true, 'La cédula es requerida'],
    unique: true,
    trim: true
  },
  tipoUsuario: {
    type: String,
    enum: Object.values(TipoUsuario),
    required: [true, 'El tipo de usuario es requerido']
  },
  estado: {
    type: String,
    enum: Object.values(EstadoUsuario),
    default: EstadoUsuario.ACTIVO
  },
  profesion: {
    type: String,
    trim: true,
    maxlength: [100, 'La profesión no puede exceder 100 caracteres']
  },
  experiencia: {
    type: String,
    trim: true,
    maxlength: [500, 'La experiencia no puede exceder 500 caracteres']
  },
  certificaciones: [{
    type: String,
    trim: true
  }],
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  ultimoAcceso: {
    type: Date
  }
});

// Middleware para actualizar fechaActualizacion
UsuarioSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Índices
UsuarioSchema.index({ email: 1 });
UsuarioSchema.index({ cedula: 1 });
UsuarioSchema.index({ tipoUsuario: 1 });
UsuarioSchema.index({ estado: 1 });
UsuarioSchema.index({ fechaCreacion: -1 });

export const Usuario = mongoose.model<IUsuario>('Usuario', UsuarioSchema);