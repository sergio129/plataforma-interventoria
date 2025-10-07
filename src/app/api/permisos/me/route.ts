import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import { getUserFromRequest } from '../../../../lib/auth';
import { PermisosManager } from '../../../../lib/models/Rol';

// Marcar la ruta como dinámica
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const payload = getUserFromRequest(request as unknown as Request);
    if (!payload || !payload.userId) {
      console.log('Token inválido o userId faltante:', payload);
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    console.log('Buscando permisos para usuario:', {
      userId: payload.userId,
      tipoUsuario: payload.tipoUsuario,
      email: payload.email
    });

    let permisos = await PermisosManager.getPermisosUsuario(payload.userId);
    console.log('Permisos encontrados por roles asignados:', permisos);
    
    // FALLBACK: Si no hay permisos por roles asignados, buscar por tipoUsuario
    if (!permisos || permisos.length === 0) {
      console.log('⚠️ Usuario sin roles asignados, buscando por tipoUsuario:', payload.tipoUsuario);
      
      try {
        // Buscar rol por nombre que coincida con tipoUsuario
        const { Rol } = await import('../../../../models/Rol');
        const tipoUsuario = payload.tipoUsuario || '';
        const rolPorTipo = await Rol.findOne({ 
          nombre: { $regex: new RegExp(tipoUsuario, 'i') },
          activo: true 
        });
        
        if (rolPorTipo) {
          console.log('✅ Rol encontrado por tipoUsuario:', rolPorTipo.nombre);
          permisos = rolPorTipo.permisos || [];
          console.log('📋 Permisos obtenidos por fallback:', permisos);
        } else {
          console.log('❌ No se encontró rol para tipoUsuario:', payload.tipoUsuario);
          
          // Buscar rol exacto "Interventor" si el tipoUsuario es "interventor"
          if (payload.tipoUsuario?.toLowerCase() === 'interventor') {
            const { Rol } = await import('../../../../models/Rol');
            const rolInterventor = await Rol.findOne({ nombre: 'Interventor', activo: true });
            if (rolInterventor) {
              console.log('✅ Usando rol Interventor por defecto');
              permisos = rolInterventor.permisos || [];
              console.log('📋 Permisos de Interventor:', permisos);
            }
          }
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback por tipoUsuario:', fallbackError);
      }
    }
    
    // Transformar permisos a formato simple para el frontend
    const permisosSimplificados = (permisos || []).map(p => {
      // Extraer datos del documento de Mongoose de forma segura
      const permiso = (p as any)?._doc || p;
      return {
        recurso: permiso.recurso,
        acciones: permiso.acciones || []
      };
    });

    console.log('🎯 Permisos simplificados enviados al frontend:', permisosSimplificados);

    return NextResponse.json({ 
      success: true, 
      data: permisosSimplificados,
      user: {
        id: payload.userId,
        tipoUsuario: payload.tipoUsuario,
        email: payload.email
      }
    });
  } catch (err: any) {
    console.error('Error en /api/permisos/me:', err);
    return NextResponse.json({ success: false, message: err?.message || 'No autorizado' }, { status: 401 });
  }
}
