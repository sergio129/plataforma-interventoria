"use client";
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Menu from '../components/Menu';
import UserProfile from '../components/UserProfile';
import { usePermissions } from '../hooks/usePermissions';

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
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { loading, canAccessUsers, canAccessRoles, canAccessProjects } = usePermissions();

  // Filtrar menú basado en permisos reales
  const menuItems = [
    { href: '/dashboard', label: 'Inicio' },
    ...(canAccessProjects() ? [{ href: '/dashboard/proyectos', label: 'Proyectos' }] : []),
    ...(canAccessUsers() ? [{ href: '/usuarios', label: 'Usuarios' }] : []),
    ...(canAccessRoles() ? [{ href: '/roles', label: 'Roles' }] : [])
  ];

  if (loading) {
    return <div>Cargando permisos...</div>;
  }

  return (
    <div className="pi-main">
      <div>
        {/* Menu lateral */}
        <div style={{ position: 'sticky', top: 24 }}>
          <Menu items={menuItems} />
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div className="pi-header">
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: '#6b7280' }}>Rol actual: <strong>{role}</strong></p>
          </div>
          <div>
            <UserProfile />
          </div>
        </div>

        {error === 'access-denied' && (
          <div className="pi-card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', marginBottom: 24 }}>
            <h3 style={{ color: '#dc2626', margin: 0 }}>Acceso Denegado</h3>
            <p style={{ color: '#991b1b', margin: '8px 0 0 0' }}>
              No tienes permisos para acceder a la página solicitada. Tu rol actual es: <strong>{role}</strong>
            </p>
          </div>
        )}

        {/* Estadísticas del dashboard */}
        <div className="pi-stats-grid">
          <div className="pi-stat-card">
            <div className="pi-stat-icon users">👥</div>
            <div className="pi-stat-content">
              <h3>5</h3>
              <p>Usuarios Activos</p>
            </div>
          </div>
          <div className="pi-stat-card">
            <div className="pi-stat-icon projects">📋</div>
            <div className="pi-stat-content">
              <h3>2</h3>
              <p>Proyectos Activos</p>
            </div>
          </div>
          <div className="pi-stat-card">
            <div className="pi-stat-icon reports">📊</div>
            <div className="pi-stat-content">
              <h3>12</h3>
              <p>Reportes Este Mes</p>
            </div>
          </div>
          <div className="pi-stat-card">
            <div className="pi-stat-icon roles">⚙️</div>
            <div className="pi-stat-content">
              <h3>4</h3>
              <p>Roles Configurados</p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="pi-card">
          <h2>Acciones Rápidas</h2>
          <p style={{ marginBottom: 20 }}>Accede rápidamente a las funciones más utilizadas</p>
          <div className="pi-quick-actions">
            {canAccessUsers() && (
              <Link href="/usuarios" className="pi-quick-action">
                <div className="pi-quick-action-icon">👤</div>
                <div className="pi-quick-action-content">
                  <h4>Gestionar Usuarios</h4>
                  <p>Crear y editar usuarios</p>
                </div>
              </Link>
            )}
            {canAccessRoles() && (
              <Link href="/roles" className="pi-quick-action">
                <div className="pi-quick-action-icon">🔐</div>
                <div className="pi-quick-action-content">
                  <h4>Configurar Roles</h4>
                  <p>Administrar permisos</p>
                </div>
              </Link>
            )}
            {canAccessProjects() && (
              <Link href="/dashboard/proyectos" className="pi-quick-action">
                <div className="pi-quick-action-icon">📁</div>
                <div className="pi-quick-action-content">
                  <h4>Ver Proyectos</h4>
                  <p>Gestionar interventorías</p>
                </div>
              </Link>
            )}
            <Link href="/dashboard/reportes" className="pi-quick-action">
              <div className="pi-quick-action-icon">📈</div>
              <div className="pi-quick-action-content">
                <h4>Generar Reportes</h4>
                <p>Estadísticas y análisis</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
