"use client";
import { useState, useEffect, useMemo } from 'react';

interface Permission {
  recurso: string;
  acciones: string[];
}

interface MenuItems {
  href: string;
  label: string;
  icon?: string;
  order: number;
}

// Mapeo de recursos basado en la estructura real de la base de datos
const RESOURCE_MENU_MAP: Record<string, MenuItems> = {
  'usuarios': { href: '/usuarios', label: 'Usuarios', icon: '👥', order: 1 },
  'proyectos': { href: '/proyectos', label: 'Proyectos', icon: '📋', order: 2 },
  'archivo': { href: '/archivo', label: 'Archivo', icon: '📁', order: 3 },
  'documentos': { href: '/documentos', label: 'Documentos', icon: '📄', order: 4 },
  'reportes': { href: '/reportes', label: 'Reportes', icon: '📊', order: 5 },
  'configuracion': { href: '/configuracion', label: 'Configuración', icon: '⚙️', order: 6 },
  'evidencias': { href: '/evidencias', label: 'Evidencias', icon: '🧾', order: 7 }, // <--- Agregado
};

export function useMenuGeneration() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    fetchUserPermissions();
  }, []); // Solo ejecutar una vez al montar

  const fetchUserPermissions = async () => {
    if (isRequesting) return; // Evitar múltiples peticiones simultaneas
    
    try {
      setIsRequesting(true);
      setLoading(true);
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
        } else {
          console.error('Error en respuesta de permisos:', data);
        }
      } else {
        console.error('Error HTTP obteniendo permisos:', response.status);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
      setIsRequesting(false);
    }
  };

  const menuItems = useMemo(() => {
    // Siempre incluir el dashboard como primera opción
    const items: MenuItems[] = [
      { href: '/dashboard', label: 'Inicio', icon: '🏠', order: 0 }
    ];

    if (!permissions || loading) {
      return items;
    }

    // Generar elementos del menú basándose en los permisos reales de la base de datos
    permissions.forEach((permission: Permission) => {
      const { recurso, acciones } = permission;
      
      // Validar que acciones existe y es un array
      if (acciones && Array.isArray(acciones) && acciones.length > 0) {
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
    const canManageUsers = permissions.some((p: Permission) => 
      p.recurso === 'usuarios' && 
      (p.acciones.includes('crear') || p.acciones.includes('actualizar') || p.acciones.includes('eliminar'))
    );
    
    const canManageConfig = permissions.some((p: Permission) => 
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
    
    // Caso especial para roles - basado en si puede gestionar usuarios o configuración
    if (resource === 'roles') {
      const canManageUsers = permissions.some((p: Permission) => 
        p.recurso === 'usuarios' && 
        (p.acciones.includes('crear') || p.acciones.includes('actualizar') || p.acciones.includes('eliminar'))
      );
      
      const canManageConfig = permissions.some((p: Permission) => 
        p.recurso === 'configuracion' && 
        p.acciones.includes('configurar')
      );
      
      return canManageUsers || canManageConfig || userRole === 'administrador' || userRole === 'Super Administrador';
    }
    
    // Para otros recursos, verificar directamente
    return permissions.some((p: Permission) => 
      p.recurso === resource && p.acciones && Array.isArray(p.acciones) && p.acciones.length > 0
    );
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!permissions) return false;
    return permissions.some((p: Permission) => 
      p.recurso === resource && p.acciones && Array.isArray(p.acciones) && p.acciones.includes(action)
    );
  };

  const getUserActions = (resource: string): string[] => {
    const permission = permissions.find((p: Permission) => p.recurso === resource);
    return permission && permission.acciones && Array.isArray(permission.acciones) ? permission.acciones : [];
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
    userRole,
    refetch: fetchUserPermissions
  };
}