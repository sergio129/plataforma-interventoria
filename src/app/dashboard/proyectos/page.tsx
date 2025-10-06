"use client";
import React, { useEffect, useState } from 'react';
import Menu from '../../components/Menu';
import UserProfile from '../../components/UserProfile';
import '../../roles/roles.css';
import { usePermissions } from '../../hooks/usePermissions';

interface Proyecto {
  _id?: string;
  nombre: string;
  descripcion: string;
  estado: 'activo' | 'inactivo' | 'completado';
  fechaInicio: string;
  fechaFin?: string;
  interventor?: string;
  contratista?: string;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: permissionsLoading, canAccessProjects, canAccessUsers, canAccessRoles } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      if (canAccessProjects()) {
        // Simulando carga de proyectos
        setTimeout(() => {
          setProyectos([
            {
              _id: '1',
              nombre: 'Construcción Edificio A',
              descripcion: 'Proyecto de construcción de edificio residencial',
              estado: 'activo',
              fechaInicio: '2024-01-15',
              interventor: 'María Elena González',
              contratista: 'Carlos Alberto Mendoza'
            },
            {
              _id: '2',
              nombre: 'Renovación Centro Comercial',
              descripcion: 'Renovación integral del centro comercial',
              estado: 'activo',
              fechaInicio: '2024-02-01',
              interventor: 'Ana Sofía Herrera',
              contratista: 'Juan Carlos Rodríguez'
            }
          ]);
          setLoading(false);
        }, 1000);
      } else {
        setLoading(false);
      }
    }
  }, [permissionsLoading, canAccessProjects]);

  // Filtrar menú basado en permisos reales
  const menuItems = [
    { href: '/dashboard', label: 'Inicio' },
    ...(canAccessProjects() ? [{ href: '/dashboard/proyectos', label: 'Proyectos' }] : []),
    ...(canAccessUsers() ? [{ href: '/usuarios', label: 'Usuarios' }] : []),
    ...(canAccessRoles() ? [{ href: '/roles', label: 'Roles' }] : [])
  ];

  // Si no tiene permisos, mostrar mensaje de error
  if (!permissionsLoading && !canAccessProjects()) {
    return (
      <div className="roles-page" style={{ padding: 28 }}>
        <aside style={{ position: 'sticky', top: 24 }}>
          <Menu items={[{ href: '/dashboard', label: 'Inicio' }]} />
        </aside>
        <main className="roles-main">
          <div style={{ padding: 0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2>Proyectos</h2>
              <div><UserProfile /></div>
            </div>
            <div className="message error">
              No tienes permisos para acceder a la gestión de proyectos. 
              Por favor contacta al administrador del sistema.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="roles-page" style={{ padding: 28 }}>
      <aside style={{ position: 'sticky', top: 24 }}>
        <Menu items={menuItems} />
      </aside>

      <main className="roles-main">
        <div style={{ padding: 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <h2>Proyectos</h2>
            <div>
              <UserProfile />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn primary">Nuevo Proyecto</button>
          </div>

          {loading ? (
            <div>Cargando proyectos...</div>
          ) : (
            <table className="roles-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Fecha Inicio</th>
                  <th>Interventor</th>
                  <th>Contratista</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map(proyecto => (
                  <tr key={proyecto._id}>
                    <td>{proyecto.nombre}</td>
                    <td>{proyecto.descripcion}</td>
                    <td>
                      <span className={`badge ${proyecto.estado === 'activo' ? 'badge-success' : proyecto.estado === 'completado' ? 'badge-info' : 'badge-warning'}`}>
                        {proyecto.estado}
                      </span>
                    </td>
                    <td>{new Date(proyecto.fechaInicio).toLocaleDateString()}</td>
                    <td>{proyecto.interventor}</td>
                    <td>{proyecto.contratista}</td>
                    <td>
                      <button className="btn ghost">Ver</button>
                      <button className="btn ghost">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}