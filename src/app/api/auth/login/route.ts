import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../lib/database';
import { Usuario } from '../../../../lib/models/Usuario';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { email, password } = await request.json();

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email y contraseña son requeridos'
      }, { status: 400 });
    }

    // Buscar usuario por email
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      return NextResponse.json({
        success: false,
        message: 'Credenciales inválidas'
      }, { status: 401 });
    }

    // Verificar estado del usuario
    if (usuario.estado !== 'activo') {
      return NextResponse.json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador.'
      }, { status: 401 });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return NextResponse.json({
        success: false,
        message: 'Credenciales inválidas'
      }, { status: 401 });
    }

    // Crear token JWT
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    
    const token = jwt.sign(
      {
        userId: usuario._id,
        email: usuario.email,
        tipoUsuario: usuario.tipoUsuario
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Actualizar último acceso
    usuario.ultimoAcceso = new Date();
    await usuario.save();

    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          tipoUsuario: usuario.tipoUsuario,
          profesion: usuario.profesion,
          ultimoAcceso: usuario.ultimoAcceso
        }
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}