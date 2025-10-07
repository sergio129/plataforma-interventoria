import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../config/database';
import Evidencia from '../../../modules/evidencia/models/Evidencia';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const fecha = searchParams.get('fecha');
    const q = searchParams.get('q');

    // Construir filtro
    const filtro: any = { eliminado: false };
    if (categoria) filtro.categoria = categoria;
    if (fecha) filtro.fecha = { $gte: new Date(fecha) };
    if (q) {
      filtro.$or = [
        { titulo: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } }
      ];
    }

    const evidencias = await Evidencia.find(filtro).populate('creadoPor', 'nombre apellido').sort({ fecha: -1 });
    
    return NextResponse.json(evidencias);

  } catch (error) {
    console.error('Error obteniendo evidencias:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { titulo, descripcion, categoria, fecha, archivos } = body;

    // Validaciones básicas
    if (!titulo || !descripcion || !categoria || !fecha) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // TODO: Obtener usuario autenticado del token
    // Por ahora usamos un ID temporal
    const creadoPor = '507f1f77bcf86cd799439011'; // Temporal

    const nuevaEvidencia = new Evidencia({
      titulo,
      descripcion,
      categoria,
      fecha: new Date(fecha),
      archivos: archivos || [],
      creadoPor,
      eliminado: false
    });

    const evidenciaGuardada = await nuevaEvidencia.save();

    return NextResponse.json(evidenciaGuardada, { status: 201 });

  } catch (error) {
    console.error('Error creando evidencia:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}