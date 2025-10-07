import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import { getUserFromRequest } from '../../../../lib/auth';

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

    // Por ahora retornamos datos de ejemplo
    // En el futuro, esto se conectará con el modelo real de Radicados
    const radicadosEjemplo: Radicado[] = [
      {
        _id: '1',
        consecutivo: 'RAD-2025-001',
        fechaRadicado: new Date('2025-01-15'),
        fechaOficio: new Date('2025-01-14'),
        tipoOficio: 'Oficio',
        asunto: 'Solicitud de información sobre el proyecto de infraestructura',
        resumen: 'Se solicita información detallada sobre el avance del proyecto de infraestructura vial en el sector norte de la ciudad.',
        destinatario: 'Director de Proyectos',
        cargoDestinatario: 'Director',
        entidadDestinatario: 'Secretaría de Infraestructura',
        estado: 'enviado',
        prioridad: 'alta',
        categoria: 'consulta',
        requiereRespuesta: true,
        fechaVencimiento: new Date('2025-01-25'),
        esConfidencial: false,
        creadoPor: user.userId,
        fechaCreacion: new Date('2025-01-15'),
        activo: true
      },
      {
        _id: '2',
        consecutivo: 'RAD-2025-002',
        fechaRadicado: new Date('2025-01-16'),
        fechaOficio: new Date('2025-01-16'),
        tipoOficio: 'Circular',
        asunto: 'Actualización de procedimientos de seguridad',
        resumen: 'Circular informativa sobre los nuevos procedimientos de seguridad implementados en todas las obras públicas.',
        destinatario: 'Todos los Contratistas',
        estado: 'recibido',
        prioridad: 'media',
        categoria: 'informativo',
        requiereRespuesta: false,
        esConfidencial: false,
        creadoPor: user.userId,
        fechaCreacion: new Date('2025-01-16'),
        activo: true
      }
    ];

    // Aplicar filtros básicos
    let radicadosFiltrados = radicadosEjemplo;

    if (search) {
      const searchLower = search.toLowerCase();
      radicadosFiltrados = radicadosFiltrados.filter(r => 
        r.asunto.toLowerCase().includes(searchLower) ||
        r.consecutivo.toLowerCase().includes(searchLower) ||
        r.destinatario.toLowerCase().includes(searchLower)
      );
    }

    if (tipo) {
      radicadosFiltrados = radicadosFiltrados.filter(r => r.tipoOficio === tipo);
    }

    if (estado) {
      radicadosFiltrados = radicadosFiltrados.filter(r => r.estado === estado);
    }

    if (prioridad) {
      radicadosFiltrados = radicadosFiltrados.filter(r => r.prioridad === prioridad);
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const radicadosPaginados = radicadosFiltrados.slice(startIndex, endIndex);

    const total = radicadosFiltrados.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: radicadosPaginados,
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

    const nuevoRadicado: Radicado = {
      _id: Date.now().toString(),
      consecutivo,
      fechaRadicado: new Date(),
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
      estado: 'borrador',
      prioridad: prioridad || 'media',
      categoria: categoria || 'general',
      proyectoId,
      requiereRespuesta: requiereRespuesta || false,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
      esConfidencial: esConfidencial || false,
      creadoPor: user.userId,
      fechaCreacion: new Date(),
      activo: true
    };

    // En el futuro, aquí se guardará en la base de datos
    // await RadicadoModel.create(nuevoRadicado);

    return NextResponse.json({
      success: true,
      data: nuevoRadicado,
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