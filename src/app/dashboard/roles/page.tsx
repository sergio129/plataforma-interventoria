"use client";
import React, { useEffect, useState } from 'react';

interface Rol { _id: string; nombre: string; descripcion: string; activo: boolean }

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/roles')
      .then(r => r.json())
      .then(data => {
        if (data.success) setRoles(data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Cargando roles...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Gestión de Roles</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Descripción</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Activo</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(r => (
            <tr key={r._id}>
              <td style={{ padding: 8 }}>{r.nombre}</td>
              <td style={{ padding: 8 }}>{r.descripcion}</td>
              <td style={{ padding: 8 }}>{r.activo ? 'Sí' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
