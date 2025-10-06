import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PermisosManager } from '@/lib/models/Rol';

export async function GET(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request as unknown as Request);
    const permisos = await PermisosManager.getPermisosUsuario(payload.userId);
    return NextResponse.json({ success: true, data: permisos });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'No autorizado' }, { status: 401 });
  }
}
