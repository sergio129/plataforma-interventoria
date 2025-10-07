"use client";
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import DynamicMenu from '../components/DynamicMenu';
import UserProfile from '../components/UserProfile';
import { useMenuGeneration } from '../hooks/useMenuGeneration';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now; // Verificar que el token no haya expirado
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

function DashboardContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const role = getUserRole();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { loading, menuItems, canAccess } = useMenuGeneration();

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setAuthenticated(authStatus);
      setIsLoading(false);
      
      if (!authStatus) {
        // Redirigir al login si no está autenticado
        router.replace('/auth/signin?redirect=dashboard');
        return;
      }
    };

    checkAuth();
  }, [router]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)'
      }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Verificando autenticación...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (se redirige)
  if (!authenticated) {
    return null;
  }

  // Menú se genera dinámicamente

  if (loading) {
    return <div>Cargando permisos...</div>;
  }

  return (
    <div className="pi-main">
      <div>
        {/* Menu lateral */}
        <div style={{ position: 'sticky', top: 24 }}>
          <DynamicMenu />
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div className="pi-header">
          <div>
            <h1>Consorcio interventoria de tránsito de Montería - CINTRANS</h1>
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
            {canAccess('usuarios') && (
              <Link href="/usuarios" className="pi-quick-action">
                <div className="pi-quick-action-icon">👤</div>
                <div className="pi-quick-action-content">
                  <h4>Gestionar Usuarios</h4>
                  <p>Crear y editar usuarios</p>
                </div>
              </Link>
            )}
            {canAccess('roles') && (
              <Link href="/roles" className="pi-quick-action">
                <div className="pi-quick-action-icon">🔐</div>
                <div className="pi-quick-action-content">
                  <h4>Configurar Roles</h4>
                  <p>Administrar permisos</p>
                </div>
              </Link>
            )}
            {canAccess('proyectos') && (
              <Link href="/proyectos" className="pi-quick-action">
                <div className="pi-quick-action-icon">📁</div>
                <div className="pi-quick-action-content">
                  <h4>Ver Proyectos</h4>
                  <p>Gestionar interventorías</p>
                </div>
              </Link>
            )}
            {canAccess('documentos') && (
              <Link href="/dashboard/documentos" className="pi-quick-action">
                <div className="pi-quick-action-icon">📄</div>
                <div className="pi-quick-action-content">
                  <h4>Documentos</h4>
                  <p>Gestionar archivos</p>
                </div>
              </Link>
            )}
            {canAccess('reportes') && (
              <Link href="/dashboard/reportes" className="pi-quick-action">
                <div className="pi-quick-action-icon">📈</div>
                <div className="pi-quick-action-content">
                  <h4>Generar Reportes</h4>
                  <p>Estadísticas y análisis</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)'
      }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
