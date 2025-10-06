"use client";
import React from 'react';
import Link from 'next/link';
import Menu from '../components/Menu';

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
    { href: '/roles', label: 'Roles', roles: ['administrador'] },
  { href: '/usuarios', label: 'Usuarios', roles: ['administrador'] },
    { href: '/dashboard/proyectos', label: 'Proyectos', roles: ['administrador','interventor','contratista','supervisor'] }
  ];

  const items = menu.filter(m => m.roles.includes(role)).map(m => ({ href: m.href, label: m.label }));

  return (
    <div className="pi-main">
      <div>
        {/* Menu lateral */}
        <div style={{ position: 'sticky', top: 24 }}>
          <Menu items={items} />
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div className="pi-header">
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: '#6b7280' }}>Rol actual: <strong>{role}</strong></p>
          </div>
        </div>

        <section style={{ marginTop: 18 }}>
          <div className="pi-card">
            <h2>Bienvenido al panel</h2>
            <p>Selecciona una opción del menú para comenzar.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
