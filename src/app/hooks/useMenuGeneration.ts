"use client";
import { useMemo } from 'react';
import { usePermissions } from './usePermissions';

interface MenuItems {
  href: string;
  label: string;
  icon?: string;
  order: number;
}

// Mapeo de recursos basado en la estructura real de la base de datos
const RESOURCE_MENU_MAP: Record<string, MenuItems> = {
  'usuarios': { href: '/usuarios', label: 'Usuarios', icon: '👥', order: 1 },
  'proyectos': { href: '/proyectos', label: 'Proyectos', icon: '�', order: 2 },
  'documentos': { href: '/documentos', label: 'Documentos', icon: '📄', order: 3 },
  'reportes': { href: '/reportes', label: 'Reportes', icon: '📊', order: 4 },
  'configuracion': { href: '/configuracion', label: 'Configuración', icon: '⚙️', order: 5 },
};

export function useMenuGeneration() {
  const { permissions, loading, userRole } = usePermissions();

  const menuItems = useMemo(() => {
    // Siempre incluir el dashboard como primera opción
    const items: MenuItems[] = [
      { href: '/dashboard', label: 'Inicio', icon: '🏠', order: 0 }
    ];

    if (!permissions || loading) {
      return items;
    }

    // Generar elementos del menú basándose en los permisos reales de la base de datos
    permissions.forEach(permission => {
      const { recurso, acciones } = permission;
      
      // Si el usuario tiene alguna acción en el recurso, puede acceder
      if (acciones.length > 0) {
        const menuConfig = RESOURCE_MENU_MAP[recurso];
        if (menuConfig) {
          // Evitar duplicados
          const exists = items.some(item => item.href === menuConfig.href);
          if (!exists) {
            items.push(menuConfig);
          }
        }
      }
    });

    // Agregar roles solo para administradores (basándose en permisos reales)
    const canManageUsers = permissions.some(p => 
      p.recurso === 'usuarios' && 
      (p.acciones.includes('crear') || p.acciones.includes('actualizar') || p.acciones.includes('eliminar'))
    );
    
    const canManageConfig = permissions.some(p => 
      p.recurso === 'configuracion' && 
      p.acciones.includes('configurar')
    );

    // Solo mostrar roles si puede gestionar usuarios o configuración
    if (canManageUsers || canManageConfig || userRole === 'administrador' || userRole === 'Super Administrador') {
      const rolesExists = items.some(item => item.href === '/roles');
      if (!rolesExists) {
        items.push({ href: '/roles', label: 'Roles', icon: '🔐', order: 6 });
      }
    }

    // Ordenar elementos del menú
    return items.sort((a, b) => a.order - b.order);
  }, [permissions, loading, userRole]);

  const canAccess = (resource: string): boolean => {
    if (!permissions) return false;
    // Un usuario puede acceder si tiene cualquier acción en el recurso
    return permissions.some(p => 
      p.recurso === resource && p.acciones.length > 0
    );
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!permissions) return false;
    return permissions.some(p => 
      p.recurso === resource && p.acciones.includes(action)
    );
  };

  const getUserActions = (resource: string): string[] => {
    const permission = permissions.find(p => p.recurso === resource);
    return permission ? permission.acciones : [];
  };

  const canCreate = (resource: string): boolean => hasPermission(resource, 'crear');
  const canRead = (resource: string): boolean => hasPermission(resource, 'leer');
  const canUpdate = (resource: string): boolean => hasPermission(resource, 'actualizar');
  const canDelete = (resource: string): boolean => hasPermission(resource, 'eliminar');
  const canApprove = (resource: string): boolean => hasPermission(resource, 'aprobar');
  const canExport = (resource: string): boolean => hasPermission(resource, 'exportar');
  const canConfigure = (resource: string): boolean => hasPermission(resource, 'configurar');

  return {
    menuItems,
    loading,
    canAccess,
    hasPermission,
    getUserActions,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canApprove,
    canExport,
    canConfigure,
    permissions,
    userRole
  };
}