"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import DynamicMenu from '../components/DynamicMenu';
import UserProfile from '../components/UserProfile';
import { useMenuGeneration } from '../hooks/useMenuGeneration';
import { usePermissions } from '../hooks/usePermissions';

interface Proyecto {
  _id: string;
  codigo?: string;
  nombre: string;
  descripcion: string;
  tipoProyecto: string;
  estado: string;
  prioridad: string;
  fechaInicio: string;
  fechaFinPlaneada?: string;
  fechaFin?: string;
  interventor?: {
    _id: string;
    nombre: string;
    email: string;
  };
  contratista?: {
    _id: string;
    nombre: string;
    email: string;
  };
  contactoCliente?: {
    nombre: string;
    cargo: string;
    telefono?: string;
    email?: string;
  };
  presupuesto?: {
    valorTotal: number;
    valorEjecutado: number;
    moneda: string;
    fechaAprobacion: string;
  };
  ubicacion?: {
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
    coordenadas?: {
      latitud: number;
      longitud: number;
    };
  };
  porcentajeAvance: number;
  activo: boolean;
}

const ESTADOS_COLORS = {
  planificacion: 'status-draft',
  'en_ejecucion': 'status-active',
  suspendido: 'status-paused',
  finalizado: 'status-completed',
  cancelado: 'status-cancelled'
};

const PRIORIDAD_COLORS = {
  baja: 'priority-low',
  media: 'priority-medium',
  alta: 'priority-high',
  critica: 'priority-urgent'
};

const TIPO_COLORS = {
  construccion: 'type-construction',
  infraestructura: 'type-infrastructure',
  tecnologia: 'type-technology',
  consultoria: 'type-consulting',
  otros: 'type-other'
};

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now;
  } catch (e) {
    return false;
  }
}

function getUserRole(): string {
  try {
    const token = typeof window !== 'undefined' ?
      (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;

    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.tipoUsuario || 'usuario';
    }
  } catch (e) {
    console.error('Error decoding token:', e);
  }
  return '';
}

