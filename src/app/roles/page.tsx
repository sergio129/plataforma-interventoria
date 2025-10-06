"use client";
import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import './roles.css';

interface Permiso { recurso: string; acciones: string[] }
interface Rol { _id?: string; nombre: string; descripcion: string; activo: boolean; permisos?: Permiso[] }

function RoleForm({ initial, onSave, onCancel }: { initial?: Rol; onSave: (r: Rol) => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [permisos, setPermisos] = useState<Permiso[]>(initial?.permisos || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) {
      // inicializar permisos con recursos y vacíos
      setPermisos([{
        recurso: 'configuracion',
        acciones: []
      }]);
    }
  }, [initial]);

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
    const errores: string[] = [];
    if (!nombre || nombre.trim().length < 2) {
      errores.push('El campo "Nombre" es obligatorio y debe tener al menos 2 caracteres');
    }
    if (!descripcion || descripcion.trim().length < 2) {
      errores.push('El campo "Descripción" es obligatorio y debe tener al menos 2 caracteres');
    }
    if (errores.length > 0) {
      setError(errores.join('. '));
      return;
    }
    setSaving(true);
    try {
      await onSave({ _id: initial?._id, nombre: nombre.trim(), descripcion: descripcion.trim(), activo, permisos });
    } catch (err: any) {
      setError(err?.message || 'Error guardando');
    } finally { setSaving(false); }
  }

  const acciones = ['leer','crear','actualizar','eliminar','aprobar','exportar','configurar'];

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      {error && <div className="message error">{error}</div>}
      <div className="form-row">
        <label>Nombre</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} required />
      </div>
      <div className="form-row">
        <label>Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} />
      </div>
      <div className="form-row">
        <label>Estado</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo</label>
      </div>

      <div>
        <strong>Permisos</strong>
        <div className="perms-grid">
          {acciones.map(a => {
            const permiso = permisos.find(p => p.recurso === 'configuracion');
            const checked = permiso ? permiso.acciones.includes(a) : false;
            return (
              <label key={a}>
                <input type="checkbox" checked={checked} onChange={() => toggleAccion('configuracion', a)} /> {a}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start', marginTop: 12 }}>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function RolesPublicPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rol | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null); setError(null);
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
        throw new Error(j.message || 'Error guardando rol');
      }
      setMessage('Rol guardado correctamente');
      setShowForm(false); setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Error guardando');
      throw err;
    }
  }

  async function del(id?: string) {
    if (!id) return;
    if (!confirm('Eliminar rol?')) return;
    setMessage(null); setError(null);
    const headers = getAuthHeaders();
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', headers });
      const j = await res.json();
      if (!res.ok || !j.success) {
        throw new Error(j.message || 'Error eliminando');
      }
      setMessage('Rol eliminado');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando');
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

          {message && <div className="message success">{message}</div>}
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
                      <button className="btn danger" onClick={() => del(r._id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showForm && (
            <div className="modal-overlay">
                <div className="modal-card">
                  <div className="modal-header">
                    <h3 style={{ margin: 0 }}>{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
                    <button className="close-btn" onClick={() => { setShowForm(false); setEditing(null); }}>&times;</button>
                  </div>
                  <div className="modal-body">
                    <RoleForm initial={editing || undefined} onSave={saveRole} onCancel={() => { setShowForm(false); setEditing(null); }} />
                  </div>
                </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
