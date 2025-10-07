import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRadicado extends Document {
  _id: Types.ObjectId;
  consecutivo: string;
  fechaRadicado: Date;
  fechaOficio: Date;
  tipoOficio: string;
  asunto: string;
  resumen: string;
  observaciones?: string;
  destinatario: string;
  cargoDestinatario?: string;
  entidadDestinatario?: string;
  emailDestinatario?: string;
  remitente?: string;
  cargoRemitente?: string;
  entidadRemitente?: string;
  estado: 'borrador' | 'enviado' | 'recibido' | 'archivado';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  categoria: string;
  proyectoId?: Types.ObjectId;
  requiereRespuesta: boolean;
  fechaVencimiento?: Date;
  esConfidencial: boolean;
  creadoPor: Types.ObjectId;
  fechaCreacion: Date;
  fechaModificacion: Date;
  activo: boolean;
  version: number;
  
  // Métodos virtuales y de instancia
  eliminarSoft(): Promise<IRadicado>;
}

const RadicadoSchema = new Schema<IRadicado>({
  consecutivo: {
    type: String,
    unique: true,
    maxLength: 50
  },
  fechaRadicado: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaOficio: {
    type: Date,
    required: true
  },
  tipoOficio: {
    type: String,
    required: true,
    enum: ['Oficio', 'Circular', 'Memorando', 'Comunicación', 'Resolución', 'Otro'],
    default: 'Oficio'
  },
  asunto: {
    type: String,
    required: true,
    maxLength: 500
  },
  resumen: {
    type: String,
    required: true,
    maxLength: 2000
  },
  observaciones: {
    type: String,
    maxLength: 1000
  },
  destinatario: {
    type: String,
    required: true,
    maxLength: 200
  },
  cargoDestinatario: {
    type: String,
    maxLength: 200
  },
  entidadDestinatario: {
    type: String,
    maxLength: 200
  },
  emailDestinatario: {
    type: String,
    maxLength: 100
  },
  remitente: {
    type: String,
    maxLength: 200
  },
  cargoRemitente: {
    type: String,
    maxLength: 200
  },
  entidadRemitente: {
    type: String,
    maxLength: 200
  },
  estado: {
    type: String,
    enum: ['borrador', 'enviado', 'recibido', 'archivado'],
    default: 'borrador',
    required: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media',
    required: true
  },
  categoria: {
    type: String,
    required: true,
    maxLength: 100
  },
  proyectoId: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto'
  },
  requiereRespuesta: {
    type: Boolean,
    default: false
  },
  fechaVencimiento: {
    type: Date
  },
  esConfidencial: {
    type: Boolean,
    default: false
  },
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaModificacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaModificacion' },
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Índices para optimizar consultas (consecutivo ya tiene unique: true)
RadicadoSchema.index({ creadoPor: 1, activo: 1 });
RadicadoSchema.index({ estado: 1, activo: 1 });
RadicadoSchema.index({ prioridad: 1, activo: 1 });
RadicadoSchema.index({ fechaRadicado: -1 });
RadicadoSchema.index({ fechaVencimiento: 1 });
RadicadoSchema.index({ categoria: 1 });
RadicadoSchema.index({ proyectoId: 1 });

// Virtual para verificar si está vencido
RadicadoSchema.virtual('estaVencido').get(function() {
  if (!this.fechaVencimiento || !this.requiereRespuesta) return false;
  return new Date() > this.fechaVencimiento && this.estado !== 'archivado';
});

// Virtual para obtener días restantes
RadicadoSchema.virtual('diasRestantes').get(function() {
  if (!this.fechaVencimiento || !this.requiereRespuesta) return null;
  const diff = this.fechaVencimiento.getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Método para eliminación suave
RadicadoSchema.methods.eliminarSoft = function(): Promise<IRadicado> {
  this.activo = false;
  this.fechaModificacion = new Date();
  return this.save();
};

// Hook para actualizar fechaModificacion
RadicadoSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaModificacion = new Date();
  }
  
  // Generar consecutivo automático si no existe
  if (this.isNew && !this.consecutivo) {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    this.consecutivo = `RAD-${year}-${timestamp}`;
  }
  
  next();
});

// Hook para validar fecha de vencimiento
RadicadoSchema.pre('save', function(next) {
  if (this.requiereRespuesta && !this.fechaVencimiento) {
    const error = new Error('Los radicados que requieren respuesta deben tener fecha de vencimiento');
    return next(error);
  }
  next();
});

// Método estático para buscar por usuario
RadicadoSchema.statics.buscarPorUsuario = function(userId: Types.ObjectId, filtros = {}) {
  return this.find({
    creadoPor: userId,
    activo: true,
    ...filtros
  })
  .populate('creadoPor', 'nombre email')
  .populate('proyectoId', 'nombre codigo')
  .sort({ fechaRadicado: -1 });
};

// Método estático para buscar radicados vencidos
RadicadoSchema.statics.buscarVencidos = function() {
  return this.find({
    activo: true,
    requiereRespuesta: true,
    fechaVencimiento: { $lt: new Date() },
    estado: { $ne: 'archivado' }
  })
  .populate('creadoPor', 'nombre email')
  .sort({ fechaVencimiento: 1 });
};

const Radicado = mongoose.models.Radicado || mongoose.model<IRadicado>('Radicado', RadicadoSchema);

export default Radicado;