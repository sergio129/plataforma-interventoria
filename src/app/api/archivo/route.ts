import Radicado from '../../../modules/archivo/models/Radicado';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../lib/database';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');
    const prioridad = searchParams.get('prioridad');
    const search = searchParams.get('search');
    const categoria = searchParams.get('categoria');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const proyectoId = searchParams.get('proyectoId');
    const confidencial = searchParams.get('confidencial');

    const skip = (page - 1) * limit;

    // Construir filtros
    const filtros: any = {};

    if (tipo && tipo !== 'todos') {
      filtros.tipoOficio = tipo;
    }

    if (estado && estado !== 'todos') {
      filtros.estado = estado;
    }

    if (prioridad && prioridad !== 'todas') {
      filtros.prioridad = prioridad;
    }

    if (categoria && categoria !== 'todas') {
      filtros.categoria = categoria;
    }

    if (proyectoId) {
      filtros.proyectoId = proyectoId;
    }

    if (confidencial !== null && confidencial !== undefined) {
      filtros.confidencial = confidencial === 'true';
    }

    if (search) {
      filtros.$or = [
        { consecutivo: { $regex: search, $options: 'i' } },
        { asunto: { $regex: search, $options: 'i' } },
        { resumen: { $regex: search, $options: 'i' } },
        { destinatario: { $regex: search, $options: 'i' } },
        { remitente: { $regex: search, $options: 'i' } }
      ];
    }

    if (fechaInicio || fechaFin) {
      filtros.fechaRadicado = {};
      if (fechaInicio) {
        filtros.fechaRadicado.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        filtros.fechaRadicado.$lte = new Date(fechaFin);
      }
    }

    const [radicados, total] = await Promise.all([
      Radicado.find(filtros)
        .populate('proyectoId', 'nombre numero')
        .populate('creadoPor', 'nombre email')
        .populate('modificadoPor', 'nombre email')
        .sort({ fechaRadicado: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Radicado.countDocuments(filtros)
    ]);

    return NextResponse.json({
      success: true,
      data: radicados,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en GET /api/archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    
    // Validación básica
    const { tipoOficio, asunto, resumen, destinatario, categoria = 'general' } = body;
    
    if (!tipoOficio || !asunto || !resumen || !destinatario) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Crear el radicado
    const nuevoRadicado = new Radicado({
      ...body,
      creadoPor: user.userId,
      fechaCreacion: new Date(),
      estado: body.estado || 'pendiente',
      prioridad: body.prioridad || 'normal',
      categoria: categoria
    });

    await nuevoRadicado.save();
    
    // Poblamos los campos para devolver el objeto completo
    await nuevoRadicado.populate(['proyectoId', 'creadoPor']);

    return NextResponse.json({
      success: true,
      data: nuevoRadicado,
      message: 'Radicado creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}