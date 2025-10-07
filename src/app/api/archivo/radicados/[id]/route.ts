import { NextRequest, NextResponse } from 'next/server';
import Radicado from '../../../../../modules/archivo/models/Radicado';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../../lib/database';

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = params;
    const data = await request.json();

    // Buscar el radicado
    const radicado = await Radicado.findById(id);
    if (!radicado) {
      return NextResponse.json({ error: 'Radicado no encontrado' }, { status: 404 });
    }

    // Actualizar campos
    Object.assign(radicado, {
      ...data,
      fechaModificacion: new Date()
    });

    await radicado.save();

    // Devolver el radicado actualizado
    const radicadoActualizado = await Radicado.findById(id)
      .populate('creadoPor', 'nombre email')
      .populate('proyectoId', 'nombre codigo')
      .lean();

    return NextResponse.json({
      success: true,
      data: radicadoActualizado
    });

  } catch (error: any) {
    console.error('Error en PUT /api/archivo/radicados/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = params;
    
    const radicado = await Radicado.findById(id)
      .populate('creadoPor', 'nombre email')
      .populate('proyectoId', 'nombre codigo')
      .lean();

    if (!radicado) {
      return NextResponse.json({ error: 'Radicado no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: radicado
    });

  } catch (error: any) {
    console.error('Error en GET /api/archivo/radicados/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}