import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import { getUserFromRequest } from '../../../../lib/auth';
import { ProyectoController } from '../../../../controllers/ProyectoController';

// Función de validación para actualizar proyectos (campos opcionales)
function validateProyectoUpdateData(data: any) {
  const errors: string[] = [];

  if (data.nombre !== undefined && (typeof data.nombre !== 'string' || data.nombre.trim().length < 3 || data.nombre.length > 200)) {
    errors.push('El nombre debe tener entre 3 y 200 caracteres');
  }

  if (data.descripcion !== undefined && (typeof data.descripcion !== 'string' || data.descripcion.trim().length < 10 || data.descripcion.length > 1000)) {
    errors.push('La descripción debe tener entre 10 y 1000 caracteres');
  }

  const tiposValidos = ['construccion', 'infraestructura', 'tecnologia', 'consultoria', 'otros'];
  if (data.tipoProyecto !== undefined && !tiposValidos.includes(data.tipoProyecto)) {
    errors.push('Tipo de proyecto inválido');
  }

  const estadosValidos = ['planificacion', 'en_ejecucion', 'suspendido', 'finalizado', 'cancelado'];
  if (data.estado !== undefined && !estadosValidos.includes(data.estado)) {
    errors.push('Estado de proyecto inválido');
  }

  const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
  if (data.prioridad !== undefined && !prioridadesValidas.includes(data.prioridad)) {
    errors.push('Prioridad inválida');
  }

  if (data.fechaInicio !== undefined && isNaN(Date.parse(data.fechaInicio))) {
    errors.push('Fecha de inicio inválida');
  }

  if (data.fechaFin !== undefined && data.fechaFin !== '' && isNaN(Date.parse(data.fechaFin))) {
    errors.push('Fecha de fin inválida');
  }

  if (data.ubicacion !== undefined && (typeof data.ubicacion !== 'string' || data.ubicacion.length > 200)) {
    errors.push('La ubicación no puede exceder 200 caracteres');
  }

  if (data.porcentajeAvance !== undefined && (typeof data.porcentajeAvance !== 'number' || data.porcentajeAvance < 0 || data.porcentajeAvance > 100)) {
    errors.push('El porcentaje de avance debe estar entre 0 y 100');
  }

  return errors;
}

// GET /api/proyectos/[id] - Obtener proyecto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    await connectToDatabase();

    // Simular request/response de Express
    const mockReq = {
      params: { id: params.id },
      user: user
    } as any;

    let mockRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ ...data, statusCode: code }) })
    } as any;

    const result = await ProyectoController.obtenerPorId(mockReq, mockRes);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en GET /api/proyectos/[id]:', error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/proyectos/[id] - Actualizar proyecto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    await connectToDatabase();

    // Verificar permisos
    if (user.tipoUsuario !== 'administrador' && user.tipoUsuario !== 'interventor') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para actualizar proyectos' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar datos
    const validationErrors = validateProyectoUpdateData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Simular request/response de Express
    const mockReq = {
      params: { id: params.id },
      body,
      user: user
    } as any;

    let mockRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ ...data, statusCode: code }) })
    } as any;

    const result = await ProyectoController.actualizar(mockReq, mockRes);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en PUT /api/proyectos/[id]:', error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/proyectos/[id] - Eliminar proyecto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    await connectToDatabase();

    // Verificar permisos
    if (user.tipoUsuario !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden eliminar proyectos' },
        { status: 403 }
      );
    }

    // Simular request/response de Express
    const mockReq = {
      params: { id: params.id },
      user: user
    } as any;

    let mockRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ ...data, statusCode: code }) })
    } as any;

    const result = await ProyectoController.eliminar(mockReq, mockRes);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en DELETE /api/proyectos/[id]:', error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}