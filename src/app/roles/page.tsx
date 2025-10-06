"use client";
import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import './roles.css';

interface Permiso { recurso: string; acciones: string[] }
interface Rol { _id?: string; nombre: string; descripcion: string; activo: boolean; permisos?: Permiso[] }

function RoleForm({ initial, onSave, onCancel, tabbed, recursos, externalTab, onExternalTabChange }: { initial?: Rol; onSave: (r: Rol) => void; onCancel: () => void; tabbed?: boolean; recursos?: { key: string; label: string }[]; externalTab?: string | null; onExternalTabChange?: (t: string) => void }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [permisos, setPermisos] = useState<Permiso[]>(initial?.permisos || []);
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) {
      setPermisos([]);
    }
  }, [initial]);

  // sync external tab selection (from left column)
  useEffect(() => {
    if (externalTab) setCurrentTab(externalTab);
  }, [externalTab]);

  function toggleAccion(recurso: string, accion: string) {
    setPermisos(prev => {
      const idx = prev.findIndex(p => p.recurso === recurso);
      if (idx === -1) {
        return [...prev, { recurso, acciones: [accion] }];
      }
      return prev.map(p => {
        if (p.recurso !== recurso) return p;
        const tiene = p.acciones.includes(accion);
        return { ...p, acciones: tiene ? p.acciones.filter(a => a !== accion) : [...p.acciones, accion] };
      });
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNombreError(null);
    setDescError(null);
    let hasError = false;
    if (!nombre || nombre.trim().length < 2) {
      setNombreError('Este campo es obligatorio y debe tener al menos 2 caracteres');
      hasError = true;
    }
    if (!descripcion || descripcion.trim().length < 2) {
      setDescError('Este campo es obligatorio y debe tener al menos 2 caracteres');
      hasError = true;
    }
    if (hasError) return;
    setSaving(true);
    try {
      await onSave({ _id: initial?._id, nombre: nombre.trim(), descripcion: descripcion.trim(), activo, permisos });
    } catch (err: any) {
      setError(err?.message || 'Error guardando');
    } finally { setSaving(false); }
  }

  const acciones = ['leer','crear','actualizar','eliminar','aprobar','exportar','configurar','acceder'];

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Nombre del Rol<span className="asterisco">*</span></label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} required aria-required="true"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400" />
        </div>
        {nombreError && (
          <div className="flex items-center space-x-1 text-red-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span className="text-sm">{nombreError}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Descripción <span className="asterisco">*</span></label>
        <div>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} required aria-required="true"
            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400" />
        </div>
        {descError && (
          <div className="flex items-center space-x-1 text-red-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span className="text-sm">{descError}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Estado</label>
        <label className="flex items-center gap-2 text-gray-700 font-medium">
          <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo
        </label>
      </div>
      <div className="space-y-2">
        <strong className="block text-sm font-semibold text-gray-700 mb-1">Permisos</strong>
        {tabbed ? (
          <div>
            <div className="tabs">
              {(recursos || []).map(r => (
                <button key={r.key} type="button" className={`tab ${currentTab === r.key ? 'active' : ''}`} onClick={() => { setCurrentTab(r.key); if (onExternalTabChange) onExternalTabChange(r.key); }}>{r.label}</button>
              ))}
            </div>
            <div className="tab-content">
              {(recursos || []).map(r => {
                if (r.key !== currentTab) return null;
                return (
                  <div key={r.key} className="border rounded-md p-3">
                    <div className="font-semibold mb-2">{r.label}</div>
                    <div className="grid grid-cols-4 gap-2">
                      {acciones.map(a => {
                        const permiso = permisos.find(p => p.recurso === r.key);
                        const checked = permiso ? permiso.acciones.includes(a) : false;
                        return (
                          <label key={a + r.key} className="flex items-center gap-2 text-gray-700 font-medium">
                            <input type="checkbox" checked={checked} onChange={() => toggleAccion(r.key, a)} /> {a}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(recursos || []).map(r => (
              <div key={r.key} className="border rounded-md p-3">
                <div className="font-semibold mb-2">{r.label}</div>
                <div className="grid grid-cols-4 gap-2">
                  {acciones.map(a => {
                    const permiso = permisos.find(p => p.recurso === r.key);
                    const checked = permiso ? permiso.acciones.includes(a) : false;
                    return (
                      <label key={a + r.key} className="flex items-center gap-2 text-gray-700 font-medium">
                        <input type="checkbox" checked={checked} onChange={() => toggleAccion(r.key, a)} /> {a}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel}
          className="px-6 py-3 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all font-medium">
          Cancelar
        </button>
        <button type="submit"
          className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl flex items-center space-x-2"
          disabled={saving}>
          <span>{saving ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>
    </form>
  );
}

export default function RolesPublicPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rol | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [recursos, setRecursos] = useState<{ key: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [recursosLoading, setRecursosLoading] = useState(true);
  const FALLBACK_RECURSOS = [
    { key: 'usuarios', label: 'usuarios' },
    { key: 'proyectos', label: 'proyectos' },
    { key: 'documentos', label: 'documentos' },
    { key: 'reportes', label: 'reportes' },
    { key: 'configuracion', label: 'configuracion' }
  ];
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roles');
      const j = await res.json();
      if (j.success) setRoles(j.data || []);
      else setError(j.message || 'Error cargando roles');
    } catch (err: any) {
      setError(err?.message || 'Error de red');
    } finally { setLoading(false); }
  }

  // load recursos for tabs
  useEffect(() => {
    async function loadRecursos() {
      try {
        const r = await fetch('/api/permisos/resources');
        const j = await r.json();
        if (j.success) {
          setRecursos(j.data.recursos || []);
          setActiveTab((j.data.recursos && j.data.recursos[0] && j.data.recursos[0].key) || null);
        } else {
          setRecursos(FALLBACK_RECURSOS);
          setActiveTab(FALLBACK_RECURSOS[0].key);
        }
      } catch (e) {
        setRecursos(FALLBACK_RECURSOS);
        setActiveTab(FALLBACK_RECURSOS[0].key);
      } finally {
        setRecursosLoading(false);
      }
    }
    loadRecursos();
  }, []);

  function getAuthHeaders(): Record<string, string> {
    try {
      const raw = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!raw) return headers;
      // Intentar parsear JSON; si falla, asumir token crudo (JWT)
      let tokenValue: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        tokenValue = parsed?.token || (typeof parsed === 'string' ? parsed : null);
      } catch {
        tokenValue = raw; // token crudo
      }
      if (tokenValue) headers['Authorization'] = `Bearer ${tokenValue}`;
      return headers;
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }

  async function saveRole(r: Rol) {
  setError(null);
    const headers = getAuthHeaders();
    const opts = { headers, body: JSON.stringify(r) } as any;
    try {
      let res;
      if (r._id) {
        res = await fetch(`/api/roles/${r._id}`, { method: 'PUT', ...opts });
      } else {
        res = await fetch('/api/roles', { method: 'POST', ...opts });
      }
      const j = await res.json();
      if (!res.ok || !j.success) {
        setToast({ message: j.message || 'Error guardando rol', type: 'error' });
        throw new Error(j.message || 'Error guardando rol');
      }
      setToast({ message: r._id ? 'Rol editado correctamente' : 'Rol creado correctamente', type: 'success' });
      setShowForm(false); setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Error guardando');
      throw err;
    }
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  function askDelete(id?: string) {
    if (!id) return;
    setRoleToDelete(id);
    setConfirmOpen(true);
  }

  async function delConfirmed() {
    if (!roleToDelete) return;
    setConfirmOpen(false);
    setError(null);
    const headers = getAuthHeaders();
    try {
      const res = await fetch(`/api/roles/${roleToDelete}`, { method: 'DELETE', headers });
      const j = await res.json();
      if (!res.ok || !j.success) {
        setToast({ message: j.message || 'Error eliminando rol', type: 'error' });
        throw new Error(j.message || 'Error eliminando');
      }
      setToast({ message: 'Rol eliminado', type: 'success' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando');
    } finally {
      setRoleToDelete(null);
    }
  }

  const items = [
    { href: '/dashboard', label: 'Inicio' },
    { href: '/roles', label: 'Roles' },
    { href: '/dashboard/usuarios', label: 'Usuarios' }
  ];

  return (
    <div className="roles-page">
      <aside style={{ position: 'sticky', top: 24 }}>
        <Menu items={items} />
      </aside>

      <main className="roles-main">
        <div className="roles-card">
          <div className="roles-header">
            <h1>Gestión de Roles</h1>
            <div className="roles-actions">
              <button className="btn primary" onClick={() => { setShowForm(true); setEditing(null); }}>Nuevo Rol</button>
            </div>
          </div>

          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {error && <div className="message error">{error}</div>}

          {loading ? <div style={{ padding: 24 }}>Cargando roles...</div> : (
            <table className="roles-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r._id}>
                    <td>{r.nombre}</td>
                    <td>{r.descripcion}</td>
                    <td>{r.activo ? 'Sí' : 'No'}</td>
                    <td>
                      <button className="btn ghost" onClick={() => { setEditing(r); setShowForm(true); }}>Editar</button>
                      <button className="btn danger" onClick={() => askDelete(r._id)}>Eliminar</button>
          <ConfirmModal
            open={confirmOpen}
            message="¿Está seguro que desea eliminar este rol?"
            onConfirm={delConfirmed}
            onCancel={() => { setConfirmOpen(false); setRoleToDelete(null); }}
          />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showForm && (
            <div className="fs-modal-overlay" role="dialog" aria-modal="true" onClick={() => { setShowForm(false); setEditing(null); }}>
              <div className="fs-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-icon">📝</span>
                  <h3 style={{ margin: 0, flex: 1, textAlign: 'left' }}>{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
                  <button className="close-btn" onClick={() => { setShowForm(false); setEditing(null); }} aria-label="Cerrar">&times;</button>
                </div>
                <div className="modal-body">
                  <div className="left">
                    <div style={{ padding: 8, color: '#64748b', fontWeight: 600 }}>Módulos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {recursosLoading ? (
                        <div className="left module-placeholder">Cargando módulos…</div>
                      ) : (recursos.length === 0 ? (
                        <div className="left module-placeholder">No hay módulos</div>
                      ) : (
                        recursos.map(r => (
                          <button key={r.key} type="button" className={`module-btn ${activeTab === r.key ? 'active' : ''}`} onClick={() => setActiveTab(r.key)}>{r.label}</button>
                        ))
                      ))}
                    </div>
                  </div>
                  <div className="right">
                    <RoleForm tabbed recursos={recursos} externalTab={activeTab} onExternalTabChange={t => setActiveTab(t)} initial={editing || undefined} onSave={saveRole} onCancel={() => { setShowForm(false); setEditing(null); }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
