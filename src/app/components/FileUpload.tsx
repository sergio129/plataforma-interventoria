'use client';
import React, { useState, useRef } from 'react';

interface FileUploadProps {
  radicadoId?: string;
  categoria?: string;
  esConfidencial?: boolean;
  onUploadSuccess?: (file: any) => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string[];
  maxSize?: number; // en MB
  multiple?: boolean;
}

interface UploadProgress {
  [key: string]: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  radicadoId,
  categoria = 'adjunto',
  esConfidencial = false,
  onUploadSuccess,
  onUploadError,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'],
  maxSize = 10,
  multiple = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [descripcion, setDescripcion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const validateFile = (file: File): string | null => {
    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      return `El archivo "${file.name}" excede el tamaño máximo de ${maxSize}MB`;
    }

    // Validar tipo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `Tipo de archivo no permitido: ${fileExtension}. Tipos permitidos: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = (files: FileList) => {
    const filesToUpload = Array.from(files);

    // Validar archivos
    for (const file of filesToUpload) {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }
    }

    // Si no es múltiple, solo tomar el primer archivo
    const finalFiles = multiple ? filesToUpload : [filesToUpload[0]];
    
    finalFiles.forEach(uploadFile);
  };

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoria', categoria);
      formData.append('descripcion', descripcion || file.name);
      formData.append('esConfidencial', esConfidencial.toString());
      
      if (radicadoId) {
        formData.append('radicadoId', radicadoId);
      }

      // Simular progreso (en un caso real, usarías XMLHttpRequest para progreso real)
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileId] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [fileId]: current + 10 };
        });
      }, 200);

      const response = await fetch('/api/archivo/files', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error subiendo archivo');
      }

      const result = await response.json();
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);

      onUploadSuccess?.(result.data);
      
      // Limpiar formulario
      setDescripcion('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      onUploadError?.(error.message || 'Error desconocido al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload-container">
      {/* Zona de drag & drop */}
      <div
        className={`file-upload-dropzone ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
        />
        
        <div className="file-upload-content">
          <div className="file-upload-icon">
            {uploading ? '⏳' : '📁'}
          </div>
          <div className="file-upload-text">
            <p><strong>Arrastra archivos aquí o haz clic para seleccionar</strong></p>
            <p>Tipos permitidos: {acceptedTypes.join(', ')}</p>
            <p>Tamaño máximo: {maxSize}MB</p>
          </div>
        </div>
      </div>

      {/* Campo de descripción */}
      <div className="file-upload-description">
        <label htmlFor="descripcion">Descripción (opcional):</label>
        <input
          id="descripcion"
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción del archivo..."
          maxLength={500}
        />
      </div>

      {/* Indicadores de progreso */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="file-upload-progress">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="progress-item">
              <div className="progress-label">{fileId.split('-')[0]}</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .file-upload-container {
          width: 100%;
          margin-bottom: 1rem;
        }

        .file-upload-dropzone {
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #f7fafc;
        }

        .file-upload-dropzone:hover,
        .file-upload-dropzone.active {
          border-color: #4299e1;
          background-color: #ebf8ff;
        }

        .file-upload-dropzone.uploading {
          border-color: #48bb78;
          background-color: #f0fff4;
          cursor: not-allowed;
        }

        .file-upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .file-upload-icon {
          font-size: 3rem;
        }

        .file-upload-text p {
          margin: 0.25rem 0;
          color: #4a5568;
        }

        .file-upload-description {
          margin-top: 1rem;
        }

        .file-upload-description label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2d3748;
        }

        .file-upload-description input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .file-upload-progress {
          margin-top: 1rem;
          space-y: 0.5rem;
        }

        .progress-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
          background-color: #f7fafc;
          border-radius: 4px;
        }

        .progress-label {
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 150px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background-color: #48bb78;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.75rem;
          font-weight: 500;
          min-width: 40px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default FileUpload;