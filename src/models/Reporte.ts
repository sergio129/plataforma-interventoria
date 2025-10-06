import mongoose, { Schema, Document } from 'mongoose';

// Enums para reportes de interventoría
export enum TipoReporte {
  AVANCE_OBRA = 'avance_obra',
  CALIDAD = 'calidad',
  SEGURIDAD = 'seguridad',
  CUMPLIMIENTO = 'cumplimiento',
  FINANCIERO = 'financiero',
  INCIDENCIA = 'incidencia',
  SEGUIMIENTO = 'seguimiento',
  OTROS = 'otros'
}

export enum EstadoReporte {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  REVISION = 'revision',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado'
}

export enum SeveridadIncidencia {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}

// Interfaces para sub-documentos
export interface IHallazgo {
  descripcion: string;
  categoria: string;
  severidad: SeveridadIncidencia;
  ubicacion?: string;
  fechaDeteccion: Date;
  evidencias: string[]; // URLs o referencias a archivos
  accionesCorrectivas?: string;
  responsable?: mongoose.Types.ObjectId;
  fechaCorreccion?: Date;
  estadoCorreccion: 'pendiente' | 'en_proceso' | 'corregido' | 'no_procede';
}

export interface IAvanceActividad {
  actividad: string;
  porcentajeProgramado: number;
  porcentajeReal: number;
  fechaProgramada: Date;
  fechaReal?: Date;
  observaciones?: string;
  responsable?: mongoose.Types.ObjectId;
}

export interface IRecurso {
  tipo: 'personal' | 'maquinaria' | 'material';
  descripcion: string;
  cantidadProgramada: number;
  cantidadReal: number;
  unidad: string;
  costo?: number;
  observaciones?: string;
}

// Interface principal para Reporte
export interface IReporte extends Document {
  numero: string;
  titulo: string;
  descripcion: string;
  tipoReporte: TipoReporte;
  estado: EstadoReporte;
  
  // Proyecto y periodo
  proyecto: mongoose.Types.ObjectId;
  fechaInicio: Date;
  fechaFin: Date;
  fechaReporte: Date;
  
  // Participantes
  interventor: mongoose.Types.ObjectId;
  supervisor?: mongoose.Types.ObjectId;
  contratista: mongoose.Types.ObjectId;
  
  // Contenido del reporte
  resumenEjecutivo?: string;
  avanceGeneral: {
    porcentajeProgramado: number;
    porcentajeReal: number;
    diasTranscurridos: number;
    diasProgramados: number;
    observaciones?: string;
  };
  
  // Actividades y avances
  actividades: IAvanceActividad[];
  
  // Recursos utilizados
  recursos: IRecurso[];
  
  // Hallazgos y observaciones
  hallazgos: IHallazgo[];
  
  // Aspectos específicos según tipo de reporte
  aspectosCalidad?: {
    cumpleEspecificaciones: boolean;
    pruebasRealizadas: string[];
    resultadosPruebas: string;
    recomendaciones?: string;
  };
  
  aspectosSeguridad?: {
    incidentesReportados: number;
    capacitacionesRealizadas: string[];
    equiposSeguridad: boolean;
    observacionesSeguridad?: string;
  };
  
  aspectosFinancieros?: {
    valorEjecutado: number;
    valorProgramado: number;
    desviacionPresupuestal: number;
    justificacionDesvios?: string;
  };
  
  // Conclusiones y recomendaciones
  conclusiones: string;
  recomendaciones?: string;
  proximasActividades?: string[];
  
  // Archivos adjuntos
  archivosAdjuntos: mongoose.Types.ObjectId[];
  fotografias: mongoose.Types.ObjectId[];
  
  // Aprobaciones
  aprobaciones: {
    usuario: mongoose.Types.ObjectId;
    fecha: Date;
    estado: 'aprobado' | 'rechazado' | 'revision';
    comentarios?: string;
  }[];
  
  // Metadatos
  fechaCreacion: Date;
  fechaActualizacion: Date;
  creadoPor: mongoose.Types.ObjectId;
  modificadoPor?: mongoose.Types.ObjectId;
  
  // Control de versiones
  version: string;
  esVersionActual: boolean;
  reportePadre?: mongoose.Types.ObjectId;
  
  // Configuración
  esConfidencial: boolean;
  fechaVencimiento?: Date;
  requiereRevision: boolean;
}

// Schemas para sub-documentos
const HallazgoSchema = new Schema({
  descripcion: { type: String, required: true, trim: true },
  categoria: { type: String, required: true, trim: true },
  severidad: {
    type: String,
    enum: Object.values(SeveridadIncidencia),
    required: true
  },
  ubicacion: { type: String, trim: true },
  fechaDeteccion: { type: Date, default: Date.now },
  evidencias: [{ type: String, trim: true }],
  accionesCorrectivas: { type: String, trim: true },
  responsable: { type: Schema.Types.ObjectId, ref: 'Usuario' },
  fechaCorreccion: { type: Date },
  estadoCorreccion: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'corregido', 'no_procede'],
    default: 'pendiente'
  }
});

const AvanceActividadSchema = new Schema({
  actividad: { type: String, required: true, trim: true },
  porcentajeProgramado: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  porcentajeReal: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  fechaProgramada: { type: Date, required: true },
  fechaReal: { type: Date },
  observaciones: { type: String, trim: true },
  responsable: { type: Schema.Types.ObjectId, ref: 'Usuario' }
});

