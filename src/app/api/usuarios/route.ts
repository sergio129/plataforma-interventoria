import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import { Usuario } from '../../../lib/models/Usuario';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();
    const usuarios = await Usuario.find({}, '-password').populate('roles').sort({ fechaCreacion: -1 }).lean();
    return NextResponse.json({ success: true, data: usuarios, total: usuarios.length });
  } catch (error: any) {
    console.error('Error GET /api/usuarios', error);
    return NextResponse.json({ success: false, message: error?.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    if (data.password) data.password = await bcrypt.hash(data.password, 10);

    // Validar email duplicado
    const existsEmail = await Usuario.findOne({ email: data.email });
    if (existsEmail) return NextResponse.json({ success: false, message: 'El email ya está registrado' }, { status: 400 });

    // Validar cédula duplicada
    const existsCedula = await Usuario.findOne({ cedula: data.cedula });
    if (existsCedula) return NextResponse.json({ success: false, message: 'La cédula ya está registrada' }, { status: 400 });

    const nuevo = new Usuario(data);
    await nuevo.save();
    const doc = await Usuario.findById(nuevo._id, '-password').populate('roles').lean();
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    console.error('Error POST /api/usuarios', error);
    // Capturar error de MongoDB por duplicado
    if (error.code === 11000 && error.keyPattern?.cedula) {
      return NextResponse.json({ success: false, message: 'La cédula ya está registrada' }, { status: 400 });
    }
    if (error.code === 11000 && error.keyPattern?.email) {
      return NextResponse.json({ success: false, message: 'El email ya está registrado' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error?.message || 'Error creando usuario' }, { status: 500 });
  }
}