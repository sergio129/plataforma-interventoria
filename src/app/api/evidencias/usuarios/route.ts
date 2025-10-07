import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import jwt from 'jsonwebtoken';

// Marcar la ruta como dinámica
export const dynamic = 'force-dynamic';

async function verifyAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    // Importar el modelo Usuario
    const { Usuario } = await import('../../../../lib/models/Usuario');
    
    // Obtener usuarios que han creado evidencias
    const usuarios = await Usuario.find(
      { estado: 'activo' },
      { _id: 1, nombre: 1, apellido: 1, email: 1 }
    ).sort({ nombre: 1, apellido: 1 });

    // Formatear la respuesta
    const usuariosFormateados = usuarios.map(usuario => ({
      _id: usuario._id,
      nombre: usuario.nombre,
      apellido: usuario.apellido || '',
      nombreCompleto: `${usuario.nombre} ${usuario.apellido || ''}`.trim(),
      email: usuario.email
    }));

    return NextResponse.json(usuariosFormateados);

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}