import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import { Personal } from '../../../../models/Personal';

// GET /api/personal/[id] - Obtener personal por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;

    const personal = await Personal.findById(id)
      .populate('proyectoId', 'nombre codigo')
      .populate('creadoPor', 'nombre apellido')
      .lean();

    if (!personal) {
      return NextResponse.json(
        { success: false, error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    // Convertir ObjectIds a strings
    const personalSerializable = {
      ...(personal as any),
      _id: (personal as any)._id.toString(),
      proyectoId: (personal as any).proyectoId ? {
        ...(personal as any).proyectoId,
        _id: (personal as any).proyectoId._id.toString()
      } : null,
      creadoPor: (personal as any).creadoPor ? {
        ...(personal as any).creadoPor,
        _id: (personal as any).creadoPor._id.toString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: personalSerializable
    });
  } catch (error: any) {
    console.error('Error en GET /api/personal/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/personal/[id] - Actualizar personal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;
    const body = await request.json();

    // Validar datos
    const validationErrors = validatePersonalData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    const personalActualizado = await Personal.findByIdAndUpdate(
      id,
      {
        ...body,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('proyectoId', 'nombre codigo')
      .populate('creadoPor', 'nombre apellido');

    if (!personalActualizado) {
      return NextResponse.json(
        { success: false, error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    // Convertir a objeto serializable
    const personalSerializable = {
      ...personalActualizado.toObject(),
      _id: personalActualizado._id.toString(),
      proyectoId: personalActualizado.proyectoId ? {
        ...personalActualizado.proyectoId,
        _id: personalActualizado.proyectoId._id.toString()
      } : null,
      creadoPor: personalActualizado.creadoPor ? {
        ...personalActualizado.creadoPor,
        _id: personalActualizado.creadoPor._id.toString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: personalSerializable,
      message: 'Personal actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en PUT /api/personal/[id]:', error);

    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Manejar error de cédula duplicada
    if (error.code === 11000 && error.keyPattern?.cedula) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: ['La cédula ya está registrada'] },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/personal/[id] - Eliminar personal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;

    const personalEliminado = await Personal.findByIdAndDelete(id);

    if (!personalEliminado) {
      return NextResponse.json(
        { success: false, error: 'Personal no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Personal eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en DELETE /api/personal/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función de validación para personal
function validatePersonalData(data: any) {
  const errors: string[] = [];

  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length < 2 || data.nombre.length > 50) {
    errors.push('El nombre debe tener entre 2 y 50 caracteres');
  }

  if (!data.apellido || typeof data.apellido !== 'string' || data.apellido.trim().length < 2 || data.apellido.length > 50) {
    errors.push('El apellido debe tener entre 2 y 50 caracteres');
  }

  if (!data.cedula || typeof data.cedula !== 'string' || data.cedula.trim().length === 0) {
    errors.push('La cédula es requerida');
  }

  if (data.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(data.email)) {
    errors.push('Email inválido');
  }

  if (!data.cargo || typeof data.cargo !== 'string' || data.cargo.trim().length < 2 || data.cargo.length > 100) {
    errors.push('El cargo debe tener entre 2 y 100 caracteres');
  }

  const tiposContrato = ['indefinido', 'fijo', 'obra_labor', 'prestacion_servicios'];
  if (!data.tipoContrato || !tiposContrato.includes(data.tipoContrato)) {
    errors.push('Tipo de contrato inválido');
  }

  const estados = ['activo', 'inactivo', 'terminado', 'suspendido'];
  if (data.estado && !estados.includes(data.estado)) {
    errors.push('Estado inválido');
  }

  if (!data.fechaIngreso || isNaN(Date.parse(data.fechaIngreso))) {
    errors.push('Fecha de ingreso inválida');
  }

  if (data.fechaTerminacion && isNaN(Date.parse(data.fechaTerminacion))) {
    errors.push('Fecha de terminación inválida');
  }

  if (data.fechaTerminacion && new Date(data.fechaTerminacion) <= new Date(data.fechaIngreso)) {
    errors.push('La fecha de terminación debe ser posterior a la fecha de ingreso');
  }

  if (data.salario !== undefined && (typeof data.salario !== 'number' || data.salario < 0)) {
    errors.push('El salario debe ser un número positivo');
  }

  if (data.observaciones && typeof data.observaciones === 'string' && data.observaciones.length > 500) {
    errors.push('Las observaciones no pueden exceder 500 caracteres');
  }

  return errors;
}