import mongoose, { Schema, Document } from 'mongoose';

// Enums para documentos
export enum TipoDocumento {
  CONTRATO = 'contrato',
  PLANO = 'plano',
  ESPECIFICACION = 'especificacion',
  INFORME = 'informe',
  ACTA = 'acta',
  FACTURA = 'factura',
  CERTIFICADO = 'certificado',
  FOTOGRAFIA = 'fotografia',
  VIDEO = 'video',
  OTROS = 'otros'
}

export enum EstadoDocumento {
  BORRADOR = 'borrador',
  REVISION = 'revision',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  OBSOLETO = 'obsoleto'
}

export enum VisibilidadDocumento {
  PUBLICO = 'publico',
  PRIVADO = 'privado',
  RESTRINGIDO = 'restringido'
}

// Interface para versionado
export interface IVersion {
  numero: string;
  descripcionCambios: string;
  fecha: Date;
  autor: mongoose.Types.ObjectId;
  tamañoBytes: number;
  rutaArchivo: string;
  hashArchivo: string;
}

// Interface para aprobaciones
export interface IAprobacion {
  usuario: mongoose.Types.ObjectId;
  fecha: Date;
  estado: 'aprobado' | 'rechazado' | 'revision';
  comentarios?: string;
}

// Interface principal para Documento
export interface IDocumento extends Document {
  nombre: string;
  descripcion?: string;
  tipoDocumento: TipoDocumento;
  estado: EstadoDocumento;
  visibilidad: VisibilidadDocumento;
  
  // Archivo
  nombreArchivo: string;
  rutaArchivo: string;
  tamañoBytes: number;
  tipoMime: string;
  hashArchivo: string;
  
  // Proyecto relacionado
  proyecto: mongoose.Types.ObjectId;
  
  // Versionado
  version: string;
  versiones: IVersion[];
  esVersionActual: boolean;
  documentoPadre?: mongoose.Types.ObjectId;
  
  // Aprobaciones y revisiones
  requiereAprobacion: boolean;
  aprobaciones: IAprobacion[];
  fechaVencimiento?: Date;
  
  // Metadatos
  tags: string[];
  palabrasClave: string[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  creadoPor: mongoose.Types.ObjectId;
  modificadoPor?: mongoose.Types.ObjectId;
  
  // Acceso y seguridad
  usuariosPermitidos: mongoose.Types.ObjectId[];
  descargas: {
    usuario: mongoose.Types.ObjectId;
    fecha: Date;
    ip?: string;
  }[];
  
  // Observaciones
  observaciones?: string;
}

// Schema para sub-documentos
const VersionSchema = new Schema({
  numero: { type: String, required: true },
  descripcionCambios: { type: String, required: true, trim: true },
  fecha: { type: Date, default: Date.now },
  autor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tamañoBytes: { type: Number, required: true, min: 0 },
  rutaArchivo: { type: String, required: true },
  hashArchivo: { type: String, required: true }
});

const AprobacionSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  estado: { 
    type: String, 
    enum: ['aprobado', 'rechazado', 'revision'], 
    required: true 
  },
  comentarios: { type: String, trim: true }
});

const DescargaSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  ip: { type: String, trim: true }
});

// Schema principal para Documento
const DocumentoSchema: Schema = new Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del documento es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  tipoDocumento: {
    type: String,
    enum: Object.values(TipoDocumento),
    required: [true, 'El tipo de documento es requerido']
  },
  estado: {
    type: String,
    enum: Object.values(EstadoDocumento),
    default: EstadoDocumento.BORRADOR
  },
  visibilidad: {
    type: String,
    enum: Object.values(VisibilidadDocumento),
    default: VisibilidadDocumento.PRIVADO
  },
  
  // Archivo
  nombreArchivo: {
    type: String,
    required: [true, 'El nombre del archivo es requerido'],
    trim: true
  },
  rutaArchivo: {
    type: String,
    required: [true, 'La ruta del archivo es requerida'],
    trim: true
  },
  tamañoBytes: {
    type: Number,
    required: [true, 'El tamaño del archivo es requerido'],
    min: [0, 'El tamaño debe ser positivo']
  },
  tipoMime: {
    type: String,
    required: [true, 'El tipo MIME es requerido'],
    trim: true
  },
  hashArchivo: {
    type: String,
    required: [true, 'El hash del archivo es requerido'],
    trim: true
  },
  
  // Proyecto relacionado
  proyecto: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: [true, 'El proyecto es requerido']
  },
  
  // Versionado
  version: {
    type: String,
    required: [true, 'La versión es requerida'],
    default: '1.0'
  },
  versiones: [VersionSchema],
  esVersionActual: {
    type: Boolean,
    default: true
  },
  documentoPadre: {
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  },
  
  // Aprobaciones
  requiereAprobacion: {
    type: Boolean,
    default: false
  },
  aprobaciones: [AprobacionSchema],
  fechaVencimiento: {
    type: Date
  },
  
  // Metadatos
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Los tags no pueden exceder 50 caracteres']
  }],
  palabrasClave: [{
    type: String,
    trim: true,
    lowercase: true
  }],
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
  modificadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  
  // Acceso y seguridad
  usuariosPermitidos: [{
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  descargas: [DescargaSchema],
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  }
});

// Middleware para actualizar fechaActualizacion
DocumentoSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Middleware para agregar versión al historial
DocumentoSchema.pre('save', function(next) {
  if (this.isModified('rutaArchivo') && !this.isNew) {
    const nuevaVersion: IVersion = {
      numero: this.version,
      descripcionCambios: 'Actualización automática',
      fecha: new Date(),
      autor: this.modificadoPor || this.creadoPor,
      tamañoBytes: this.tamañoBytes,
      rutaArchivo: this.rutaArchivo,
      hashArchivo: this.hashArchivo
    };
    this.versiones.push(nuevaVersion);
  }
  next();
});

// Validación para fechas de vencimiento
DocumentoSchema.pre('save', function(next) {
  if (this.fechaVencimiento && this.fechaVencimiento <= new Date()) {
    next(new Error('La fecha de vencimiento debe ser futura'));
  }
  next();
});

// Índices
DocumentoSchema.index({ nombre: 'text', descripcion: 'text', palabrasClave: 'text' });
DocumentoSchema.index({ tipoDocumento: 1 });
DocumentoSchema.index({ estado: 1 });
DocumentoSchema.index({ visibilidad: 1 });
DocumentoSchema.index({ proyecto: 1 });
DocumentoSchema.index({ creadoPor: 1 });
DocumentoSchema.index({ fechaCreacion: -1 });
DocumentoSchema.index({ fechaActualizacion: -1 });
DocumentoSchema.index({ tags: 1 });
DocumentoSchema.index({ hashArchivo: 1 });
DocumentoSchema.index({ 'aprobaciones.usuario': 1 });
DocumentoSchema.index({ 'aprobaciones.estado': 1 });
DocumentoSchema.index({ fechaVencimiento: 1 });

// Índice compuesto para búsquedas frecuentes
DocumentoSchema.index({ proyecto: 1, tipoDocumento: 1, estado: 1 });
DocumentoSchema.index({ proyecto: 1, fechaCreacion: -1 });

export const Documento = mongoose.models.Documento || mongoose.model<IDocumento>('Documento', DocumentoSchema);