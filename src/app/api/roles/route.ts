import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import { Rol, PermisosManager, TipoRecurso, TipoPermiso } from '../../../lib/models/Rol';
import { getUserFromRequest } from '../../../lib/auth';

export async function GET() {
  try {
    await connectToDatabase();
    // Asegurar roles por defecto
    await PermisosManager.crearRolesPorDefecto();

    const roles = await Rol.find().lean();
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error GET /api/roles', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    // Verificar JWT y permisos
    let payload;
    try {
      payload = getUserFromRequest(request);
    } catch (err: any) {
      return err;
    }

    // Permiso: CONFIGURACION:CONFIGURAR o tipoUsuario administrador
    const tienePermiso = await PermisosManager.usuarioTienePermiso(payload.userId, TipoRecurso.CONFIGURACION, TipoPermiso.CONFIGURAR);
    if (!tienePermiso && payload.tipoUsuario !== 'administrador') {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const rol = new Rol(body);
    await rol.save();
    return NextResponse.json({ success: true, data: rol }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/roles', error);
    return NextResponse.json({ success: false, message: 'Error creando rol' }, { status: 500 });
  }
}
