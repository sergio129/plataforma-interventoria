'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import DynamicMenu from '../components/DynamicMenu';
import UserProfile from '../components/UserProfile';
import { useMenuGeneration } from '../hooks/useMenuGeneration';
import { usePermissions } from '../hooks/usePermissions';

interface Personal {
  _id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  email?: string;
  telefono?: string;
  cargo: string;
  tipoContrato: 'indefinido' | 'fijo' | 'obra_labor' | 'prestacion_servicios';
  estado: 'activo' | 'inactivo' | 'terminado' | 'suspendido';
  fechaIngreso: Date;
  fechaTerminacion?: Date;
  salario?: number;
  observaciones?: string;
  proyectoId?: {
    _id: string;
    nombre: string;
    codigo: string;
  };
  creadoPor?: {
    _id: string;
    nombre: string;
    apellido: string;
  };
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

const ESTADOS_COLORS = {
  activo: 'status-active',
  inactivo: 'status-inactive',
  terminado: 'status-terminated',
  suspendido: 'status-suspended'
};

const CONTRATO_COLORS = {
  indefinido: 'contract-indefinite',
  fijo: 'contract-fixed',
  obra_labor: 'contract-work',
  prestacion_servicios: 'contract-services'
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

function PersonalContent() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    tipoContrato: '',
    proyectoId: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [personalEditData, setPersonalEditData] = useState<Personal | null>(null);
  const [selectedPersonal, setSelectedPersonal] = useState<Personal | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [proyectos, setProyectos] = useState<any[]>([]);

  const { canAccessDocuments, loading: permissionsLoading, hasPermission } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      cargarPersonal();
      cargarProyectos();
    }
  }, [permissionsLoading, filtros]);

  const cargarPersonal = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.tipoContrato) params.append('tipoContrato', filtros.tipoContrato);
      if (filtros.proyectoId) params.append('proyectoId', filtros.proyectoId);

      const response = await fetch(`/api/personal?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPersonal(data.data.personal || []);
      } else {
        setError('Error al cargar el personal');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const cargarProyectos = async () => {
    try {
      const response = await fetch('/api/proyectos', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProyectos(data.data.proyectos || []);
      }
    } catch (err) {
      console.error('Error cargando proyectos:', err);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const handleVerDetalle = (persona: Personal) => {
    setSelectedPersonal(persona);
    setShowDetail(true);
  };

  const handleEditar = (persona: Personal) => {
    setPersonalEditData(persona);
    setShowForm(true);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este registro de personal?')) {
      return;
    }

    try {
      const response = await fetch(`/api/personal/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        toast.success('Personal eliminado exitosamente');
        cargarPersonal();
      } else {
        toast.error('Error al eliminar el personal');
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const method = personalEditData ? 'PUT' : 'POST';
      const url = personalEditData ? `/api/personal/${personalEditData._id}` : '/api/personal';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(personalEditData ? 'Personal actualizado exitosamente' : 'Personal registrado exitosamente');
        setShowForm(false);
        setPersonalEditData(null);
        cargarPersonal();
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          errorData.details.forEach((detail: string) => toast.error(detail));
        } else {
          toast.error(errorData.error || 'Error al guardar el personal');
        }
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setPersonalEditData(null);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedPersonal(null);
  };

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAccessDocuments) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tiene permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archivo-container">
      <div className="page-header">
        <div className="header-content">
          <h1>👥 Gestión de Personal</h1>
          <p>Administración del personal de la interventoría</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ➕ Nuevo Personal
          </button>
        </div>
      </div>

        {/* Filtros */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <input
                type="text"
                placeholder="🔍 Buscar personal..."
                value={filtros.search}
                onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                className="filter-select"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="terminado">Terminado</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={filtros.tipoContrato}
                onChange={(e) => setFiltros({...filtros, tipoContrato: e.target.value})}
                className="filter-select"
              >
                <option value="">Todos los contratos</option>
                <option value="indefinido">Indefinido</option>
                <option value="fijo">Fijo</option>
                <option value="obra_labor">Obra Labor</option>
                <option value="prestacion_servicios">Prestación de Servicios</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={filtros.proyectoId}
                onChange={(e) => setFiltros({...filtros, proyectoId: e.target.value})}
                className="filter-select"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map(proyecto => (
                  <option key={proyecto._id} value={proyecto._id}>
                    {proyecto.nombre} ({proyecto.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Personal */}
        <div className="content-section">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando personal...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={cargarPersonal} className="btn btn-secondary">
                🔄 Reintentar
              </button>
            </div>
          ) : (
            <div className="personal-grid">
              {personal.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>No hay personal registrado</h3>
                  <p>No se encontraron registros de personal con los filtros aplicados.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                  >
                    Registrar primer personal
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nombre Completo</th>
                        <th>Cédula</th>
                        <th>Cargo</th>
                        <th>Estado</th>
                        <th>Tipo Contrato</th>
                        <th>Proyecto</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map((persona) => (
                        <tr key={persona._id}>
                          <td>
                            <div className="person-info">
                              <span className="name">{persona.nombre} {persona.apellido}</span>
                              {persona.email && <span className="email">{persona.email}</span>}
                            </div>
                          </td>
                          <td>{persona.cedula}</td>
                          <td>{persona.cargo}</td>
                          <td>
                            <span className={`status-badge ${persona.estado}`}>
                              {persona.estado.charAt(0).toUpperCase() + persona.estado.slice(1)}
                            </span>
                          </td>
                          <td>
                            <span className={`contract-badge ${persona.tipoContrato}`}>
                              {persona.tipoContrato.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td>{persona.proyectoId ? `${persona.proyectoId.nombre} (${persona.proyectoId.codigo})` : 'Sin asignar'}</td>
                          <td>
                            <div className="action-buttons">
                              <button onClick={() => handleVerDetalle(persona)} className="btn-action view">Ver</button>
                              <button onClick={() => handleEditar(persona)} className="btn-action edit">Editar</button>
                              <button onClick={() => handleEliminar(persona._id)} className="btn-action delete">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      {showForm && (
        <PersonalForm
          personal={personalEditData}
          proyectos={proyectos}
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
        />
      )}

      {showDetail && selectedPersonal && (
        <PersonalDetail
          personal={selectedPersonal}
          onClose={handleCloseDetail}
        />
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
          font-weight: bold;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .header-content p {
          color: #6b7280;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .filters-section {
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
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
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          background: white;
        }

        .search-input:focus, .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .content-section {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-state {
          text-align: center;
          padding: 48px 24px;
          color: #dc2626;
        }

        .personal-grid {
          padding: 0;
        }

        .empty-state {
          text-align: center;
          padding: 64px 24px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          margin: 0 0 24px 0;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f8fafc;
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .person-info {
          display: flex;
          flex-direction: column;
        }

        .person-info .name {
          font-weight: 500;
          color: #111827;
        }

        .person-info .email {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .status-badge, .contract-badge {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.activo {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.inactivo {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.terminado {
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge.suspendido {
          background: #fee2e2;
          color: #991b1b;
        }

        .contract-badge {
          background: #e0e7ff;
          color: #3730a3;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-action.view {
          background: #dbeafe;
          color: #1e40af;
        }

        .btn-action.edit {
          background: #e0e7ff;
          color: #5b21b6;
        }

        .btn-action.delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .btn-action:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

// Componente de formulario
function PersonalForm({ personal, proyectos, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState({
    nombre: personal?.nombre || '',
    apellido: personal?.apellido || '',
    cedula: personal?.cedula || '',
    email: personal?.email || '',
    telefono: personal?.telefono || '',
    cargo: personal?.cargo || '',
    tipoContrato: personal?.tipoContrato || 'indefinido',
    estado: personal?.estado || 'activo',
    fechaIngreso: personal?.fechaIngreso ? new Date(personal.fechaIngreso).toISOString().split('T')[0] : '',
    fechaTerminacion: personal?.fechaTerminacion ? new Date(personal.fechaTerminacion).toISOString().split('T')[0] : '',
    salario: personal?.salario || '',
    observaciones: personal?.observaciones || '',
    proyectoId: personal?.proyectoId?._id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      salario: formData.salario ? parseFloat(formData.salario) : undefined,
      fechaTerminacion: formData.fechaTerminacion || undefined
    };

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            {personal ? 'Editar Personal' : 'Nuevo Personal'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.apellido}
                onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cédula *
              </label>
              <input
                type="text"
                required
                value={formData.cedula}
                onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo *
              </label>
              <input
                type="text"
                required
                value={formData.cargo}
                onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato *
              </label>
              <select
                required
                value={formData.tipoContrato}
                onChange={(e) => setFormData({...formData, tipoContrato: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="indefinido">Indefinido</option>
                <option value="fijo">Fijo</option>
                <option value="obra_labor">Obra Labor</option>
                <option value="prestacion_servicios">Prestación de Servicios</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                required
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="terminado">Terminado</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Ingreso *
              </label>
              <input
                type="date"
                required
                value={formData.fechaIngreso}
                onChange={(e) => setFormData({...formData, fechaIngreso: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Terminación
              </label>
              <input
                type="date"
                value={formData.fechaTerminacion}
                onChange={(e) => setFormData({...formData, fechaTerminacion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salario
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.salario}
                onChange={(e) => setFormData({...formData, salario: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proyecto
              </label>
              <select
                value={formData.proyectoId}
                onChange={(e) => setFormData({...formData, proyectoId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin asignar</option>
                {proyectos.map((proyecto: any) => (
                  <option key={proyecto._id} value={proyecto._id}>
                    {proyecto.nombre} ({proyecto.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {personal ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente de detalle
function PersonalDetail({ personal, onClose }: any) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Detalle del Personal</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <p className="text-gray-900">{personal.nombre} {personal.apellido}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cédula</label>
                  <p className="text-gray-900">{personal.cedula}</p>
                </div>

                {personal.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{personal.email}</p>
                  </div>
                )}

                {personal.telefono && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <p className="text-gray-900">{personal.telefono}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Laboral</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cargo</label>
                  <p className="text-gray-900">{personal.cargo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato</label>
                  <p className="text-gray-900">
                    {personal.tipoContrato.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <p className="text-gray-900">
                    {personal.estado.charAt(0).toUpperCase() + personal.estado.slice(1)}
                  </p>
                </div>

                {personal.salario && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Salario</label>
                    <p className="text-gray-900">{formatCurrency(personal.salario)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Ingreso</label>
                  <p className="text-gray-900">{formatDate(personal.fechaIngreso)}</p>
                </div>

                {personal.fechaTerminacion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Terminación</label>
                    <p className="text-gray-900">{formatDate(personal.fechaTerminacion)}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Proyecto</h3>

              <div className="space-y-3">
                {personal.proyectoId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Proyecto Asignado</label>
                    <p className="text-gray-900">
                      {personal.proyectoId.nombre} ({personal.proyectoId.codigo})
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Sin proyecto asignado</p>
                )}
              </div>
            </div>
          </div>

          {personal.observaciones && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{personal.observaciones}</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Creado: {formatDate(personal.fechaCreacion)}</span>
              {personal.fechaActualizacion && (
                <span>Actualizado: {formatDate(personal.fechaActualizacion)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Personal() {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando gestión de personal...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  if (!canAccess('personal')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a la gestión de personal</p>
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
                <h1 className="text-2xl font-bold text-gray-900">👥 Gestión de Personal</h1>
                <p className="text-gray-600 text-sm">Administración del personal de la interventoría</p>
              </div>
              <UserProfile />
            </div>
          </div>

          {/* Contenido del personal */}
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
              <PersonalContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}