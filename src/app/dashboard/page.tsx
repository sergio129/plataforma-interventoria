"use client";
import React from 'react';
import Link from 'next/link';

function getUserRole(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // Decodificar token simple (no validar) para extraer tipoUsuario
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.tipoUsuario || 'usuario';
    }
  } catch (e) {
    // ignore
  }
  // En dev, asumir administrador si no hay token
  return 'administrador';
}

export default function DashboardPage() {
  const role = getUserRole();

  const menu = [
    { href: '/dashboard', label: 'Inicio', roles: ['administrador','interventor','contratista','supervisor'] },
    { href: '/dashboard/roles', label: 'Roles', roles: ['administrador'] },
    { href: '/dashboard/usuarios', label: 'Usuarios', roles: ['administrador'] },
    { href: '/dashboard/proyectos', label: 'Proyectos', roles: ['administrador','interventor','contratista','supervisor'] }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Rol actual: <strong>{role}</strong></p>

      <nav style={{ marginTop: 16 }}>
        <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0 }}>
          {menu.filter(m => m.roles.includes(role)).map(m => (
            <li key={m.href}><Link href={m.href} style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: 6 }}>{m.label}</Link></li>
          ))}
        </ul>
      </nav>

      <section style={{ marginTop: 24 }}>
        <h2>Bienvenido al panel</h2>
        <p>Selecciona una opción del menú para comenzar.</p>
      </section>
    </div>
  );
}
