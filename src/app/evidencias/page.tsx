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
  const [evidenciaToDelete, setEvidenciaToDelete] = useState<Evidencia | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    categoria: 'todas',
    usuario: 'todos',
    fechaDesde: '',
    fechaHasta: ''
  });
  const [categorias, setCategorias] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    if (permissionsLoading) return; // Esperar a que se carguen los permisos
    
    if (!canRead('evidencias')) {
      setDataLoaded(true);
      return;
    }
    
    if (!dataLoaded) {
      loadEvidencias();
      loadOpcionesFiltros();
    }
  }, [canRead, permissionsLoading, dataLoaded]);

  // Efecto para aplicar filtros cuando cambien
  useEffect(() => {
    if (dataLoaded) {
      loadEvidencias();
    }
  }, [filtros]);

  async function loadEvidencias() {
    setLoading(true);
    setError(null);
    
    try {
      // Construir URL con parámetros de filtro
      const params = new URLSearchParams();
      if (filtros.busqueda.trim()) params.append('q', filtros.busqueda.trim());
      if (filtros.categoria !== 'todas') params.append('categoria', filtros.categoria);
      if (filtros.usuario !== 'todos') params.append('usuario', filtros.usuario);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

      const url = `/api/evidencias${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🔍 Cargando evidencias con filtros:', url);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error en la respuesta');
      const data = await res.json();
      console.log('Datos de evidencias cargados:', data.length, 'evidencias');
      setEvidencias(Array.isArray(data) ? data : []);
      if (!dataLoaded) setDataLoaded(true);
    } catch (err) {
      setError('Error cargando evidencias');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOpcionesFiltros() {
    try {
      // Cargar categorías
      const resCategorias = await fetch('/api/evidencias/categorias');
      if (resCategorias.ok) {
        const dataCategorias = await resCategorias.json();
        setCategorias(Array.isArray(dataCategorias) ? dataCategorias : []);
      }

      // Cargar usuarios
      const resUsuarios = await fetch('/api/evidencias/usuarios');
      if (resUsuarios.ok) {
        const dataUsuarios = await resUsuarios.json();
        setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
      }
    } catch (error) {
      console.error('Error cargando opciones de filtros:', error);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleFiltroChange(campo: string, valor: string) {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  }

  function limpiarFiltros() {
    setFiltros({
      busqueda: '',
      categoria: 'todas',
      usuario: 'todos',
      fechaDesde: '',
      fechaHasta: ''
    });
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

  function showDeleteDialog(evidencia: Evidencia) {
    setEvidenciaToDelete(evidencia);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!evidenciaToDelete) return;

    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/evidencias?id=${evidenciaToDelete._id}`, {
        method: 'DELETE'
      });

      const responseData = await res.json();

      if (!res.ok) {
        // Si es error de permisos, mostrar mensaje específico
        if (res.status === 403) {
          setError(`${responseData.error}. Por favor verifica tus permisos en el módulo de Roles (/roles).`);
        } else {
          throw new Error(responseData.error || 'Error eliminando evidencia');
        }
        return;
      }

      // Remover de la lista
      setEvidencias(prev => prev.filter(ev => ev._id !== evidenciaToDelete._id));
      setEvidenciaToDelete(null);
      
    } catch (err: any) {
      setError(err.message);
      setEvidenciaToDelete(null);
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
            <div className="header-actions">
              <button 
                className="btn secondary" 
                onClick={() => setShowFiltros(!showFiltros)}
                style={{ marginRight: '10px' }}
              >
                🔍 Filtros
              </button>
              {canCreate('evidencias') && (
                <button className="btn primary" onClick={() => setShowForm(true)}>
                  Nueva Evidencia
                </button>
              )}
            </div>
          </div>

          {/* Panel de Filtros */}
          {showFiltros && (
            <div className="filtros-panel">
              <div className="filtros-grid">
                <div className="filtro-item">
                  <label>Buscar:</label>
                  <input
                    type="text"
                    placeholder="Buscar por título o descripción..."
                    value={filtros.busqueda}
                    onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                  />
                </div>

                <div className="filtro-item">
                  <label>Categoría:</label>
                  <select
                    value={filtros.categoria}
                    onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="filtro-item">
                  <label>Usuario:</label>
                  <select
                    value={filtros.usuario}
                    onChange={(e) => handleFiltroChange('usuario', e.target.value)}
                  >
                    <option value="todos">Todos los usuarios</option>
                    {usuarios.map(usuario => (
                      <option key={usuario._id} value={usuario._id}>
                        {usuario.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filtro-item">
                  <label>Fecha desde:</label>
                  <input
                    type="date"
                    value={filtros.fechaDesde}
                    onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
                  />
                </div>

                <div className="filtro-item">
                  <label>Fecha hasta:</label>
                  <input
                    type="date"
                    value={filtros.fechaHasta}
                    onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
                  />
                </div>

                <div className="filtro-item filtro-acciones">
                  <button className="btn secondary small" onClick={limpiarFiltros}>
                    🗑️ Limpiar
                  </button>
                  <button 
                    className="btn secondary small" 
                    onClick={() => setShowFiltros(false)}
                  >
                    ✖️ Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
          
          {/* Resumen de resultados */}
          {!loading && dataLoaded && (
            <div className="resultados-resumen">
              <span className="contador-resultados">
                {evidencias.length === 0 
                  ? 'No se encontraron evidencias'
                  : `${evidencias.length} evidencia${evidencias.length !== 1 ? 's' : ''} encontrada${evidencias.length !== 1 ? 's' : ''}`
                }
              </span>
              {(filtros.busqueda || filtros.categoria !== 'todas' || filtros.usuario !== 'todos' || filtros.fechaDesde || filtros.fechaHasta) && (
                <span className="filtros-activos">
                  (con filtros aplicados)
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="loading-state">Cargando evidencias...</div>
          ) : evidencias.length === 0 ? (
            <div className="empty-state">
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {(filtros.busqueda || filtros.categoria !== 'todas' || filtros.usuario !== 'todos' || filtros.fechaDesde || filtros.fechaHasta) ? '�' : '�📂'}
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                  {(filtros.busqueda || filtros.categoria !== 'todas' || filtros.usuario !== 'todos' || filtros.fechaDesde || filtros.fechaHasta) 
                    ? 'No se encontraron evidencias' 
                    : 'No hay evidencias'
                  }
                </h3>
                <p style={{ margin: 0 }}>
                  {(filtros.busqueda || filtros.categoria !== 'todas' || filtros.usuario !== 'todos' || filtros.fechaDesde || filtros.fechaHasta) 
                    ? 'Intenta ajustar los filtros de búsqueda.' 
                    : canCreate('evidencias') 
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
                            onClick={() => setEvidenciaToDelete(ev)}
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

      {/* Modal de confirmación de eliminación */}
      {evidenciaToDelete && (
        <div className="modal-overlay" onClick={() => setEvidenciaToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button 
                onClick={() => setEvidenciaToDelete(null)}
                className="btn-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar la evidencia <strong>"{evidenciaToDelete.titulo}"</strong>?</p>
              <p className="text-warning">⚠️ Esta acción no se puede deshacer y eliminará también todos los archivos asociados.</p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setEvidenciaToDelete(null)}
                className="btn-cancel"
                style={{ marginRight: '10px' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="btn-delete"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
