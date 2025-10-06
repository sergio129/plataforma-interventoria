"use client";
import React from 'react';
import DynamicMenu from '../components/DynamicMenu';
import UserProfile from '../components/UserProfile';
import { useMenuGeneration } from '../hooks/useMenuGeneration';

export default function ReportesPage() {
  const { loading, canAccess } = useMenuGeneration();

  // Si está cargando permisos, mostrar loading
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <main style={{ flex: 1, padding: '2rem', textAlign: 'center' }}>
          <div>Verificando permisos...</div>
        </main>
      </div>
    );
  }

  // Si no tiene permisos, mostrar mensaje de error
  if (!canAccess('reportes')) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', gap: '2rem', padding: '1.5rem' }}>
        <aside style={{ position: 'sticky', top: 24 }}>
          <DynamicMenu />
        </aside>
        <main style={{ flex: 1 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937' }}>Gestión de Reportes</h1>
              <div style={{ marginLeft: 8 }}>
                <React.Suspense fallback={<div />}>
                  <UserProfile />
                </React.Suspense>
              </div>
            </div>
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', color: '#dc2626' }}>
              No tienes permisos para acceder a la gestión de reportes. 
              Por favor contacta al administrador del sistema.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', gap: '2rem', padding: '1.5rem' }}>
      <aside style={{ position: 'sticky', top: 24 }}>
        <DynamicMenu />
      </aside>
      <main style={{ flex: 1 }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937' }}>Gestión de Reportes</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                Generar Reporte
              </button>
              <div style={{ marginLeft: 8 }}>
                <React.Suspense fallback={<div />}>
                  <UserProfile />
                </React.Suspense>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Módulo de Reportes</h2>
            <p>Aquí podrás generar y gestionar todos los reportes de interventoría.</p>
            <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
              Funcionalidad en desarrollo...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}