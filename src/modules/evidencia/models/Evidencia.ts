import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidencia extends Document {
  titulo: string;
  descripcion: string;
  categoria: string;
  fecha: Date;
  archivos: mongoose.Types.ObjectId[]; // Referencias a los archivos en la colección File
  creadoPor: mongoose.Types.ObjectId;
  eliminado: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const EvidenciaSchema: Schema = new Schema({
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
  categoria: { 
    type: String, 
    required: [true, 'La categoría es requerida'],
    enum: ['documentos', 'imagenes', 'videos', 'reportes', 'certificados', 'otros']
  },
  fecha: { 
    type: Date, 
    required: [true, 'La fecha es requerida'],
    default: Date.now 
  },
  archivos: [{
    type: Schema.Types.ObjectId,
    ref: 'File'
  }],
  creadoPor: { 
    type: Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true 
  },
  eliminado: { 
    type: Boolean, 
    default: false 
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Esto automáticamente maneja createdAt y updatedAt
});

// Middleware para actualizar fechaActualizacion
EvidenciaSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Índices para mejorar performance
EvidenciaSchema.index({ eliminado: 1, fecha: -1 });
EvidenciaSchema.index({ categoria: 1, eliminado: 1 });
EvidenciaSchema.index({ creadoPor: 1, eliminado: 1 });
EvidenciaSchema.index({ titulo: 'text', descripcion: 'text' });

export default mongoose.models.Evidencia || mongoose.model<IEvidencia>('Evidencia', EvidenciaSchema);
