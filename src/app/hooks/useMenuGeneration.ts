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
  'documentos': { href: '/documentos', label: 'Documentos', icon: '📄', order: 3 },
  'reportes': { href: '/reportes', label: 'Reportes', icon: '📊', order: 4 },
  'configuracion': { href: '/configuracion', label: 'Configuración', icon: '⚙️', order: 5 },
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
          console.log('Permisos obtenidos:', data.data); // Debug
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
    }
  };

  const menuItems = useMemo(() => {
    // Siempre incluir el dashboard como primera opción
    const items: MenuItems[] = [
      { href: '/dashboard', label: 'Inicio', icon: '🏠', order: 0 }
    ];

    if (!permissions || loading) {
      console.log('No hay permisos o está cargando:', { permissions, loading });
      return items;
    }

    console.log('Generando menú con permisos:', permissions);

    // Generar elementos del menú basándose en los permisos reales de la base de datos
    permissions.forEach((permission: Permission) => {
      const { recurso, acciones } = permission;
      
      console.log(`Procesando recurso: ${recurso}, acciones:`, acciones);
      
      // Validar que acciones existe y es un array
      if (acciones && Array.isArray(acciones) && acciones.length > 0) {
        const menuConfig = RESOURCE_MENU_MAP[recurso];
        if (menuConfig) {
          // Evitar duplicados
          const exists = items.some(item => item.href === menuConfig.href);
          if (!exists) {
            console.log(`Agregando al menú: ${menuConfig.label}`);
            items.push(menuConfig);
          }
        }
      } else {
        console.log(`Recurso ${recurso} sin acciones válidas:`, acciones);
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
        console.log('Agregando roles al menú');
        items.push({ href: '/roles', label: 'Roles', icon: '🔐', order: 6 });
      }
    }

    // Ordenar elementos del menú
    const sortedItems = items.sort((a, b) => a.order - b.order);
    console.log('Menú final generado:', sortedItems);
    return sortedItems;
  }, [permissions, loading, userRole]);

  const canAccess = (resource: string): boolean => {
    if (!permissions) return false;
    // Un usuario puede acceder si tiene cualquier acción en el recurso
    const hasAccess = permissions.some((p: Permission) => 
      p.recurso === resource && p.acciones && Array.isArray(p.acciones) && p.acciones.length > 0
    );
    console.log(`canAccess(${resource}):`, hasAccess);
    return hasAccess;
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