const RecursoSchema = new Schema({
  tipo: {
    type: String,
    enum: ['personal', 'maquinaria', 'material'],
    required: true
  },
  descripcion: { type: String, required: true, trim: true },
  cantidadProgramada: { type: Number, required: true, min: 0 },
  cantidadReal: { type: Number, required: true, min: 0 },
  unidad: { type: String, required: true, trim: true },
  costo: { type: Number, min: 0 },
  observaciones: { type: String, trim: true }
});

const AprobacionReporteSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: ['aprobado', 'rechazado', 'revision'],
    required: true
  },
  comentarios: { type: String, trim: true }
});

// Schema principal para Reporte
const ReporteSchema: Schema = new Schema({
  numero: {
    type: String,
    required: [true, 'El número de reporte es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  tipoReporte: {
    type: String,
    enum: Object.values(TipoReporte),
    required: [true, 'El tipo de reporte es requerido']
  },
  estado: {
    type: String,
    enum: Object.values(EstadoReporte),
    default: EstadoReporte.BORRADOR
  },
  
  // Proyecto y periodo
  proyecto: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: [true, 'El proyecto es requerido']
  },
  fechaInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  fechaFin: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  fechaReporte: {
    type: Date,
    default: Date.now
  },
  
  // Participantes
  interventor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El interventor es requerido']
  },
  supervisor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  contratista: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El contratista es requerido']
  },
  
  // Contenido del reporte
  resumenEjecutivo: {
    type: String,
    trim: true,
    maxlength: [2000, 'El resumen ejecutivo no puede exceder 2000 caracteres']
  },
  avanceGeneral: {
    porcentajeProgramado: { type: Number, required: true, min: 0, max: 100 },
    porcentajeReal: { type: Number, required: true, min: 0, max: 100 },
    diasTranscurridos: { type: Number, required: true, min: 0 },
    diasProgramados: { type: Number, required: true, min: 0 },
    observaciones: { type: String, trim: true }
  },
  
  // Arrays de sub-documentos
  actividades: [AvanceActividadSchema],
  recursos: [RecursoSchema],
  hallazgos: [HallazgoSchema],
  
  // Aspectos específicos
  aspectosCalidad: {
    cumpleEspecificaciones: { type: Boolean },
    pruebasRealizadas: [{ type: String, trim: true }],
    resultadosPruebas: { type: String, trim: true },
    recomendaciones: { type: String, trim: true }
  },
  
  aspectosSeguridad: {
    incidentesReportados: { type: Number, min: 0, default: 0 },
    capacitacionesRealizadas: [{ type: String, trim: true }],
    equiposSeguridad: { type: Boolean },
    observacionesSeguridad: { type: String, trim: true }
  },
  
  aspectosFinancieros: {
    valorEjecutado: { type: Number, min: 0 },
    valorProgramado: { type: Number, min: 0 },
    desviacionPresupuestal: { type: Number },
    justificacionDesvios: { type: String, trim: true }
  },
  
  // Conclusiones
  conclusiones: {
    type: String,
    required: [true, 'Las conclusiones son requeridas'],
    trim: true,
    maxlength: [2000, 'Las conclusiones no pueden exceder 2000 caracteres']
  },
  recomendaciones: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las recomendaciones no pueden exceder 2000 caracteres']
  },
  proximasActividades: [{
    type: String,
    trim: true
  }],
  
  // Archivos
  archivosAdjuntos: [{
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  }],
  fotografias: [{
    type: Schema.Types.ObjectId,
    ref: 'Documento'
  }],
  
  // Aprobaciones
  aprobaciones: [AprobacionReporteSchema],
  
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
  modificadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  
  // Control de versiones
  version: {
    type: String,
    default: '1.0'
  },
  esVersionActual: {
    type: Boolean,
    default: true
  },
  reportePadre: {
    type: Schema.Types.ObjectId,
    ref: 'Reporte'
  },
  
  // Configuración
  esConfidencial: {
    type: Boolean,
    default: false
  },
  fechaVencimiento: {
    type: Date
  },
  requiereRevision: {
    type: Boolean,
    default: true
  }
});

// Middleware para actualizar fechaActualizacion
ReporteSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Validación para fechas
ReporteSchema.pre('save', function(next) {
  if (this.fechaFin <= this.fechaInicio) {
    next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  next();
});

// Middleware para generar número automático si no se proporciona
ReporteSchema.pre('save', function(next) {
  if (this.isNew && !this.numero) {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numero = `RPT-${año}${mes}${dia}-${random}`;
  }
  next();
});

// Índices
ReporteSchema.index({ numero: 1 });
ReporteSchema.index({ titulo: 'text', descripcion: 'text', conclusiones: 'text' });
ReporteSchema.index({ tipoReporte: 1 });
ReporteSchema.index({ estado: 1 });
ReporteSchema.index({ proyecto: 1 });
ReporteSchema.index({ interventor: 1 });
ReporteSchema.index({ contratista: 1 });
ReporteSchema.index({ fechaReporte: -1 });
ReporteSchema.index({ fechaCreacion: -1 });
ReporteSchema.index({ 'hallazgos.severidad': 1 });
ReporteSchema.index({ 'aprobaciones.usuario': 1 });
ReporteSchema.index({ 'aprobaciones.estado': 1 });

// Índices compuestos
ReporteSchema.index({ proyecto: 1, tipoReporte: 1, fechaReporte: -1 });
ReporteSchema.index({ proyecto: 1, estado: 1, fechaCreacion: -1 });
ReporteSchema.index({ interventor: 1, estado: 1, fechaReporte: -1 });

export const Reporte = mongoose.model<IReporte>('Reporte', ReporteSchema);