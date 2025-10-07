import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidencia extends Document {
  titulo: string;
  descripcion: string;
  categoria: string;
  fechaCreacion: Date;
  archivo: string;
  creadoPor: mongoose.Types.ObjectId;
  permisos: {
    rol: string;
    puedeVer: boolean;
    puedeEditar: boolean;
  }[];
}

const EvidenciaSchema: Schema = new Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  categoria: { type: String, required: true },
  fechaCreacion: { type: Date, default: Date.now },
  archivo: { type: String, required: true },
  creadoPor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  permisos: [
    {
      rol: { type: String, required: true },
      puedeVer: { type: Boolean, default: false },
      puedeEditar: { type: Boolean, default: false },
    },
  ],
});

export default mongoose.model<IEvidencia>('Evidencia', EvidenciaSchema);