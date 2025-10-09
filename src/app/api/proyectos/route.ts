import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../config/database';
import { Proyecto } from '../../../models/Proyecto';

// Función para generar código único de proyecto
async function generateUniqueProjectCode() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Buscar el último proyecto del mes/año actual
  const lastProject = await Proyecto.findOne({
    codigo: new RegExp(`^PROJ-${year}${month}`)
  }).sort({ codigo: -1 }).limit(1);
  
  let sequence = 1;
  if (lastProject && lastProject.codigo) {
    const match = lastProject.codigo.match(/PROJ-\d{6}-(\d+)/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }
  
  return `PROJ-${year}${month}-${String(sequence).padStart(3, '0')}`;
}

// Función de validación básica para proyectos
function validateProyectoData(data: any) {
  const errors: string[] = [];

  if (!data.codigo || typeof data.codigo !== 'string' || data.codigo.trim().length === 0) {
    errors.push('El código del proyecto es requerido');
  }

  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length < 3 || data.nombre.length > 200) {
    errors.push('El nombre debe tener entre 3 y 200 caracteres');
  }

  if (!data.descripcion || typeof data.descripcion !== 'string' || data.descripcion.trim().length < 10 || data.descripcion.length > 1000) {
    errors.push('La descripción debe tener entre 10 y 1000 caracteres');
  }

  const tiposValidos = ['construccion', 'infraestructura', 'tecnologia', 'consultoria', 'otros'];
  if (!data.tipoProyecto || !tiposValidos.includes(data.tipoProyecto)) {
    errors.push('Tipo de proyecto inválido');
  }

  const estadosValidos = ['planificacion', 'en_ejecucion', 'suspendido', 'finalizado', 'cancelado'];
  if (!data.estado || !estadosValidos.includes(data.estado)) {
    errors.push('Estado de proyecto inválido');
  }

  const prioridadesValidas = ['baja', 'media', 'alta', 'critica'];
  if (!data.prioridad || !prioridadesValidas.includes(data.prioridad)) {
    errors.push('Prioridad inválida');
  }

  if (!data.fechaInicio || isNaN(Date.parse(data.fechaInicio))) {
    errors.push('Fecha de inicio inválida');
  }

  if (!data.fechaFinPlaneada || isNaN(Date.parse(data.fechaFinPlaneada))) {
    errors.push('Fecha de fin planeada inválida');
  }

  if (data.ubicacion !== undefined) {
    if (typeof data.ubicacion !== 'object' || !data.ubicacion) {
      errors.push('La ubicación debe ser un objeto válido');
    } else {
      if (!data.ubicacion.direccion || typeof data.ubicacion.direccion !== 'string' || data.ubicacion.direccion.trim().length === 0) {
        errors.push('La dirección es requerida');
      }
      if (!data.ubicacion.ciudad || typeof data.ubicacion.ciudad !== 'string' || data.ubicacion.ciudad.trim().length === 0) {
        errors.push('La ciudad es requerida');
      }
      if (!data.ubicacion.departamento || typeof data.ubicacion.departamento !== 'string' || data.ubicacion.departamento.trim().length === 0) {
        errors.push('El departamento es requerido');
      }
      if (!data.ubicacion.pais || typeof data.ubicacion.pais !== 'string' || data.ubicacion.pais.trim().length === 0) {
        errors.push('El país es requerido');
      }
    }
  }

  if (!data.contactoCliente || typeof data.contactoCliente !== 'object') {
    errors.push('El contacto del cliente es requerido');
  } else {
    if (!data.contactoCliente.nombre || typeof data.contactoCliente.nombre !== 'string' || data.contactoCliente.nombre.trim().length === 0) {
      errors.push('El nombre del contacto es requerido');
    }
    if (!data.contactoCliente.cargo || typeof data.contactoCliente.cargo !== 'string' || data.contactoCliente.cargo.trim().length === 0) {
      errors.push('El cargo del contacto es requerido');
    }
    if (data.contactoCliente.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(data.contactoCliente.email)) {
      errors.push('Email del contacto inválido');
    }
  }

  if (!data.presupuesto || typeof data.presupuesto !== 'object') {
    errors.push('El presupuesto es requerido');
  } else {
    if (typeof data.presupuesto.valorTotal !== 'number' || data.presupuesto.valorTotal <= 0) {
      errors.push('El valor total del presupuesto debe ser un número positivo');
    }
    if (typeof data.presupuesto.valorEjecutado !== 'number' || data.presupuesto.valorEjecutado < 0) {
      errors.push('El valor ejecutado del presupuesto debe ser un número no negativo');
    }
    if (!data.presupuesto.moneda || typeof data.presupuesto.moneda !== 'string' || !['COP', 'USD', 'EUR'].includes(data.presupuesto.moneda)) {
      errors.push('La moneda del presupuesto debe ser COP, USD o EUR');
    }
    if (!data.presupuesto.fechaAprobacion || isNaN(Date.parse(data.presupuesto.fechaAprobacion))) {
      errors.push('La fecha de aprobación del presupuesto es requerida y debe ser válida');
    }
  }

  if (!data.contratista || typeof data.contratista !== 'string') {
    errors.push('El contratista es requerido');
  }

  if (data.porcentajeAvance !== undefined && (typeof data.porcentajeAvance !== 'number' || data.porcentajeAvance < 0 || data.porcentajeAvance > 100)) {
    errors.push('El porcentaje de avance debe estar entre 0 y 100');
  }

  return errors;
}

