"use client";
import React, { useEffect, useState } from 'react';
import Menu from '../components/Menu';

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
    setPermisos(prev => prev.map(p => {
      if (p.recurso !== recurso) return p;
      const tiene = p.acciones.includes(accion);
      return { ...p, acciones: tiene ? p.acciones.filter(a => a !== accion) : [...p.acciones, accion] };
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre || nombre.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return; }
    setSaving(true);
    try {
      await onSave({ _id: initial?._id, nombre: nombre.trim(), descripcion: descripcion.trim(), activo, permisos });
    } catch (err: any) {
      setError(err?.message || 'Error guardando');
    } finally { setSaving(false); }
  }

  const acciones = ['leer','crear','actualizar','eliminar','aprobar','exportar','configurar'];

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <label>Nombre</label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} required />
      <label>Descripción</label>
      <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} />
      <label><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo</label>

      <div>
        <strong>Permisos</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
          {acciones.map(a => (
            <label key={a} style={{ fontSize: 14 }}>
              <input type="checkbox" checked={permisos.some(p => p.acciones.includes(a))} onChange={() => toggleAccion('configuracion', a)} /> {a}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={onCancel}>Cancelar</button>
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
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!token) return headers;
      const parsed = JSON.parse(token);
      const value = parsed?.token || token;
      if (value) headers['Authorization'] = `Bearer ${value}`;
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
    { href: '/dashboard/roles', label: 'Roles' },
    { href: '/dashboard/usuarios', label: 'Usuarios' }
  ];

  return (
    <div className="pi-main">
      <aside style={{ position: 'sticky', top: 24 }}>
        <Menu items={items} />
      </aside>

      <main style={{ flex: 1 }}>
        <div className="pi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Gestión de Roles</h1>
            <div>
              <button onClick={() => { setShowForm(true); setEditing(null); }}>Nuevo Rol</button>
            </div>
          </div>

          {message && <div style={{ color: 'green' }}>{message}</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}

          {loading ? <div style={{ padding: 24 }}>Cargando roles...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Descripción</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Activo</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r._id}>
                    <td style={{ padding: 8 }}>{r.nombre}</td>
                    <td style={{ padding: 8 }}>{r.descripcion}</td>
                    <td style={{ padding: 8 }}>{r.activo ? 'Sí' : 'No'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => { setEditing(r); setShowForm(true); }}>Editar</button>
                      <button onClick={() => del(r._id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showForm && (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.5)' }}>
              <div style={{ width: 820, background: 'white', padding: 20, borderRadius: 8 }}>
                <h3>{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
                <RoleForm initial={editing || undefined} onSave={saveRole} onCancel={() => { setShowForm(false); setEditing(null); }} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
