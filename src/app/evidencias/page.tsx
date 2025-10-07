"use client";
import React, { useEffect, useState } from 'react';
import { useMenuGeneration } from '../hooks/useMenuGeneration';
import DynamicMenu from '../components/DynamicMenu';
import './evidencias.css';

interface Archivo {
  _id: string;
  nombreOriginal: string;
  tamaño: number;
  tipoMime: string;
  tamañoFormateado: string;
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

export default function EvidenciasPage() {
  const { canRead, canCreate, loading: permissionsLoading } = useMenuGeneration();
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
          
          {loading ? (
            <div className="loading-state">Cargando evidencias...</div>
          ) : (
            <table className="evidencias-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th>Archivos</th>
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
                      {ev.archivos && ev.archivos.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {ev.archivos.map((archivo) => (
                            <li key={archivo._id}>
                              <span>{archivo.nombreOriginal}</span>
                              {archivo.tamañoFormateado && (
                                <small style={{ marginLeft: '8px', color: '#666' }}>
                                  ({archivo.tamañoFormateado})
                                </small>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : 'Sin archivos'}
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
