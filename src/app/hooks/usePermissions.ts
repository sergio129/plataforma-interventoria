"use client";
import { useEffect, useState } from 'react';

interface Permission {
  recurso: string;
  acciones: string[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Obtener rol del token
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.tipoUsuario || '');

      // Obtener permisos reales de la API
      const response = await fetch('/api/permisos/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (recurso: string, accion: string = 'acceder'): boolean => {
    return permissions.some(permission => 
      permission.recurso === recurso && 
      permission.acciones.includes(accion)
    );
  };

  const canAccessUsers = (): boolean => {
    return hasPermission('usuarios', 'leer') || hasPermission('usuarios', 'acceder');
  };

  const canAccessRoles = (): boolean => {
    return hasPermission('usuarios', 'crear') || hasPermission('usuarios', 'actualizar') || userRole === 'administrador';
  };

  const canAccessProjects = (): boolean => {
    return hasPermission('proyectos', 'leer') || hasPermission('proyectos', 'acceder');
  };

  return {
    permissions,
    loading,
    userRole,
    hasPermission,
    canAccessUsers,
    canAccessRoles,
    canAccessProjects,
    refetch: fetchUserPermissions
  };
}