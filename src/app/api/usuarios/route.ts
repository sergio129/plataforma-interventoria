import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import { Usuario } from '../../../../lib/models/Usuario';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const usuarios = await Usuario.find({}, '-password').sort({ fechaCreacion: -1 });

    return NextResponse.json({
      success: true,
      data: usuarios,
      total: usuarios.length
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    
    // Verificar si el email ya existe
    const usuarioExistente = await Usuario.findOne({ email: data.email });
    if (usuarioExistente) {
      return NextResponse.json({
        success: false,
        message: 'El email ya está registrado'
      }, { status: 400 });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario(data);
    await nuevoUsuario.save();

    // Retornar sin la contraseña
    const usuarioSinPassword = await Usuario.findById(nuevoUsuario._id, '-password');

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuarioSinPassword
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}