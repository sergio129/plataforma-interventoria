'use client';
import React, { useState, useEffect } from 'react';

interface FileItem {
  _id: string;
  nombreOriginal: string;
  nombreArchivo: string;
  tamaño: number;
  tipoMime: string;
  extension: string;
  descripcion?: string;
  categoria: string;
  fechaSubida: string;
  esConfidencial: boolean;
  esImagen: boolean;
  esPDF: boolean;
  tamañoFormateado: string;
  creadoPor: {
    nombre: string;
    email: string;
  };
}

interface FileListProps {
  radicadoId?: string;
  categoria?: string;
  editable?: boolean;
  onFileDelete?: (fileId: string) => void;
  onFileUpdate?: (file: FileItem) => void;
  refreshTrigger?: number;
}

const FileList: React.FC<FileListProps> = ({
  radicadoId,
  categoria,
  editable = false,
  onFileDelete,
  onFileUpdate,
  refreshTrigger = 0
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    descripcion: '',
    categoria: '',
    esConfidencial: false
  });

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (radicadoId) params.append('radicadoId', radicadoId);
      if (categoria) params.append('categoria', categoria);

      const response = await fetch(`/api/archivo/files?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar archivos');
      }

      const result = await response.json();
      if (result.success) {
        setFiles(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [radicadoId, categoria, refreshTrigger]);

  const handleDownload = (file: FileItem) => {
    window.open(`/api/archivo/files/${file._id}?action=download`, '_blank');
  };

  const handleView = (file: FileItem) => {
    if (file.esImagen || file.esPDF) {
      window.open(`/api/archivo/files/${file._id}?action=view`, '_blank');
    } else {
      handleDownload(file);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${file.nombreOriginal}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/archivo/files/${file._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar archivo');
      }

      // Actualizar lista local
      setFiles(files.filter(f => f._id !== file._id));
      onFileDelete?.(file._id);
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const startEdit = (file: FileItem) => {
    setEditingFile(file._id);
    setEditForm({
      descripcion: file.descripcion || '',
      categoria: file.categoria,
      esConfidencial: file.esConfidencial
    });
  };

  const cancelEdit = () => {
    setEditingFile(null);
    setEditForm({ descripcion: '', categoria: '', esConfidencial: false });
  };

  const saveEdit = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/archivo/files/${file._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar archivo');
      }

      const result = await response.json();
      
      // Actualizar lista local
      setFiles(files.map(f => f._id === file._id ? { ...f, ...editForm } : f));
      onFileUpdate?.(result.data);
      setEditingFile(null);
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.esImagen) return '🖼️';
    if (file.esPDF) return '📄';
    if (file.extension === 'doc' || file.extension === 'docx') return '📝';
    return '📁';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="file-list-loading">
        <div className="spinner"></div>
        <p>Cargando archivos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-list-error">
        <p>❌ {error}</p>
        <button onClick={fetchFiles} className="retry-button">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-list-empty">
        <p>📁 No hay archivos disponibles</p>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <h3>Archivos ({files.length})</h3>
      
      <div className="file-list">
        {files.map((file) => (
          <div key={file._id} className="file-item">
            {editingFile === file._id ? (
              // Modo edición
              <div className="file-edit">
                <div className="file-edit-header">
                  <span className="file-icon">{getFileIcon(file)}</span>
                  <span className="file-name">{file.nombreOriginal}</span>
                </div>
                
                <div className="file-edit-form">
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  />
                  
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                  >
                    <option value="oficio">Oficio</option>
                    <option value="evidencia">Evidencia</option>
                    <option value="adjunto">Adjunto</option>
                    <option value="respaldo">Respaldo</option>
                  </select>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editForm.esConfidencial}
                      onChange={(e) => setEditForm({ ...editForm, esConfidencial: e.target.checked })}
                    />
                    Confidencial
                  </label>
                </div>
                
                <div className="file-edit-actions">
                  <button onClick={() => saveEdit(file)} className="save-button">
                    ✅ Guardar
                  </button>
                  <button onClick={cancelEdit} className="cancel-button">
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            ) : (
              // Modo visualización
              <div className="file-display">
                <div className="file-header">
                  <span className="file-icon">{getFileIcon(file)}</span>
                  <div className="file-info">
                    <h4 className="file-name">{file.nombreOriginal}</h4>
                    <div className="file-metadata">
                      <span className="file-size">{file.tamañoFormateado}</span>
                      <span className="file-date">{formatDate(file.fechaSubida)}</span>
                      <span className="file-author">por {file.creadoPor.nombre}</span>
                    </div>
                  </div>
                  
                  <div className="file-badges">
                    <span className={`badge badge-${file.categoria}`}>
                      {file.categoria}
                    </span>
                    {file.esConfidencial && (
                      <span className="badge badge-confidential">🔒 Confidencial</span>
                    )}
                  </div>
                </div>
                
                {file.descripcion && (
                  <p className="file-description">{file.descripcion}</p>
                )}
                
                <div className="file-actions">
                  <button 
                    onClick={() => handleView(file)} 
                    className="action-button view-button"
                    title={file.esImagen || file.esPDF ? 'Ver archivo' : 'Descargar archivo'}
                  >
                    {file.esImagen || file.esPDF ? '👁️ Ver' : '⬇️ Descargar'}
                  </button>
                  
                  <button 
                    onClick={() => handleDownload(file)} 
                    className="action-button download-button"
                    title="Descargar archivo"
                  >
                    💾 Descargar
                  </button>
                  
                  {editable && (
                    <>
                      <button 
                        onClick={() => startEdit(file)} 
                        className="action-button edit-button"
                        title="Editar archivo"
                      >
                        ✏️ Editar
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(file)} 
                        className="action-button delete-button"
                        title="Eliminar archivo"
                      >
                        🗑️ Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .file-list-container {
          margin-top: 1rem;
        }

        .file-list-container h3 {
          margin-bottom: 1rem;
          color: #2d3748;
        }

        .file-list-loading,
        .file-list-error,
        .file-list-empty {
          text-align: center;
          padding: 2rem;
          color: #4a5568;
        }

        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #4299e1;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-button {
          background-color: #4299e1;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .file-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          background-color: white;
        }

        .file-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .file-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
        }

        .file-metadata {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #4a5568;
        }

        .file-badges {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          align-items: flex-end;
        }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .badge-oficio { background-color: #bee3f8; color: #2b6cb0; }
        .badge-evidencia { background-color: #c6f6d5; color: #276749; }
        .badge-adjunto { background-color: #fbb6ce; color: #97266d; }
        .badge-respaldo { background-color: #faf089; color: #744210; }
        .badge-confidential { background-color: #feb2b2; color: #742a2a; }

        .file-description {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background-color: #f7fafc;
          border-radius: 4px;
          font-size: 0.875rem;
          color: #4a5568;
        }

        .file-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .action-button {
          padding: 0.375rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          background-color: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .action-button:hover {
          background-color: #f7fafc;
        }

        .view-button:hover { border-color: #4299e1; color: #4299e1; }
        .download-button:hover { border-color: #48bb78; color: #48bb78; }
        .edit-button:hover { border-color: #ed8936; color: #ed8936; }
        .delete-button:hover { border-color: #f56565; color: #f56565; }

        .file-edit {
          border: 2px solid #4299e1;
          border-radius: 4px;
          padding: 1rem;
          background-color: #ebf8ff;
        }

        .file-edit-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .file-edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .file-edit-form input,
        .file-edit-form select {
          padding: 0.5rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .file-edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .save-button {
          background-color: #48bb78;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .cancel-button {
          background-color: #f56565;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .file-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .file-badges {
            align-self: stretch;
            flex-direction: row;
            flex-wrap: wrap;
          }

          .file-metadata {
            flex-direction: column;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FileList;