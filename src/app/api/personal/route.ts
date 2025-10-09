import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../config/database';
import { Personal } from '../../../models/Personal';

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

// GET /api/personal - Listar personal
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const estado = searchParams.get('estado');
    const proyectoId = searchParams.get('proyectoId');

    // Construir query
    const query: any = {};
    if (search) {
      query.$or = [
        { nombre: new RegExp(search, 'i') },
        { apellido: new RegExp(search, 'i') },
        { cedula: new RegExp(search, 'i') },
        { cargo: new RegExp(search, 'i') }
      ];
    }
    if (estado) query.estado = estado;
    if (proyectoId) query.proyectoId = proyectoId;

    const skip = (page - 1) * limit;

    const [personal, total] = await Promise.all([
      Personal.find(query)
        .populate('proyectoId', 'nombre codigo')
        .populate('creadoPor', 'nombre apellido')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Personal.countDocuments(query)
    ]);

    // Convertir ObjectIds a strings
    const personalSerializable = personal.map(persona => ({
      ...persona,
      _id: (persona._id as any).toString(),
      proyectoId: persona.proyectoId ? {
        ...persona.proyectoId,
        _id: (persona.proyectoId._id as any).toString()
      } : null,
      creadoPor: persona.creadoPor ? {
        ...persona.creadoPor,
        _id: (persona.creadoPor._id as any).toString()
      } : null
    }));

    const result = {
      success: true,
      data: {
        personal: personalSerializable,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: personal.length,
          totalRecords: total
        }
      }
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en GET /api/personal:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/personal - Crear personal
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Validar datos
    const validationErrors = validatePersonalData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Limpiar campos vacíos
    const cleanedBody = { ...body };
    if (cleanedBody.proyectoId === '' || cleanedBody.proyectoId === null) {
      cleanedBody.proyectoId = undefined;
    }
    if (cleanedBody.fechaTerminacion === '') {
      cleanedBody.fechaTerminacion = undefined;
    }

    // Crear el registro de personal
    const nuevoPersonal = new Personal({
      ...cleanedBody,
      creadoPor: '507f1f77bcf86cd799439011' // ID de usuario simulado
    });

    const personalGuardado = await nuevoPersonal.save();

    // Poblar referencias
    await personalGuardado.populate('proyectoId', 'nombre codigo');
    await personalGuardado.populate('creadoPor', 'nombre apellido');

    // Convertir a objeto serializable
    const personalSerializable = {
      ...personalGuardado.toObject(),
      _id: personalGuardado._id.toString(),
      proyectoId: personalGuardado.proyectoId ? {
        ...personalGuardado.proyectoId,
        _id: personalGuardado.proyectoId._id.toString()
      } : null,
      creadoPor: personalGuardado.creadoPor ? {
        ...personalGuardado.creadoPor,
        _id: personalGuardado.creadoPor._id.toString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: personalSerializable,
      message: 'Personal registrado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en POST /api/personal:', error);

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