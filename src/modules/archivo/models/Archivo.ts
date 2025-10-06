import mongoose, { Schema, Document } from 'mongoose';

// Enums para el módulo de archivo
export enum TipoOficio {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  INTERNO = 'interno',
  CIRCULAR = 'circular'
}

export enum EstadoOficio {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  RECIBIDO = 'recibido',
  ARCHIVADO = 'archivado'
}

export enum PrioridadOficio {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente'
}

// Interface para el radicado
export interface IRadicado extends Document {
  consecutivo: string;
  fechaRadicado: Date;
  fechaOficio: Date;
  
  // Información del oficio
  tipoOficio: TipoOficio;
  asunto: string;
  resumen: string;
  observaciones?: string;
  
  // Destinatario/Remitente
  destinatario: string;
  cargoDestinatario?: string;
  entidadDestinatario?: string;
  emailDestinatario?: string;
  
  // Remitente (para oficios de entrada)
  remitente?: string;
  cargoRemitente?: string;
  entidadRemitente?: string;
  
  // Estado y prioridad
  estado: EstadoOficio;
  prioridad: PrioridadOficio;
  
  // Archivos adjuntos
  archivoDigitalizado?: mongoose.Types.ObjectId; // Referencia al documento PDF/imagen
  archivosAdjuntos: mongoose.Types.ObjectId[]; // Otros archivos relacionados
  
  // Clasificación
  categoria: string; // Ej: "Técnico", "Administrativo", "Legal"
  tags: string[];
  
  // Relaciones
  proyectoId?: mongoose.Types.ObjectId; // Proyecto al que pertenece
  respondeA?: mongoose.Types.ObjectId; // Si es respuesta a otro oficio
  
  // Seguimiento
  fechaVencimiento?: Date;
  requiereRespuesta: boolean;
  fechaRespuesta?: Date;
  
  // Metadatos
  creadoPor: mongoose.Types.ObjectId;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  
  // Control de acceso
  esConfidencial: boolean;
  usuariosAutorizados: mongoose.Types.ObjectId[];
}

// Schema para radicados
const RadicadoSchema: Schema = new Schema({
  consecutivo: {
    type: String,
    required: [true, 'El consecutivo es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  fechaRadicado: {
    type: Date,
    required: [true, 'La fecha de radicado es requerida'],
    default: Date.now
  },
  fechaOficio: {
    type: Date,
    required: [true, 'La fecha del oficio es requerida']
  },
  
  // Información del oficio
  tipoOficio: {
    type: String,
    enum: Object.values(TipoOficio),
    required: [true, 'El tipo de oficio es requerido']
  },
  asunto: {
    type: String,
    required: [true, 'El asunto es requerido'],
    trim: true,
    maxlength: [500, 'El asunto no puede exceder 500 caracteres']
  },
  resumen: {
    type: String,
    required: [true, 'El resumen es requerido'],
    trim: true,
    maxlength: [2000, 'El resumen no puede exceder 2000 caracteres']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las observaciones no pueden exceder 2000 caracteres']
  },
  
  // Destinatario/Remitente
  destinatario: {
    type: String,
    required: [true, 'El destinatario es requerido'],
    trim: true
  },
  cargoDestinatario: {
    type: String,
    trim: true
  },
  entidadDestinatario: {
    type: String,
    trim: true
  },
  emailDestinatario: {
    type: String,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  
  // Remitente (para oficios de entrada)
  remitente: {
    type: String,
    trim: true
  },
  cargoRemitente: {
    type: String,
    trim: true
  },
  entidadRemitente: {
    type: String,
    trim: true
  },
  
  // Estado y prioridad
  estado: {
    type: String,
    enum: Object.values(EstadoOficio),
    default: EstadoOficio.BORRADOR
  },
  prioridad: {
    type: String,
    enum: Object.values(PrioridadOficio),
    default: PrioridadOficio.MEDIA
  },
  
  // Archivos adjuntos
  archivoDigitalizado: {
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  },
  archivosAdjuntos: [{
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  }],
  
  // Clasificación
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Relaciones
  proyectoId: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto'
  },
  respondeA: {
    type: Schema.Types.ObjectId,
    ref: 'Radicado'
  },
  
  // Seguimiento
  fechaVencimiento: {
    type: Date
  },
  requiereRespuesta: {
    type: Boolean,
    default: false
  },
  fechaRespuesta: {
    type: Date
  },
  
  // Metadatos
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  
  // Control de acceso
  esConfidencial: {
    type: Boolean,
    default: false
  },
  usuariosAutorizados: [{
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  }]
});

// Middleware para actualizar fechaActualizacion
RadicadoSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Middleware para generar consecutivo automático
RadicadoSchema.pre('save', async function(next) {
  if (this.isNew && !this.consecutivo) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Radicado').countDocuments({
      fechaRadicado: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    
    this.consecutivo = `RAD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Validaciones personalizadas
RadicadoSchema.pre('save', function(next) {
  if (this.fechaVencimiento && this.fechaVencimiento <= this.fechaOficio) {
    next(new Error('La fecha de vencimiento debe ser posterior a la fecha del oficio'));
  }
  if (this.fechaRespuesta && this.fechaRespuesta <= this.fechaOficio) {
    next(new Error('La fecha de respuesta debe ser posterior a la fecha del oficio'));
  }
  next();
});

// Índices para optimizar consultas
RadicadoSchema.index({ consecutivo: 1 });
RadicadoSchema.index({ fechaRadicado: -1 });
RadicadoSchema.index({ fechaOficio: -1 });
RadicadoSchema.index({ tipoOficio: 1 });
RadicadoSchema.index({ estado: 1 });
RadicadoSchema.index({ prioridad: 1 });
RadicadoSchema.index({ destinatario: 1 });
RadicadoSchema.index({ remitente: 1 });
RadicadoSchema.index({ categoria: 1 });
RadicadoSchema.index({ tags: 1 });
RadicadoSchema.index({ proyectoId: 1 });
RadicadoSchema.index({ creadoPor: 1 });
RadicadoSchema.index({ asunto: 'text', resumen: 'text' });

export const Radicado = mongoose.model<IRadicado>('Radicado', RadicadoSchema);