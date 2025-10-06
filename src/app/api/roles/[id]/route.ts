import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import { Rol, PermisosManager, TipoRecurso, TipoPermiso } from '../../../../lib/models/Rol';
import mongoose from 'mongoose';
import { getUserFromRequest } from '../../../../lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido' }, { status: 400 });
    }
    const rol = await Rol.findById(id).lean();
    if (!rol) return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: rol });
  } catch (error) {
    console.error('GET /api/roles/[id]', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido' }, { status: 400 });
    }
    // Verificar JWT y permisos
    let payload;
    try {
      payload = getUserFromRequest(request);
    } catch (err: any) {
      return err;
    }

    const tienePermiso = await PermisosManager.usuarioTienePermiso(payload.userId, TipoRecurso.CONFIGURACION, TipoPermiso.CONFIGURAR);
    if (!tienePermiso && payload.tipoUsuario !== 'administrador') {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const rol = await Rol.findByIdAndUpdate(id, body, { new: true });
    if (!rol) return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: rol });
  } catch (error) {
    console.error('PUT /api/roles/[id]', error);
    return NextResponse.json({ success: false, message: 'Error actualizando rol' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido' }, { status: 400 });
    }
    // Verificar JWT y permisos
    let payload;
    try {
      payload = getUserFromRequest(request);
    } catch (err: any) {
      return err;
    }

    const tienePermiso = await PermisosManager.usuarioTienePermiso(payload.userId, TipoRecurso.CONFIGURACION, TipoPermiso.CONFIGURAR);
    if (!tienePermiso && payload.tipoUsuario !== 'administrador') {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
    }

    const rol = await Rol.findByIdAndDelete(id);
    if (!rol) return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Rol eliminado' });
  } catch (error) {
    console.error('DELETE /api/roles/[id]', error);
    return NextResponse.json({ success: false, message: 'Error eliminando rol' }, { status: 500 });
  }
}