// GET /api/proyectos - Listar proyectos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');
    const prioridad = searchParams.get('prioridad');
    const search = searchParams.get('search');

    const pageNum = page;
    const limitNum = limit;
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filtros: any = {};

    if (tipo) filtros.tipoProyecto = tipo;
    if (estado) filtros.estado = estado;
    if (prioridad) filtros.prioridad = prioridad;
    if (search) {
      filtros.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener proyectos con populate
    const proyectos = await Proyecto.find(filtros)
      .populate('contratista', 'nombre apellido email telefono profesion')
      .populate('interventor', 'nombre apellido email telefono profesion')
      .populate('supervisor', 'nombre apellido email telefono profesion')
      .populate('creadoPor', 'nombre apellido email')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Proyecto.countDocuments(filtros);

    // Convertir a objetos JSON serializables
    const proyectosSerializable = proyectos.map((proyecto: any) => ({
      ...proyecto.toObject(),
      _id: proyecto._id.toString(),
      interventor: proyecto.interventor ? {
        ...proyecto.interventor.toObject(),
        _id: proyecto.interventor._id.toString()
      } : null,
      contratista: proyecto.contratista ? {
        ...proyecto.contratista.toObject(),
        _id: proyecto.contratista._id.toString()
      } : null,
      supervisor: proyecto.supervisor ? {
        ...proyecto.supervisor.toObject(),
        _id: proyecto.supervisor._id.toString()
      } : null,
      creadoPor: proyecto.creadoPor ? {
        ...proyecto.creadoPor.toObject(),
        _id: proyecto.creadoPor._id.toString()
      } : null
    }));

    const result = {
      success: true,
      data: {
        proyectos: proyectosSerializable,
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          count: proyectos.length,
          totalRecords: total
        }
      }
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en GET /api/proyectos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/proyectos - Crear proyecto
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Validar datos
    const validationErrors = validateProyectoData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Preparar datos del proyecto
    const proyectoData = { ...body };
    
    // Generar código único si no se proporciona
    if (!proyectoData.codigo || proyectoData.codigo.trim() === '') {
      proyectoData.codigo = await generateUniqueProjectCode();
    }

    // Crear el proyecto directamente
    const nuevoProyecto = new Proyecto({
      ...proyectoData,
      activo: true,
      porcentajeAvance: proyectoData.porcentajeAvance || 0,
      creadoPor: '507f1f77bcf86cd799439011' // ID de usuario simulado
    });

    const proyectoGuardado = await nuevoProyecto.save();

    // Poblar referencias
    await proyectoGuardado.populate('contratista interventor supervisor creadoPor');

    // Convertir a objeto serializable
    const proyectoSerializable = {
      ...proyectoGuardado.toObject(),
      _id: proyectoGuardado._id.toString(),
      interventor: proyectoGuardado.interventor ? {
        ...proyectoGuardado.interventor.toObject(),
        _id: proyectoGuardado.interventor._id.toString()
      } : null,
      contratista: proyectoGuardado.contratista ? {
        ...proyectoGuardado.contratista.toObject(),
        _id: proyectoGuardado.contratista._id.toString()
      } : null,
      supervisor: proyectoGuardado.supervisor ? {
        ...proyectoGuardado.supervisor.toObject(),
        _id: proyectoGuardado.supervisor._id.toString()
      } : null,
      creadoPor: proyectoGuardado.creadoPor ? {
        ...proyectoGuardado.creadoPor.toObject(),
        _id: proyectoGuardado.creadoPor._id.toString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: proyectoSerializable,
      message: 'Proyecto creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en POST /api/proyectos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}