function ProyectoContent() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: '',
    estado: '',
    prioridad: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [proyectoEditData, setProyectoEditData] = useState<Proyecto | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const { canAccessProjects, loading: permissionsLoading, hasPermission } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      cargarProyectos();
      cargarUsuarios();
    }
  }, [permissionsLoading, filtros]);

  const cargarProyectos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.prioridad) params.append('prioridad', filtros.prioridad);

      const response = await fetch(`/api/proyectos?${params.toString()}`, {
        // headers: {
        //   'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        // }
      });

      if (response.ok) {
        const data = await response.json();
        setProyectos(data.data?.proyectos || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar los proyectos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  // Función de validación del lado del cliente
  const validateFormData = (formData: FormData): string[] => {
    const errors: string[] = [];

    // Validar código (opcional, se genera automáticamente si no se proporciona)
    const codigo = formData.get('codigo') as string;
    // No validar código aquí ya que es opcional

    // Validar nombre
    const nombre = formData.get('nombre') as string;
    if (!nombre || nombre.trim().length < 3 || nombre.length > 200) {
      errors.push('El nombre debe tener entre 3 y 200 caracteres');
    }

    // Validar descripción
    const descripcion = formData.get('descripcion') as string;
    if (!descripcion || descripcion.trim().length < 10 || descripcion.length > 1000) {
      errors.push('La descripción debe tener entre 10 y 1000 caracteres');
    }

    // Validar tipo de proyecto
    const tipoProyecto = formData.get('tipoProyecto') as string;
    const tiposValidos = ['construccion', 'infraestructura', 'tecnologia', 'consultoria', 'otros'];
    if (!tipoProyecto || !tiposValidos.includes(tipoProyecto)) {
      errors.push('Tipo de proyecto inválido');
    }

    // Validar estado
    const estado = formData.get('estado') as string;
    const estadosValidos = ['planificacion', 'en_ejecucion', 'suspendido', 'finalizado', 'cancelado'];
    if (!estado || !estadosValidos.includes(estado)) {
      errors.push('Estado de proyecto inválido');
    }

    // Validar prioridad
    const prioridad = formData.get('prioridad') as string;
    const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
    if (!prioridad || !prioridadesValidas.includes(prioridad)) {
      errors.push('Prioridad inválida');
    }

    // Validar fecha de inicio
    const fechaInicio = formData.get('fechaInicio') as string;
    if (!fechaInicio || isNaN(Date.parse(fechaInicio))) {
      errors.push('Fecha de inicio inválida');
    }

    // Validar fecha de fin planeada
    const fechaFinPlaneada = formData.get('fechaFinPlaneada') as string;
    if (!fechaFinPlaneada || isNaN(Date.parse(fechaFinPlaneada))) {
      errors.push('Fecha de fin planeada inválida');
    }

    // Validar ubicación
    const direccion = formData.get('ubicacion.direccion') as string;
    const ciudad = formData.get('ubicacion.ciudad') as string;
    const departamento = formData.get('ubicacion.departamento') as string;
    const pais = formData.get('ubicacion.pais') as string;

    if (!direccion || direccion.trim().length === 0) {
      errors.push('La dirección es requerida');
    }
    if (!ciudad || ciudad.trim().length === 0) {
      errors.push('La ciudad es requerida');
    }
    if (!departamento || departamento.trim().length === 0) {
      errors.push('El departamento es requerido');
    }
    if (!pais || pais.trim().length === 0) {
      errors.push('El país es requerido');
    }

    // Validar contacto cliente
    const contactoNombre = formData.get('contactoCliente.nombre') as string;
    const contactoCargo = formData.get('contactoCliente.cargo') as string;
    const contactoEmail = formData.get('contactoCliente.email') as string;

    if (!contactoNombre || contactoNombre.trim().length === 0) {
      errors.push('El nombre del contacto es requerido');
    }
    if (!contactoCargo || contactoCargo.trim().length === 0) {
      errors.push('El cargo del contacto es requerido');
    }
    if (contactoEmail && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(contactoEmail)) {
      errors.push('Email del contacto inválido');
    }

    // Validar presupuesto
    const valorTotal = formData.get('presupuesto.valorTotal') as string;
    const valorEjecutado = formData.get('presupuesto.valorEjecutado') as string;
    const moneda = formData.get('presupuesto.moneda') as string;
    const fechaAprobacion = formData.get('presupuesto.fechaAprobacion') as string;

    const valorTotalNum = parseFloat(valorTotal);
    const valorEjecutadoNum = parseFloat(valorEjecutado || '0');

    if (!valorTotal || isNaN(valorTotalNum) || valorTotalNum <= 0) {
      errors.push('El valor total del presupuesto debe ser un número positivo');
    }
    if (valorEjecutado && (isNaN(valorEjecutadoNum) || valorEjecutadoNum < 0)) {
      errors.push('El valor ejecutado del presupuesto debe ser un número no negativo');
    }
    if (!moneda || !['COP', 'USD', 'EUR'].includes(moneda)) {
      errors.push('La moneda del presupuesto debe ser COP, USD o EUR');
    }
    if (!fechaAprobacion || isNaN(Date.parse(fechaAprobacion))) {
      errors.push('La fecha de aprobación del presupuesto es requerida y debe ser válida');
    }

    // Validar contratista
    const contratista = formData.get('contratista') as string;
    if (!contratista || contratista.trim().length === 0) {
      errors.push('El contratista es requerido');
    }

    // Validar porcentaje de avance
    const porcentajeAvance = formData.get('porcentajeAvance') as string;
    const porcentajeNum = parseInt(porcentajeAvance || '0');
    if (porcentajeAvance && (isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100)) {
      errors.push('El porcentaje de avance debe estar entre 0 y 100');
    }

    return errors;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleVerDetalle = (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedProyecto(null);
  };

  const handleEditProyecto = (proyecto: Proyecto) => {
    setProyectoEditData(proyecto);
    setShowForm(true);
  };

  const handleSubmitProyecto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors([]);

    try {
      const formData = new FormData(e.currentTarget);

      // Validación del lado del cliente
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        setFormErrors(validationErrors);
        setLoading(false);
        return;
      }

      const proyectoData = {
        codigo: formData.get('codigo'),
        nombre: formData.get('nombre'),
        descripcion: formData.get('descripcion'),
        tipoProyecto: formData.get('tipoProyecto'),
        estado: formData.get('estado'),
        prioridad: formData.get('prioridad'),
        fechaInicio: formData.get('fechaInicio'),
        fechaFinPlaneada: formData.get('fechaFinPlaneada'),
        ubicacion: {
          direccion: formData.get('ubicacion.direccion'),
          ciudad: formData.get('ubicacion.ciudad'),
          departamento: formData.get('ubicacion.departamento'),
          pais: formData.get('ubicacion.pais')
        },
        contactoCliente: {
          nombre: formData.get('contactoCliente.nombre'),
          cargo: formData.get('contactoCliente.cargo'),
          telefono: formData.get('contactoCliente.telefono') || undefined,
          email: formData.get('contactoCliente.email') || undefined
        },
        presupuesto: {
          valorTotal: parseFloat(formData.get('presupuesto.valorTotal') as string),
          valorEjecutado: parseFloat(formData.get('presupuesto.valorEjecutado') as string) || 0,
          moneda: formData.get('presupuesto.moneda'),
          fechaAprobacion: formData.get('presupuesto.fechaAprobacion')
        },
        contratista: formData.get('contratista'),
        porcentajeAvance: parseInt(formData.get('porcentajeAvance') as string) || 0
      };

      let response;
      if (proyectoEditData) {
        // Editar proyecto existente
        response = await fetch(`/api/proyectos/${proyectoEditData._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(proyectoData),
        });
      } else {
        // Crear nuevo proyecto
        response = await fetch('/api/proyectos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(proyectoData),
        });
      }

      if (response.ok) {
        const result = await response.json();
        const codigoGenerado = result.data?.codigo || 'desconocido';
        toast.success(proyectoEditData ? 'Proyecto actualizado correctamente' : `Proyecto ${result.data.nombre} creado exitosamente (Código: ${codigoGenerado})`);
        setShowForm(false);
        setProyectoEditData(null);
        cargarProyectos();
        (e.target as HTMLFormElement).reset();
        setFormErrors([]);
      } else {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          setFormErrors(errorData.details);
        } else {
          setFormErrors([errorData.error || (proyectoEditData ? 'Error al actualizar el proyecto' : 'Error al crear el proyecto')]);
        }
        toast.error(errorData.error || (proyectoEditData ? 'Error al actualizar el proyecto' : 'Error al crear el proyecto'));
      }
    } catch (error: any) {
      console.error('Error creating proyecto:', error);
      setFormErrors(['Error de conexión al servidor']);
      toast.error('Error de conexión al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  if (permissionsLoading) {
    return <div className="loading">Cargando permisos...</div>;
  }

  if (!canAccessProjects()) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a la gestión de proyectos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archivo-container">
      <div className="page-header">
        <div className="header-content">
          <h1>🏗️ Gestión de Proyectos</h1>
          <p>Administración y seguimiento de proyectos de interventoría</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            ➕ Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <input
              type="text"
              placeholder="🔍 Buscar proyectos..."
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
              <option value="construccion">Construcción</option>
              <option value="infraestructura">Infraestructura</option>
              <option value="tecnologia">Tecnología</option>
              <option value="consultoria">Consultoría</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="planificacion">Planificación</option>
              <option value="en_ejecucion">En Ejecución</option>
              <option value="suspendido">Suspendido</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
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
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando proyectos...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={cargarProyectos} className="btn btn-secondary">
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <div className="radicados-grid">
            {proyectos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No hay proyectos</h3>
                <p>No se encontraron proyectos con los filtros aplicados.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  Crear primer proyecto
                </button>
              </div>
            ) : (
              proyectos.map(proyecto => (
                <div key={proyecto._id} className="radicado-card">
                  <div className="card-header">
                    <div className="consecutivo-badge">
                      {proyecto.nombre.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="card-badges">
                      <span className={`badge ${ESTADOS_COLORS[proyecto.estado as keyof typeof ESTADOS_COLORS]}`}>
                        {proyecto.estado.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`badge ${PRIORIDAD_COLORS[proyecto.prioridad as keyof typeof PRIORIDAD_COLORS]}`}>
                        {proyecto.prioridad.toUpperCase()}
                      </span>
                      <span className={`badge ${TIPO_COLORS[proyecto.tipoProyecto as keyof typeof TIPO_COLORS]}`}>
                        {proyecto.tipoProyecto.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="card-content">
                    <h3 className="asunto">{proyecto.nombre}</h3>
                    <p className="resumen">{proyecto.descripcion}</p>

                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${proyecto.porcentajeAvance}%` }}></div>
                      <span className="progress-text">{proyecto.porcentajeAvance}%</span>
                    </div>

                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">📅 Inicio:</span>
                        <span className="value">{formatDate(proyecto.fechaInicio)}</span>
                      </div>
                      {proyecto.fechaFinPlaneada && (
                        <div className="info-item">
                          <span className="label">🏁 Fin:</span>
                          <span className="value">{formatDate(proyecto.fechaFinPlaneada)}</span>
                        </div>
                      )}
                      {proyecto.interventor && (
                        <div className="info-item">
                          <span className="label">👤 Interventor:</span>
                          <span className="value">{proyecto.interventor.nombre}</span>
                        </div>
                      )}
                      {proyecto.contratista && (
                        <div className="info-item">
                          <span className="label">🏢 Contratista:</span>
                          <span className="value">{proyecto.contratista.nombre}</span>
                        </div>
                      )}
                      {proyecto.presupuesto && (
                        <div className="info-item">
                          <span className="label">💰 Presupuesto:</span>
                          <span className="value">{formatCurrency(proyecto.presupuesto.valorTotal, proyecto.presupuesto.moneda)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleVerDetalle(proyecto)}
                      title="Ver detalles del proyecto"
                    >
                      👁️ Ver Detalles
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEditProyecto(proyecto)}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle del Proyecto */}
      {showDetail && selectedProyecto && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📄 Detalle del Proyecto</h2>
                <p className="modal-subtitle">{selectedProyecto.nombre}</p>
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
              {/* Información del Proyecto */}
              <div className="detail-section">
                <h3>📋 Información General</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Nombre:</label>
                    <span className="consecutivo-highlight">{selectedProyecto.nombre}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo:</label>
                    <span className="capitalize">{selectedProyecto.tipoProyecto}</span>
                  </div>
                  <div className="detail-item">
                    <label>Estado:</label>
                    <span className={`status-badge ${selectedProyecto.estado}`}>
                      {selectedProyecto.estado.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Prioridad:</label>
                    <span className={`priority-badge ${selectedProyecto.prioridad}`}>
                      {selectedProyecto.prioridad.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Fecha Inicio:</label>
                    <span>{formatDate(selectedProyecto.fechaInicio)}</span>
                  </div>
                  {selectedProyecto.fechaFinPlaneada && (
                    <div className="detail-item">
                      <label>Fecha de Fin Planeada:</label>
                      <span>{formatDate(selectedProyecto.fechaFinPlaneada)}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Porcentaje Avance:</label>
                    <span>{selectedProyecto.porcentajeAvance}%</span>
                  </div>
                </div>

                <div className="detail-item full-width">
                  <label>Descripción:</label>
                  <p className="asunto-text">{selectedProyecto.descripcion}</p>
                </div>

                {selectedProyecto.ubicacion && (
                  <div className="detail-item full-width">
                    <label>Ubicación:</label>
                    <p className="observaciones-text">
                      {selectedProyecto.ubicacion.direccion}, {selectedProyecto.ubicacion.ciudad}, {selectedProyecto.ubicacion.departamento}, {selectedProyecto.ubicacion.pais}
                    </p>
                  </div>
                )}
              </div>

              {/* Información de Contacto */}
              <div className="detail-section">
                <h3>👥 Información de Contacto</h3>
                <div className="detail-grid">
                  {selectedProyecto.interventor && (
                    <>
                      <div className="detail-item">
                        <label>Interventor:</label>
                        <span>{selectedProyecto.interventor.nombre}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email Interventor:</label>
                        <span>{selectedProyecto.interventor.email}</span>
                      </div>
                    </>
                  )}
                  {selectedProyecto.contratista && (
                    <>
                      <div className="detail-item">
                        <label>Contratista:</label>
                        <span>{selectedProyecto.contratista.nombre}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email Contratista:</label>
                        <span>{selectedProyecto.contratista.email}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Presupuesto */}
              {selectedProyecto.presupuesto && (
                <div className="detail-section">
                  <h3>💰 Información Presupuestal</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Valor Total:</label>
                      <span>{formatCurrency(selectedProyecto.presupuesto.valorTotal, selectedProyecto.presupuesto.moneda)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Valor Ejecutado:</label>
                      <span>{formatCurrency(selectedProyecto.presupuesto.valorEjecutado, selectedProyecto.presupuesto.moneda)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Valor Pendiente:</label>
                      <span>{formatCurrency(selectedProyecto.presupuesto.valorTotal - selectedProyecto.presupuesto.valorEjecutado, selectedProyecto.presupuesto.moneda)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Proyecto */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setProyectoEditData(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{proyectoEditData ? '✏️ Editar Proyecto' : '➕ Nuevo Proyecto'}</h2>
                <p className="modal-subtitle">{proyectoEditData ? 'Modifica los datos del proyecto' : 'Crear un nuevo proyecto'}</p>
              </div>
              <button
                className="close-button"
                onClick={() => { setShowForm(false); setProyectoEditData(null); }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmitProyecto}>
                {/* Mostrar errores de validación */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <span className="text-red-600 text-lg mr-2">⚠️</span>
                      <span className="text-red-800 font-semibold">Errores de validación</span>
                    </div>
                    <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="nombre">🏷️ Nombre del Proyecto *</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      required
                      placeholder="Ingrese el nombre del proyecto (3-200 caracteres)"
                      className="form-input"
                      minLength={3}
                      maxLength={200}
                      defaultValue={proyectoEditData?.nombre || ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="codigo">🔢 Código del Proyecto</label>
                    <input
                      type="text"
                      id="codigo"
                      name="codigo"
                      placeholder="Se generará automáticamente (ej: PROJ-202410-001)"
                      className="form-input"
                      maxLength={20}
                      defaultValue={proyectoEditData?.codigo || ''}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <small className="text-gray-500 text-xs mt-1 block">Si no ingresa un código, se generará uno automáticamente</small>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="descripcion">📋 Descripción *</label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      required
                      placeholder="Ingrese una descripción del proyecto (mínimo 10 caracteres)"
                      className="form-textarea"
                      rows={3}
                      minLength={10}
                      maxLength={1000}
                      defaultValue={proyectoEditData?.descripcion || ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tipoProyecto">🏗️ Tipo de Proyecto *</label>
                    <select id="tipoProyecto" name="tipoProyecto" required className="form-select" defaultValue={proyectoEditData?.tipoProyecto || ''}>
                      <option value="">Seleccionar tipo</option>
                      <option value="construccion">Construcción</option>
                      <option value="infraestructura">Infraestructura</option>
                      <option value="tecnologia">Tecnología</option>
                      <option value="consultoria">Consultoría</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="estado">📊 Estado *</label>
                    <select id="estado" name="estado" required className="form-select" defaultValue={proyectoEditData?.estado || 'planificacion'}>
                      <option value="planificacion">Planificación</option>
                      <option value="en_ejecucion">En Ejecución</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="prioridad">⚡ Prioridad *</label>
                    <select id="prioridad" name="prioridad" required className="form-select" defaultValue={proyectoEditData?.prioridad || 'media'}>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="porcentajeAvance">📈 Porcentaje de Avance</label>
                    <input
                      type="number"
                      id="porcentajeAvance"
                      name="porcentajeAvance"
                      min="0"
                      max="100"
                      placeholder="0"
                      className="form-input"
                      defaultValue={proyectoEditData?.porcentajeAvance || 0}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fechaInicio">📅 Fecha de Inicio *</label>
                    <input
                      type="date"
                      id="fechaInicio"
                      name="fechaInicio"
                      required
                      className="form-input"
                      defaultValue={proyectoEditData?.fechaInicio ? proyectoEditData.fechaInicio.slice(0,10) : ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fechaFinPlaneada">🏁 Fecha de Fin Planeada *</label>
                    <input
                      type="date"
                      id="fechaFinPlaneada"
                      name="fechaFinPlaneada"
                      required
                      className="form-input"
                      defaultValue={proyectoEditData?.fechaFinPlaneada ? proyectoEditData.fechaFinPlaneada.slice(0,10) : ''}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="ubicacion.direccion">📍 Dirección *</label>
                    <input
                      type="text"
                      id="ubicacion.direccion"
                      name="ubicacion.direccion"
                      required
                      placeholder="Ingrese la dirección del proyecto"
                      className="form-input"
                      maxLength={200}
                      defaultValue={proyectoEditData?.ubicacion?.direccion || ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ubicacion.ciudad">🏙️ Ciudad *</label>
                    <input
                      type="text"
                      id="ubicacion.ciudad"
                      name="ubicacion.ciudad"
                      required
                      placeholder="Ciudad"
                      className="form-input"
                      maxLength={100}
                      defaultValue={proyectoEditData?.ubicacion?.ciudad || ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ubicacion.departamento">🏛️ Departamento *</label>
                    <input
                      type="text"
                      id="ubicacion.departamento"
                      name="ubicacion.departamento"
                      required
                      placeholder="Departamento"
                      className="form-input"
                      maxLength={100}
                      defaultValue={proyectoEditData?.ubicacion?.departamento || ''}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ubicacion.pais">🌍 País *</label>
                    <input
                      type="text"
                      id="ubicacion.pais"
                      name="ubicacion.pais"
                      required
                      placeholder="País"
                      className="form-input"
                      maxLength={100}
                      defaultValue={proyectoEditData?.ubicacion?.pais || 'Colombia'}
                    />
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="form-section">
                  <h3>👤 Información de Contacto del Cliente</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="contactoCliente.nombre">Nombre del Contacto *</label>
                      <input
                        type="text"
                        id="contactoCliente.nombre"
                        name="contactoCliente.nombre"
                        required
                        placeholder="Nombre completo"
                        className="form-input"
                        maxLength={100}
                        defaultValue={proyectoEditData?.contactoCliente?.nombre || ''}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contactoCliente.cargo">Cargo *</label>
                      <input
                        type="text"
                        id="contactoCliente.cargo"
                        name="contactoCliente.cargo"
                        required
                        placeholder="Cargo del contacto"
                        className="form-input"
                        maxLength={100}
                        defaultValue={proyectoEditData?.contactoCliente?.cargo || ''}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contactoCliente.telefono">Teléfono</label>
                      <input
                        type="tel"
                        id="contactoCliente.telefono"
                        name="contactoCliente.telefono"
                        placeholder="Número de teléfono"
                        className="form-input"
                        maxLength={20}
                        defaultValue={proyectoEditData?.contactoCliente?.telefono || ''}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contactoCliente.email">Email</label>
                      <input
                        type="email"
                        id="contactoCliente.email"
                        name="contactoCliente.email"
                        placeholder="correo@ejemplo.com"
                        className="form-input"
                        maxLength={100}
                        defaultValue={proyectoEditData?.contactoCliente?.email || ''}
                      />
                    </div>
                  </div>
                </div>

                {/* Información Presupuestal */}
                <div className="form-section">
                  <h3>💰 Información Presupuestal</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="presupuesto.valorTotal">Valor Total *</label>
                      <input
                        type="number"
                        id="presupuesto.valorTotal"
                        name="presupuesto.valorTotal"
                        required
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="form-input"
                        defaultValue={proyectoEditData?.presupuesto?.valorTotal || ''}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="presupuesto.valorEjecutado">Valor Ejecutado</label>
                      <input
                        type="number"
                        id="presupuesto.valorEjecutado"
                        name="presupuesto.valorEjecutado"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="form-input"
                        defaultValue={proyectoEditData?.presupuesto?.valorEjecutado || 0}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="presupuesto.moneda">Moneda *</label>
                      <select id="presupuesto.moneda" name="presupuesto.moneda" required className="form-select" defaultValue={proyectoEditData?.presupuesto?.moneda || 'COP'}>
                        <option value="COP">COP - Peso Colombiano</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="presupuesto.fechaAprobacion">Fecha de Aprobación *</label>
                      <input
                        type="date"
                        id="presupuesto.fechaAprobacion"
                        name="presupuesto.fechaAprobacion"
                        required
                        className="form-input"
                        defaultValue={proyectoEditData?.presupuesto?.fechaAprobacion ? proyectoEditData.presupuesto.fechaAprobacion.slice(0,10) : ''}
                      />
                    </div>
                  </div>
                </div>

                {/* Información del Contratista */}
                <div className="form-section">
                  <h3>👷 Información del Contratista</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label htmlFor="contratista">Contratista *</label>
                      <select id="contratista" name="contratista" required className="form-select" defaultValue={typeof proyectoEditData?.contratista === 'object' ? proyectoEditData.contratista._id : proyectoEditData?.contratista || ''}>
                        <option value="">Seleccionar contratista</option>
                        {usuarios.map((usuario) => (
                          <option key={usuario._id} value={usuario._id}>
                            {usuario.nombre} {usuario.apellido} - {usuario.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => { setShowForm(false); setProyectoEditData(null); }}
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (proyectoEditData ? '⏳ Guardando...' : '⏳ Creando...') : (proyectoEditData ? '💾 Guardar Cambios' : '✅ Crear Proyecto')}
                  </button>
                </div>
              </form>
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

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .filters-section {
          background: #f9fafb;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          border: 1px solid #e5e7eb;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .search-input, .filter-select {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus, .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .content-section {
          margin-bottom: 32px;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 64px 24px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .radicados-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .radicado-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .radicado-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
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
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
        }

        .card-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-draft { background: #fef3c7; color: #92400e; }
        .status-active { background: #dbeafe; color: #1e40af; }
        .status-paused { background: #fee2e2; color: #dc2626; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #f3f4f6; color: #374151; }

        .priority-low { background: #f3f4f6; color: #374151; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-high { background: #fee2e2; color: #dc2626; }
        .priority-urgent { background: #7f1d1d; color: white; }

        .type-construction { background: #e0f2fe; color: #0c4a6e; }
        .type-infrastructure { background: #f0fdf4; color: #14532d; }
        .type-technology { background: #fdf4ff; color: #6b21a8; }
        .type-consulting { background: #fefce8; color: #713f12; }
        .type-other { background: #f9fafb; color: #374151; }

        .card-content h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .card-content .resumen {
          color: #6b7280;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .progress-bar {
          position: relative;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          right: 0;
          top: -20px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item .label {
          font-weight: 600;
          color: #374151;
        }

        .info-item .value {
          color: #6b7280;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
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
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .modal-subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-body {
          padding: 24px;
        }

        .detail-section {
          margin-bottom: 32px;
        }

        .detail-section h3 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .detail-item span {
          color: #6b7280;
          font-size: 14px;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .consecutivo-highlight {
          font-weight: 700;
          color: #1f2937;
          font-size: 16px;
        }

        .status-badge, .priority-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .asunto-text, .observaciones-text {
          margin: 0;
          line-height: 1.6;
          color: #374151;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-input, .form-select, .form-textarea {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .access-denied {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: 24px;
        }

        .access-denied-content {
          text-align: center;
          max-width: 400px;
        }

        .access-denied-content h2 {
          margin: 0 0 16px 0;
          color: #dc2626;
          font-size: 1.5rem;
        }

        .access-denied-content p {
          color: #6b7280;
          margin: 0;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          font-size: 16px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .archivo-container {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .radicados-grid {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .card-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProyectosPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const role = getUserRole();
  const { loading, menuItems, canAccess } = useMenuGeneration();

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setAuthenticated(authStatus);
      setIsLoading(false);

      if (!authStatus) {
        router.push('/auth/signin');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema de proyectos...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  if (!canAccess('proyectos')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a la gestión de proyectos</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex h-screen">
        {/* Menú lateral */}
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
          <DynamicMenu />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Header con perfil de usuario */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏗️ Gestión de Proyectos</h1>
                <p className="text-gray-600 text-sm">Administración y seguimiento de proyectos de interventoría</p>
              </div>
              <UserProfile />
            </div>
          </div>

          {/* Contenido de proyectos */}
          <div className="flex-1 overflow-auto">
            <Suspense fallback={
              <div className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            }>
              <ProyectoContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}