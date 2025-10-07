import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

let bucket: GridFSBucket;

export function initGridFS() {
  if (mongoose.connection.readyState === 1) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'archivo_files'
    });
  } else {
    throw new Error('La conexión a MongoDB debe estar establecida antes de inicializar GridFS');
  }
}

export function getGridFSBucket(): GridFSBucket {
  if (!bucket) {
    initGridFS();
  }
  return bucket;
}

export interface GridFSFileMetadata {
  nombreOriginal: string;
  categoria: string;
  radicadoId?: string;
  creadoPor: string;
  esConfidencial: boolean;
  descripcion?: string;
  tipoMime: string;
  extension: string;
}

export class GridFSStorage {
  /**
   * Subir un archivo a GridFS
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    metadata: GridFSFileMetadata
  ): Promise<ObjectId> {
    const bucket = getGridFSBucket();
    
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(fileName, {
        metadata: {
          ...metadata,
          fechaSubida: new Date(),
          tamaño: fileBuffer.length
        }
      });

      uploadStream.on('error', (error: any) => {
        console.error('Error subiendo archivo a GridFS:', error);
        reject(error);
      });

      uploadStream.on('finish', () => {
        console.log('Archivo subido exitosamente a GridFS:', uploadStream.id);
        resolve(uploadStream.id);
      });

      // Escribir el buffer al stream
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Descargar un archivo de GridFS
   */
  static async downloadFile(fileId: string | ObjectId): Promise<Buffer> {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      const downloadStream = bucket.openDownloadStream(objectId);

      downloadStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      downloadStream.on('error', (error: any) => {
        console.error('Error descargando archivo de GridFS:', error);
        reject(error);
      });

      downloadStream.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        resolve(fileBuffer);
      });
    });
  }

  /**
   * Obtener información de un archivo
   */
  static async getFileInfo(fileId: string | ObjectId): Promise<any> {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    return new Promise((resolve, reject) => {
      const cursor = bucket.find({ _id: objectId });
      
      cursor.toArray().then((files: any[]) => {
        if (files.length === 0) {
          reject(new Error('Archivo no encontrado'));
        } else {
          resolve(files[0]);
        }
      }).catch(reject);
    });
  }

  /**
   * Eliminar un archivo de GridFS
   */
  static async deleteFile(fileId: string | ObjectId): Promise<void> {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    try {
      await bucket.delete(objectId);
      console.log('Archivo eliminado de GridFS:', objectId);
    } catch (error) {
      console.error('Error eliminando archivo de GridFS:', error);
      throw error;
    }
  }

  /**
   * Listar archivos con filtros
   */
  static async listFiles(filter: any = {}): Promise<any[]> {
    const bucket = getGridFSBucket();
    
    try {
      const cursor = bucket.find(filter);
      return await cursor.toArray();
    } catch (error) {
      console.error('Error listando archivos de GridFS:', error);
      throw error;
    }
  }

  /**
   * Verificar si un archivo existe
   */
  static async fileExists(fileId: string | ObjectId): Promise<boolean> {
    try {
      await this.getFileInfo(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener el tamaño de un archivo
   */
  static async getFileSize(fileId: string | ObjectId): Promise<number> {
    const fileInfo = await this.getFileInfo(fileId);
    return fileInfo.length;
  }

  /**
   * Crear un stream de descarga (útil para archivos grandes)
   */
  static createDownloadStream(fileId: string | ObjectId) {
    const bucket = getGridFSBucket();
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    return bucket.openDownloadStream(objectId);
  }
}