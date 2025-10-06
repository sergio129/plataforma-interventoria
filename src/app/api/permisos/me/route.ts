import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import { getUserFromRequest } from '../../../../lib/auth';
import { PermisosManager } from '../../../../lib/models/Rol';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const payload = getUserFromRequest(request as unknown as Request);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const permisos = await PermisosManager.getPermisosUsuario(payload.userId);
    
    return NextResponse.json({ 
      success: true, 
      data: permisos,
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
