import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import Evidencia from '../../../../modules/evidencia/models/Evidencia';
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

    // Obtener categorías únicas de evidencias existentes
    const categorias = await Evidencia.distinct('categoria', { eliminado: false });
    
    // Filtrar categorías vacías y ordenar
    const categoriasLimpias = categorias
      .filter(cat => cat && cat.trim() !== '')
      .sort();

    return NextResponse.json(categoriasLimpias);

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}