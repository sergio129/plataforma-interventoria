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
      // Si getUserFromRequest devuelve una Response (NextResponse.json) la retornamos
      return err;
    }

    // Permiso: CONFIGURACION:CONFIGURAR o tipoUsuario administrador
    const tienePermiso = await PermisosManager.usuarioTienePermiso(payload.userId, TipoRecurso.CONFIGURACION, TipoPermiso.CONFIGURAR);
    if (!tienePermiso && payload.tipoUsuario !== 'administrador') {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    // Validaciones mínimas en servidor
    const errores: string[] = [];
    if (!body || typeof body !== 'object') {
      errores.push('No se recibió información del rol');
    }
    if (!body?.nombre || typeof body.nombre !== 'string' || body.nombre.trim().length < 2) {
      errores.push('El campo "nombre" es obligatorio y debe tener al menos 2 caracteres');
    }
    if (!body?.descripcion || typeof body.descripcion !== 'string' || body.descripcion.trim().length < 2) {
      errores.push('El campo "descripción" es obligatorio y debe tener al menos 2 caracteres');
    }
    // Normalizar permisos: asegurarnos que permisos es un array con { recurso, acciones[] }
    if (!Array.isArray(body.permisos)) body.permisos = [];

    if (errores.length > 0) {
      return NextResponse.json({ success: false, message: 'Error de validación: ' + errores.join('. ') }, { status: 400 });
    }

    const rol = new Rol({
      nombre: body.nombre.trim(),
      descripcion: body.descripcion.trim(),
      activo: !!body.activo,
      permisos: body.permisos
    });

    await rol.save();
    // Devolver documento limpio
    const saved = await Rol.findById(rol._id).lean();
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/roles', error);
    const msg = (error as any)?.message || 'Error creando rol';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
