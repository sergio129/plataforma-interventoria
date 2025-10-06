"use client";
import React, { useEffect, useState } from 'react';

interface Rol { _id?: string; nombre: string; descripcion: string; activo: boolean }

function RoleForm({ initial, onSave, onCancel }: { initial?: Rol; onSave: (r: Rol) => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [activo, setActivo] = useState(initial?.activo ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ _id: initial?._id, nombre, descripcion, activo });
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <label>Nombre</label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} required />
      <label>Descripción</label>
      <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} />
      <label><input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit">Guardar</button>
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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      const j = await res.json();
      if (j.success) setRoles(j.data || []);
    } finally { setLoading(false); }
  }

  async function saveRole(r: Rol) {
    if (r._id) {
      await fetch(`/api/roles/${r._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
    } else {
      await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function del(id?: string) {
    if (!id) return;
    if (!confirm('Eliminar rol?')) return;
    await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Gestión de Roles</h1>
        <div>
          <button onClick={() => { setShowForm(true); setEditing(null); }}>Nuevo Rol</button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <table style={{ width: '100%', marginTop: 12 }}>
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
          <div style={{ width: 680, background: 'white', padding: 20, borderRadius: 8 }}>
            <h3>{editing ? 'Editar Rol' : 'Nuevo Rol'}</h3>
            <RoleForm initial={editing || undefined} onSave={saveRole} onCancel={() => { setShowForm(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
