"use client";

import { useState, useEffect } from 'react';

interface PermissionHook {
  canAccessDocuments: () => boolean;
  canAccessProjects: () => boolean;
  hasPermission: (resource: string, action: string) => boolean;
  loading: boolean;
}

export function usePermissions(): PermissionHook {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const checkUserRole = () => {
      try {
        const token = typeof window !== 'undefined' ?
          (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;

        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.tipoUsuario || 'usuario');
        }
      } catch (e) {
        console.error('Error decoding token:', e);
        setUserRole('usuario');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  const canAccessDocuments = (): boolean => {
    return ['administrador', 'interventor', 'usuario'].includes(userRole);
  };

  const canAccessProjects = (): boolean => {
    return ['administrador', 'interventor', 'usuario'].includes(userRole);
  };

  const hasPermission = (resource: string, action: string): boolean => {
    // Lógica básica de permisos - puede expandirse según necesidades
    const permissions: Record<string, Record<string, string[]>> = {
      archivo: {
        leer: ['administrador', 'interventor', 'usuario'],
        crear: ['administrador', 'interventor'],
        actualizar: ['administrador', 'interventor'],
        eliminar: ['administrador']
      },
      proyectos: {
        leer: ['administrador', 'interventor', 'usuario'],
        crear: ['administrador', 'interventor'],
        actualizar: ['administrador', 'interventor'],
        eliminar: ['administrador']
      }
    };

    return permissions[resource]?.[action]?.includes(userRole) || false;
  };

  return {
    canAccessDocuments,
    canAccessProjects,
    hasPermission,
    loading
  };
}