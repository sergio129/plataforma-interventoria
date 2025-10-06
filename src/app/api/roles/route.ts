import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import { Rol, PermisosManager } from '../../../lib/models/Rol';

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
    const body = await request.json();
    const rol = new Rol(body);
    await rol.save();
    return NextResponse.json({ success: true, data: rol }, { status: 201 });
  } catch (error) {
    console.error('Error POST /api/roles', error);
    return NextResponse.json({ success: false, message: 'Error creando rol' }, { status: 500 });
  }
}
