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
        setProyectos(data.data || []);
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
    <div className="min-h-screen bg-gray-50">
      <DynamicMenu />
      <UserProfile />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Gestión de Personal</h1>
                <p className="text-blue-100 mt-1">Administrar personal de proyectos de concesión</p>
              </div>
              {hasPermission('personal', 'create') && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  + Nuevo Personal
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, cédula..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="terminado">Terminado</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
              <div>
                <select
                  value={filtros.tipoContrato}
                  onChange={(e) => setFiltros({...filtros, tipoContrato: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los contratos</option>
                  <option value="indefinido">Indefinido</option>
                  <option value="fijo">Fijo</option>
                  <option value="obra_labor">Obra Labor</option>
                  <option value="prestacion_servicios">Prestación de Servicios</option>
                </select>
              </div>
              <div>
                <select
                  value={filtros.proyectoId}
                  onChange={(e) => setFiltros({...filtros, proyectoId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="overflow-x-auto">
            {error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={cargarPersonal}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Reintentar
                </button>
              </div>
            ) : personal.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron registros de personal</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cédula
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo Contrato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {personal.map((persona) => (
                    <tr key={persona._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {persona.nombre} {persona.apellido}
                        </div>
                        {persona.email && (
                          <div className="text-sm text-gray-500">{persona.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {persona.cedula}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {persona.cargo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ESTADOS_COLORS[persona.estado]}`}>
                          {persona.estado.charAt(0).toUpperCase() + persona.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${CONTRATO_COLORS[persona.tipoContrato]}`}>
                          {persona.tipoContrato.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {persona.proyectoId ? `${persona.proyectoId.nombre} (${persona.proyectoId.codigo})` : 'Sin asignar'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVerDetalle(persona)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver
                          </button>
                          {hasPermission('personal', 'update') && (
                            <button
                              onClick={() => handleEditar(persona)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Editar
                            </button>
                          )}
                          {hasPermission('personal', 'delete') && (
                            <button
                              onClick={() => handleEliminar(persona._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
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
        </div>
      </div>

      {/* Modal de Formulario */}
      {showForm && (
        <PersonalForm
          personal={personalEditData}
          proyectos={proyectos}
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
        />
      )}

      {/* Modal de Detalle */}
      {showDetail && selectedPersonal && (
        <PersonalDetail
          personal={selectedPersonal}
          onClose={handleCloseDetail}
        />
      )}
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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/signin');
      return;
    }

    const role = getUserRole();
    if (!role) {
      router.push('/auth/signin');
      return;
    }
  }, [router]);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PersonalContent />
    </Suspense>
  );
}