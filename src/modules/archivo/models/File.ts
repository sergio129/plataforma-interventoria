import mongoose, { Schema, Document } from 'mongoose';

// Interface para archivos
export interface IFile extends Document {
  // Información básica del archivo
  nombreOriginal: string;
  nombreArchivo: string; // Nombre único generado
  gridfsId: mongoose.Types.ObjectId; // ID del archivo en GridFS
  tamaño: number; // en bytes
  tipoMime: string;
  extension: string;
  
  // Metadatos
  descripcion?: string;
  categoria: string; // "oficio", "evidencia", "adjunto"
  
  // Relaciones
  radicadoId?: mongoose.Types.ObjectId;
  creadoPor: mongoose.Types.ObjectId;
  
  // Fechas importantes
  fechaSubida: Date;
  fechaModificacion: Date;
  
  // Control de acceso
  esConfidencial: boolean;
  usuariosAutorizados: mongoose.Types.ObjectId[];
  
  // Información adicional
  checksum?: string; // Para verificar integridad
  version: number;
  activo: boolean;
  
  // Virtuals
  tamañoFormateado: string;
  esImagen: boolean;
  esPDF: boolean;
  
  // Métodos de instancia
  eliminarSoft(): Promise<IFile>;
  tieneAcceso(usuarioId: string): boolean;
}

// Schema para archivos
const FileSchema: Schema = new Schema({
  nombreOriginal: {
    type: String,
    required: [true, 'El nombre original es requerido'],
    trim: true
  },
  nombreArchivo: {
    type: String,
    required: [true, 'El nombre del archivo es requerido'],
    unique: true,
    trim: true
  },
  gridfsId: {
    type: Schema.Types.ObjectId,
    required: [true, 'El ID de GridFS es requerido'],
    unique: true,
    index: true
  },
  tamaño: {
    type: Number,
    required: [true, 'El tamaño del archivo es requerido'],
    min: [0, 'El tamaño no puede ser negativo']
  },
  tipoMime: {
    type: String,
    required: [true, 'El tipo MIME es requerido'],
    trim: true
  },
  extension: {
    type: String,
    required: [true, 'La extensión es requerida'],
    trim: true,
    lowercase: true
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: ['oficio', 'evidencia', 'adjunto', 'respaldo'],
    default: 'adjunto'
  },
  radicadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Radicado',
    index: true
  },
  creadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El usuario creador es requerido'],
    index: true
  },
  fechaSubida: {
    type: Date,
    default: Date.now,
    index: true
  },
  fechaModificacion: {
    type: Date,
    default: Date.now
  },
  esConfidencial: {
    type: Boolean,
    default: false,
    index: true
  },
  usuariosAutorizados: [{
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  }],
  checksum: {
    type: String,
    trim: true
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'La versión debe ser al menos 1']
  },
  activo: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: { createdAt: 'fechaSubida', updatedAt: 'fechaModificacion' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
FileSchema.index({ radicadoId: 1, categoria: 1 });
FileSchema.index({ creadoPor: 1, fechaSubida: -1 });
FileSchema.index({ categoria: 1, esConfidencial: 1 });

// Virtual para el tamaño formateado
FileSchema.virtual('tamañoFormateado').get(function() {
  const bytes = this.tamaño;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual para verificar si es imagen
FileSchema.virtual('esImagen').get(function() {
  const tiposImagen = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return tiposImagen.includes(this.tipoMime);
});

// Virtual para verificar si es PDF
FileSchema.virtual('esPDF').get(function() {
  return this.tipoMime === 'application/pdf';
});

// Middleware pre-save
FileSchema.pre('save', function(next) {
  this.fechaModificacion = new Date();
  next();
});

// Método estático para obtener archivos por radicado
FileSchema.statics.obtenerPorRadicado = function(radicadoId: string, categoria?: string) {
  const filtros: any = { radicadoId, activo: true };
  if (categoria) filtros.categoria = categoria;
  
  return this.find(filtros)
    .populate('creadoPor', 'nombre email')
    .sort({ fechaSubida: -1 });
};

// Método estático para limpiar archivos huérfanos
FileSchema.statics.limpiarHuerfanos = function() {
  return this.deleteMany({ 
    radicadoId: { $exists: false },
    fechaSubida: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Más de 24 horas
  });
};

// Método de instancia para marcar como eliminado
FileSchema.methods.eliminarSoft = function() {
  this.activo = false;
  return this.save();
};

// Método de instancia para verificar acceso
FileSchema.methods.tieneAcceso = function(usuarioId: string) {
  if (!this.esConfidencial) return true;
  
  return this.usuariosAutorizados.some((id: any) => 
    id.toString() === usuarioId.toString()
  );
};

const File = mongoose.model<IFile>('File', FileSchema);

export default File;