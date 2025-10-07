'use client';

import React, { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

interface Radicado {
  _id: string;
  consecutivo: string;
  fechaRadicado: Date;
  fechaOficio: Date;
  tipoOficio: string;
  asunto: string;
  resumen: string;
  observaciones?: string;
  destinatario: string;
  cargoDestinatario?: string;
  entidadDestinatario?: string;
  emailDestinatario?: string;
  remitente?: string;
  cargoRemitente?: string;
  entidadRemitente?: string;
  estado: string;
  prioridad: string;
  categoria: string;
  proyectoId?: {
    _id: string;
    nombre: string;
    codigo: string;
  };
  requiereRespuesta: boolean;
  fechaVencimiento?: Date;
  esConfidencial: boolean;
}

const ESTADOS_COLORS = {
  borrador: 'status-draft',
  enviado: 'status-sent',
  recibido: 'status-received',
  archivado: 'status-archived'
};

const PRIORIDAD_COLORS = {
  baja: 'priority-low',
  media: 'priority-medium',
  alta: 'priority-high',
  urgente: 'priority-urgent'
};

export default function ArchivoPage() {
  const [radicados, setRadicados] = useState<Radicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    estado: '',
    prioridad: '',
    categoria: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedRadicado, setSelectedRadicado] = useState<Radicado | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

  const { canAccessDocuments, loading: permissionsLoading, hasPermission } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      cargarRadicados();
    }
  }, [permissionsLoading, filtros]);

  const cargarRadicados = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.prioridad) params.append('prioridad', filtros.prioridad);
      if (filtros.categoria) params.append('categoria', filtros.categoria);

      const response = await fetch(`/api/archivo/radicados?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRadicados(data.data.radicados);
      } else {
        setError('Error al cargar los radicados');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleVerDetalle = (radicado: Radicado) => {
    setSelectedRadicado(radicado);
    setShowDetail(true);
  };

  const handleFileUploadSuccess = () => {
    setFileRefreshTrigger(prev => prev + 1);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedRadicado(null);
  };

  if (permissionsLoading) {
    return <div className="loading">Cargando permisos...</div>;
  }

  if (!canAccessDocuments()) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder al archivo de interventoría.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archivo-container">
      <div className="page-header">
        <div className="header-content">
          <h1>📁 Archivo de Interventoría</h1>
          <p>Gestión de radicados y documentos oficiales</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            ➕ Nuevo Radicado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <input
              type="text"
              placeholder="🔍 Buscar radicados..."
              value={filtros.search}
              onChange={(e) => setFiltros({...filtros, search: e.target.value})}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos los tipos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="interno">Interno</option>
              <option value="circular">Circular</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviado">Enviado</option>
              <option value="recibido">Recibido</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filtros.prioridad}
              onChange={(e) => setFiltros({...filtros, prioridad: e.target.value})}
              className="filter-select"
            >
              <option value="">Todas las prioridades</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Radicados */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando radicados...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={cargarRadicados} className="btn btn-secondary">
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <div className="radicados-grid">
            {radicados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No hay radicados</h3>
                <p>No se encontraron radicados con los filtros aplicados.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  Crear primer radicado
                </button>
              </div>
            ) : (
              radicados.map(radicado => (
                <div key={radicado._id} className="radicado-card">
                  <div className="card-header">
                    <div className="consecutivo-badge">
                      {radicado.consecutivo}
                    </div>
                    <div className="card-badges">
                      {radicado.esConfidencial && (
                        <span className="badge confidencial">🔒 Confidencial</span>
                      )}
                      <span className={`badge ${ESTADOS_COLORS[radicado.estado as keyof typeof ESTADOS_COLORS]}`}>
                        {radicado.estado.toUpperCase()}
                      </span>
                      <span className={`badge ${PRIORIDAD_COLORS[radicado.prioridad as keyof typeof PRIORIDAD_COLORS]}`}>
                        {radicado.prioridad.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="card-content">
                    <h3 className="asunto">{radicado.asunto}</h3>
                    <p className="resumen">{radicado.resumen}</p>
                    
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">📅 Fecha:</span>
                        <span className="value">{formatDate(radicado.fechaOficio)}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">📧 Destinatario:</span>
                        <span className="value">{radicado.destinatario}</span>
                      </div>
                      {radicado.remitente && (
                        <div className="info-item">
                          <span className="label">👤 Remitente:</span>
                          <span className="value">{radicado.remitente}</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="label">🏷️ Categoría:</span>
                        <span className="value">{radicado.categoria}</span>
                      </div>
                      {radicado.proyectoId && (
                        <div className="info-item">
                          <span className="label">🏗️ Proyecto:</span>
                          <span className="value">{radicado.proyectoId.nombre}</span>
                        </div>
                      )}
                    </div>

                    {radicado.requiereRespuesta && (
                      <div className="alert alert-warning">
                        ⏰ Requiere respuesta
                        {radicado.fechaVencimiento && (
                          <span> - Vence: {formatDate(radicado.fechaVencimiento)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleVerDetalle(radicado)}
                      title="Ver detalles y gestionar archivos"
                    >
                      👁️ Ver Detalles
                    </button>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {/* TODO: Implementar edición */}}
                      disabled
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleVerDetalle(radicado)}
                      title="Gestionar archivos adjuntos"
                    >
                      📎 Archivos
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle del Radicado */}
      {showDetail && selectedRadicado && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📄 Detalle del Radicado</h2>
                <p className="modal-subtitle">{selectedRadicado.consecutivo}</p>
              </div>
              <button 
                className="close-button"
                onClick={handleCloseDetail}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Información del Radicado */}
              <div className="detail-section">
                <h3>📋 Información General</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Consecutivo:</label>
                    <span className="consecutivo-highlight">{selectedRadicado.consecutivo}</span>
                  </div>
                  <div className="detail-item">
                    <label>Fecha de Oficio:</label>
                    <span>{formatDate(selectedRadicado.fechaOficio)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo:</label>
                    <span className="capitalize">{selectedRadicado.tipoOficio}</span>
                  </div>
                  <div className="detail-item">
                    <label>Estado:</label>
                    <span className={`status-badge ${selectedRadicado.estado}`}>
                      {selectedRadicado.estado.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Prioridad:</label>
                    <span className={`priority-badge ${selectedRadicado.prioridad}`}>
                      {selectedRadicado.prioridad.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Categoría:</label>
                    <span className="capitalize">{selectedRadicado.categoria}</span>
                  </div>
                </div>

                <div className="detail-item full-width">
                  <label>Asunto:</label>
                  <p className="asunto-text">{selectedRadicado.asunto}</p>
                </div>

                <div className="detail-item full-width">
                  <label>Resumen:</label>
                  <p className="resumen-text">{selectedRadicado.resumen}</p>
                </div>

                {selectedRadicado.observaciones && (
                  <div className="detail-item full-width">
                    <label>Observaciones:</label>
                    <p className="observaciones-text">{selectedRadicado.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Información de Contacto */}
              <div className="detail-section">
                <h3>👥 Información de Contacto</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Destinatario:</label>
                    <span>{selectedRadicado.destinatario}</span>
                  </div>
                  {selectedRadicado.cargoDestinatario && (
                    <div className="detail-item">
                      <label>Cargo:</label>
                      <span>{selectedRadicado.cargoDestinatario}</span>
                    </div>
                  )}
                  {selectedRadicado.entidadDestinatario && (
                    <div className="detail-item">
                      <label>Entidad:</label>
                      <span>{selectedRadicado.entidadDestinatario}</span>
                    </div>
                  )}
                  {selectedRadicado.remitente && (
                    <div className="detail-item">
                      <label>Remitente:</label>
                      <span>{selectedRadicado.remitente}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gestión de Archivos */}
              <div className="detail-section">
                <h3>📎 Gestión de Archivos</h3>
                
                {/* Subida de Archivos */}
                <div className="upload-section">
                  <h4>Subir Nuevo Archivo</h4>
                  <FileUpload
                    radicadoId={selectedRadicado._id}
                    categoria="oficio"
                    esConfidencial={selectedRadicado.esConfidencial}
                    onUploadSuccess={handleFileUploadSuccess}
                    onUploadError={(error) => alert(`Error: ${error}`)}
                    acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx']}
                    maxSize={10}
                    multiple={true}
                  />
                </div>

                {/* Lista de Archivos */}
                <div className="files-section">
                  <FileList
                    radicadoId={selectedRadicado._id}
                    editable={hasPermission('archivo', 'actualizar')}
                    refreshTrigger={fileRefreshTrigger}
                    onFileDelete={() => setFileRefreshTrigger(prev => prev + 1)}
                    onFileUpdate={() => setFileRefreshTrigger(prev => prev + 1)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .archivo-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .header-content h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .header-content p {
          color: #6b7280;
          margin: 0;
        }

        .filters-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 16px;
        }

        .search-input, .filter-select {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-input:focus, .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .content-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }

        .radicados-grid {
          display: grid;
          gap: 24px;
        }

        .radicado-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          background: #fafafa;
          transition: all 0.2s;
        }

        .radicado-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .consecutivo-badge {
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
        }

        .card-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .confidencial {
          background: #ef4444;
          color: white;
        }

        .status-draft { background: #f3f4f6; color: #374151; }
        .status-sent { background: #dbeafe; color: #1e40af; }
        .status-received { background: #dcfce7; color: #166534; }
        .status-archived { background: #e5e7eb; color: #374151; }

        .priority-low { background: #f0f9ff; color: #0369a1; }
        .priority-medium { background: #fef3c7; color: #d97706; }
        .priority-high { background: #fed7d7; color: #c53030; }
        .priority-urgent { background: #fee2e2; color: #dc2626; }

        .asunto {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .resumen {
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item .label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .info-item .value {
          font-weight: 500;
          color: #1f2937;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin: 16px 0;
          font-size: 14px;
          font-weight: 500;
        }

        .alert-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        .card-actions {
          display: flex;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-outline {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
          color: #374151;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .empty-state {
          text-align: center;
          padding: 64px 24px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .loading-state, .error-state {
          text-align: center;
          padding: 64px 24px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .access-denied {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .access-denied-content {
          text-align: center;
          padding: 48px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .access-denied-content h2 {
          color: #ef4444;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .card-actions {
            flex-wrap: wrap;
          }

          .modal-content {
            width: 95vw;
            max-height: 95vh;
            margin: 2.5vh auto;
          }

          .detail-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .modal-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .close-button {
            position: absolute;
            top: 1rem;
            right: 1rem;
          }
        }

        /* Estilos del Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 1200px;
          width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem 2rem 1rem 2rem;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .modal-subtitle {
          font-size: 1rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .close-button:hover {
          background-color: #f3f4f6;
          color: #1f2937;
        }

        .modal-body {
          padding: 2rem;
        }

        .detail-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .detail-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .detail-section h4 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-item label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .detail-item span {
          color: #1f2937;
          font-weight: 500;
        }

        .consecutivo-highlight {
          background-color: #dbeafe;
          color: #1d4ed8;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 700;
          display: inline-block;
        }

        .capitalize {
          text-transform: capitalize;
        }

        .status-badge, .priority-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .status-badge.pendiente { background-color: #fef3c7; color: #92400e; }
        .status-badge.enviado { background-color: #dbeafe; color: #1e40af; }
        .status-badge.recibido { background-color: #d1fae5; color: #065f46; }
        .status-badge.archivado { background-color: #f3f4f6; color: #374151; }

        .priority-badge.baja { background-color: #f3f4f6; color: #6b7280; }
        .priority-badge.media { background-color: #fef3c7; color: #92400e; }
        .priority-badge.alta { background-color: #fed7d7; color: #c53030; }
        .priority-badge.urgente { background-color: #fecaca; color: #dc2626; }

        .asunto-text, .resumen-text, .observaciones-text {
          color: #1f2937;
          line-height: 1.6;
          margin: 0;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .upload-section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 2px dashed #cbd5e0;
        }

        .files-section {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}