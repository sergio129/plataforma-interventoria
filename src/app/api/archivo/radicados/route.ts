import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import { getUserFromRequest } from '../../../../lib/auth';
import Radicado from '../../../../modules/archivo/models/Radicado';

// Modelo temporal para Radicados (puedes crear un modelo completo después)
interface Radicado {
  _id: string;
  consecutivo: string;
  fechaRadicado: Date;
  fechaOficio: Date;
  tipoOficio: string;
  asunto: string;
  resumen: string;
  observaciones?: string;
  destinatario: string;
  cargoDestinatario?: string;
  entidadDestinatario?: string;
  emailDestinatario?: string;
  remitente?: string;
  cargoRemitente?: string;
  entidadRemitente?: string;
  estado: string;
  prioridad: string;
  categoria: string;
  proyectoId?: {
    _id: string;
    nombre: string;
    codigo: string;
  };
  requiereRespuesta: boolean;
  fechaVencimiento?: Date;
  esConfidencial: boolean;
  creadoPor: string;
  fechaCreacion: Date;
  activo: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');
    const prioridad = searchParams.get('prioridad');
    const search = searchParams.get('search');

    // Construir filtros para la consulta
    const filtros: any = { activo: true };

    // Filtro de búsqueda por texto
    if (search) {
      filtros.$or = [
        { asunto: { $regex: search, $options: 'i' } },
        { consecutivo: { $regex: search, $options: 'i' } },
        { destinatario: { $regex: search, $options: 'i' } },
        { resumen: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtros específicos
    if (tipo) filtros.tipoOficio = tipo;
    if (estado) filtros.estado = estado;
    if (prioridad) filtros.prioridad = prioridad;

    // Obtener total de documentos que cumplen los filtros
    const total = await Radicado.countDocuments(filtros);
    const totalPages = Math.ceil(total / limit);

    // Obtener radicados con paginación
    const radicados = await Radicado.find(filtros)
      .populate('creadoPor', 'nombre email')
      .populate('proyectoId', 'nombre codigo')
      .sort({ fechaRadicado: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: radicados,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error obteniendo radicados:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    await connectToDatabase();

    const body = await request.json();
    const {
      fechaOficio,
      tipoOficio,
      asunto,
      resumen,
      observaciones,
      destinatario,
      cargoDestinatario,
      entidadDestinatario,
      emailDestinatario,
      remitente,
      cargoRemitente,
      entidadRemitente,
      prioridad,
      categoria,
      proyectoId,
      requiereRespuesta,
      fechaVencimiento,
      esConfidencial
    } = body;

    // Validaciones básicas
    if (!asunto || !resumen || !destinatario) {
      return NextResponse.json(
        { error: 'Los campos asunto, resumen y destinatario son requeridos' },
        { status: 400 }
      );
    }

    // Generar consecutivo automático
    const year = new Date().getFullYear();
    const consecutivo = `RAD-${year}-${String(Date.now()).slice(-6)}`;

    // Crear el radicado en la base de datos
    const nuevoRadicado = new Radicado({
      fechaOficio: new Date(fechaOficio),
      tipoOficio: tipoOficio || 'Oficio',
      asunto,
      resumen,
      observaciones,
      destinatario,
      cargoDestinatario,
      entidadDestinatario,
      emailDestinatario,
      remitente,
      cargoRemitente,
      entidadRemitente,
      prioridad: prioridad || 'media',
      categoria: categoria || 'general',
      proyectoId,
      requiereRespuesta: requiereRespuesta || false,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
      esConfidencial: esConfidencial || false,
      creadoPor: user.userId
    });

    const radicadoGuardado = await nuevoRadicado.save();
    await radicadoGuardado.populate('creadoPor', 'nombre email');

    return NextResponse.json({
      success: true,
      data: radicadoGuardado,
      message: 'Radicado creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando radicado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}