"use client";
import React, { useEffect, useState } from 'react';
import { useMenuGeneration } from '../hooks/useMenuGeneration';
import DynamicMenu from '../components/DynamicMenu';
import './evidencias.css';

interface Archivo {
  _id: string;
  nombreOriginal: string;
  tamaño: number;
  tipoMime?: string;
  tamañoFormateado?: string;
}

interface Evidencia {
  _id?: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  fecha: string;
  archivos: Archivo[];
  creadoPor?: {
    _id: string;
    nombre: string;
    apellido?: string;
  };
}

// Función para obtener el icono apropiado según el tipo de archivo
function getFileIcon(tipoMime?: string): string {
  if (!tipoMime) return '📄'; // Icono por defecto si no hay tipo MIME
  
  const mime = tipoMime.toLowerCase();
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📋';
  if (mime.includes('text')) return '📃';
  return '📄';
}

export default function EvidenciasPage() {
  const { canRead, canCreate, canUpdate, canDelete, loading: permissionsLoading } = useMenuGeneration();
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Evidencia>>({
    fecha: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [editingEvidencia, setEditingEvidencia] = useState<Evidencia | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (permissionsLoading) return; // Esperar a que se carguen los permisos
    
    if (!canRead('evidencias')) {
      setDataLoaded(true);
      return;
    }
    
    if (!dataLoaded) {
      loadEvidencias();
    }
  }, [canRead, permissionsLoading, dataLoaded]);

  async function loadEvidencias() {
    if (loading || dataLoaded) return; // Evitar múltiples cargas
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/evidencias');
      if (!res.ok) throw new Error('Error en la respuesta');
      const data = await res.json();
      console.log('Datos de evidencias cargados:', data); // Debug temporal
      console.log('Primer evidencia archivos:', data[0]?.archivos); // Debug archivos
      setEvidencias(Array.isArray(data) ? data : []);
      setDataLoaded(true);
    } catch (err) {
      setError('Error cargando evidencias');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 2 * 1024 * 1024) { // 2MB máximo
        setError(`El archivo ${file.name} es demasiado grande (máx. 2MB)`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    
    try {
      // Crear FormData
      const formData = new FormData();
      formData.append('titulo', form.titulo || '');
      formData.append('descripcion', form.descripcion || '');
      formData.append('categoria', form.categoria || '');
      formData.append('fecha', form.fecha || '');
      
      // Agregar archivos
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const res = await fetch('/api/evidencias', {
        method: 'POST',
        body: formData // No establecer Content-Type, el navegador lo hará automáticamente
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Error creando evidencia');
      }
      
      setEvidencias(prev => [responseData.data, ...prev]); // Agregar al inicio sin recargar
      setShowForm(false);
      setForm({
        fecha: new Date().toISOString().split('T')[0]
      });
      setSelectedFiles([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleEdit(evidencia: Evidencia) {
    setEditingEvidencia(evidencia);
    setForm({
      titulo: evidencia.titulo,
      descripcion: evidencia.descripcion,
      categoria: evidencia.categoria,
      fecha: evidencia.fecha
    });
    setShowEditForm(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvidencia) return;

    setError(null);
    setUploading(true);

    try {
      const res = await fetch(`/api/evidencias?id=${editingEvidencia._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error actualizando evidencia');
      }

      // Actualizar la lista de evidencias
      setEvidencias(prev => 
        prev.map(ev => 
          ev._id === editingEvidencia._id ? responseData.data : ev
        )
      );

      setShowEditForm(false);
      setEditingEvidencia(null);
      setForm({
        fecha: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(evidencia: Evidencia) {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la evidencia "${evidencia.titulo}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/evidencias?id=${evidencia._id}`, {
        method: 'DELETE'
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error eliminando evidencia');
      }

      // Remover de la lista
      setEvidencias(prev => prev.filter(ev => ev._id !== evidencia._id));
      
    } catch (err: any) {
      setError(err.message);
    }
  }

  function canEditEvidencia(evidencia: Evidencia): boolean {
    // Verificar si tiene permisos de actualización para evidencias
    return canUpdate('evidencias');
  }

  function canDeleteEvidencia(evidencia: Evidencia): boolean {
    // Verificar si tiene permisos de eliminación para evidencias  
    return canDelete('evidencias');
  }

  // Mostrar loading mientras se cargan los permisos
  if (permissionsLoading) {
    return (
      <div className="evidencias-page">
        <aside style={{ position: 'sticky', top: 24 }}>
          <DynamicMenu />
        </aside>
        <main className="evidencias-main">
          <div className="evidencias-card">
            <div className="loading-state">Verificando permisos...</div>
          </div>
        </main>
      </div>
    );
  }

  // Mostrar error si no tiene permisos
  if (!canRead('evidencias')) {
    return (
      <div className="evidencias-page">
        <aside style={{ position: 'sticky', top: 24 }}>
          <DynamicMenu />
        </aside>
        <main className="evidencias-main">
          <div className="evidencias-card">
            <div className="error-message">No tienes permiso para ver evidencias.</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="evidencias-page">
      <aside style={{ position: 'sticky', top: 24 }}>
        <DynamicMenu />
      </aside>
      <main className="evidencias-main">
        <div className="evidencias-card">
          <div className="evidencias-header">
            <h1>Evidencias</h1>
            {canCreate('evidencias') && (
              <button className="btn primary" onClick={() => setShowForm(true)}>
                Nueva Evidencia
              </button>
            )}
          </div>
          
          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-icon">📋</span>
                  <h3>Nueva Evidencia</h3>
                  <button className="close-btn" onClick={() => setShowForm(false)} aria-label="Cerrar">&times;</button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Título <span className="asterisco">*</span></label>
                      <input 
                        name="titulo" 
                        value={form.titulo || ''} 
                        onChange={handleChange} 
                        required 
                        placeholder="Ingresa el título de la evidencia"
                      />
                    </div>
                    <div className="form-group">
                      <label>Descripción <span className="asterisco">*</span></label>
                      <textarea 
                        name="descripcion" 
                        value={form.descripcion || ''} 
                        onChange={handleChange} 
                        required 
                        placeholder="Describe la evidencia..."
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría <span className="asterisco">*</span></label>
                      <select 
                        name="categoria" 
                        value={form.categoria || ''} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        <option value="documentos">Documentos</option>
                        <option value="imagenes">Imágenes</option>
                        <option value="videos">Videos</option>
                        <option value="reportes">Reportes</option>
                        <option value="certificados">Certificados</option>
                        <option value="otros">Otros</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha <span className="asterisco">*</span></label>
                      <input 
                        type="date" 
                        name="fecha" 
                        value={form.fecha || new Date().toISOString().split('T')[0]} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Archivos</label>
                      <div className="file-upload-area">
                        <input 
                          type="file" 
                          id="file-input"
                          multiple 
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                        />
                        <label htmlFor="file-input" className="file-upload-label">
                          <div className="file-upload-content">
                            <span className="file-upload-icon">📁</span>
                            <span>Haz clic para seleccionar archivos</span>
                            <small>Documentos, imágenes, videos (máx. 2MB por archivo)</small>
                          </div>
                        </label>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="selected-files">
                          <h4>Archivos seleccionados:</h4>
                          <ul>
                            {selectedFiles.map((file, index) => (
                              <li key={index} className="file-item">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                <button 
                                  type="button" 
                                  className="remove-file-btn"
                                  onClick={() => removeFile(index)}
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="btn primary" disabled={uploading}>
                        {uploading ? 'Guardando...' : 'Guardar Evidencia'}
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>
                        Cancelar
                      </button>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                  </form>
                </div>
              </div>
            </div>
          )}

          {showEditForm && (
            <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-icon">✏️</span>
                  <h3>Editar Evidencia</h3>
                  <button className="close-btn" onClick={() => setShowEditForm(false)} aria-label="Cerrar">&times;</button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleUpdate}>
                    <div className="form-group">
                      <label>Título <span className="asterisco">*</span></label>
                      <input 
                        name="titulo" 
                        value={form.titulo || ''} 
                        onChange={handleChange} 
                        required 
                        placeholder="Ingresa el título de la evidencia"
                      />
                    </div>
                    <div className="form-group">
                      <label>Descripción <span className="asterisco">*</span></label>
                      <textarea 
                        name="descripcion" 
                        value={form.descripcion || ''} 
                        onChange={handleChange} 
                        required 
                        placeholder="Describe la evidencia..."
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>Categoría <span className="asterisco">*</span></label>
                      <select 
                        name="categoria" 
                        value={form.categoria || ''} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        <option value="documentos">Documentos</option>
                        <option value="imagenes">Imágenes</option>
                        <option value="videos">Videos</option>
                        <option value="reportes">Reportes</option>
                        <option value="certificados">Certificados</option>
                        <option value="otros">Otros</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha <span className="asterisco">*</span></label>
                      <input 
                        type="date" 
                        name="fecha" 
                        value={form.fecha || ''} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    
                    <div className="info-box">
                      <p><strong>Nota:</strong> Para modificar archivos, deberás eliminar y crear una nueva evidencia.</p>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="btn primary" disabled={uploading}>
                        {uploading ? 'Actualizando...' : 'Actualizar Evidencia'}
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setShowEditForm(false)}>
                        Cancelar
                      </button>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                  </form>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="loading-state">Cargando evidencias...</div>
          ) : evidencias.length === 0 ? (
            <div className="empty-state">
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No hay evidencias</h3>
                <p style={{ margin: 0 }}>
                  {canCreate('evidencias') 
                    ? 'Comienza creando tu primera evidencia.' 
                    : 'No tienes permisos para ver evidencias.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <table className="evidencias-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th>Creado por</th>
                  <th>Archivos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {evidencias.map(ev => (
                  <tr key={ev._id}>
                    <td>{ev.titulo}</td>
                    <td>{ev.descripcion}</td>
                    <td>{ev.categoria}</td>
                    <td>{ev.fecha?.slice(0,10)}</td>
                    <td>
                      {ev.creadoPor ? (
                        <span className="usuario-info">
                          {ev.creadoPor.nombre} {ev.creadoPor.apellido}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Usuario desconocido
                        </span>
                      )}
                    </td>
                    <td>
                      {ev.archivos && ev.archivos.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {ev.archivos.map((archivo) => {
                            console.log('Archivo individual:', archivo); // Debug temporal
                            return (
                            <li key={archivo._id || 'no-id'} style={{ marginBottom: '6px' }}>
                              {archivo._id ? (
                                <a 
                                  href={`/api/evidencias/files/${archivo._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="archivo-link"
                                  title={`Descargar ${archivo.nombreOriginal}`}
                                >
                                  {getFileIcon(archivo.tipoMime)} {archivo.nombreOriginal}
                                </a>
                              ) : (
                                <span className="archivo-link" style={{ color: '#9ca3af', cursor: 'not-allowed' }}>
                                  {getFileIcon(archivo.tipoMime)} {archivo.nombreOriginal} (No disponible)
                                </span>
                              )}
                              {(archivo.tamañoFormateado || archivo.tipoMime) && (
                                <div className="archivo-info">
                                  {archivo.tamañoFormateado}
                                  {archivo.tamañoFormateado && archivo.tipoMime && ' • '}
                                  {archivo.tipoMime}
                                </div>
                              )}
                            </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                          Sin archivos
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canEditEvidencia(ev) && (
                          <button
                            className="btn-icon edit"
                            onClick={() => handleEdit(ev)}
                            title="Editar evidencia"
                          >
                            ✏️
                          </button>
                        )}
                        {canDeleteEvidencia(ev) && (
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDelete(ev)}
                            title="Eliminar evidencia"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
