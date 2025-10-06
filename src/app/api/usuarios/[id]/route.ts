import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import { Usuario } from '../../../../lib/models/Usuario';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  try {
    const u = await Usuario.findById(params.id).populate('roles').lean();
    if (!u) return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: u });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  try {
    const payload = await request.json();
    if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
    const updated = await Usuario.findByIdAndUpdate(params.id, payload, { new: true }).populate('roles').lean();
    if (!updated) return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Error actualizando' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  try {
    const removed = await Usuario.findByIdAndDelete(params.id);
    if (!removed) return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Eliminado' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Error eliminando' }, { status: 500 });
  }
}
