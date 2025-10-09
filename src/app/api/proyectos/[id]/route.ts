import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../config/database';
import { getUserFromRequest } from '../../../../lib/auth';
import { ProyectoController } from '../../../../controllers/ProyectoController';
import { Proyecto } from '../../../../models/Proyecto';

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

  if (data.contactoCliente !== undefined) {
    if (typeof data.contactoCliente !== 'object' || !data.contactoCliente) {
      errors.push('El contacto del cliente debe ser un objeto válido');
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
  }

  if (data.presupuesto !== undefined) {
    if (typeof data.presupuesto !== 'object' || !data.presupuesto) {
      errors.push('El presupuesto debe ser un objeto válido');
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
  }

  if (data.contratista !== undefined && (!data.contratista || typeof data.contratista !== 'string')) {
    errors.push('El contratista es requerido');
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
    // Temporalmente quitar autenticación para debugging
    // const user = getUserFromRequest(request);
    await connectToDatabase();

    // Obtener proyecto directamente
    const proyecto = await Proyecto.findById(params.id)
      .populate('contratista', 'nombre apellido email telefono profesion')
      .populate('interventor', 'nombre apellido email telefono profesion')
      .populate('supervisor', 'nombre apellido email telefono profesion')
      .populate('creadoPor', 'nombre apellido email');

    if (!proyecto) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Convertir a objeto serializable
    const proyectoSerializable = {
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
    };

    return NextResponse.json({
      success: true,
      data: proyectoSerializable
    });
  } catch (error: any) {
    console.error('Error en GET /api/proyectos/[id]:', error);
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
    // Temporalmente quitar autenticación para debugging
    // const user = getUserFromRequest(request);
    await connectToDatabase();

    const body = await request.json();

    // Validar datos
    const validationErrors = validateProyectoUpdateData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Actualizar proyecto directamente
    const proyectoActualizado = await Proyecto.findByIdAndUpdate(
      params.id,
      { ...body, fechaActualizacion: new Date() },
      { new: true, runValidators: true }
    ).populate('contratista', 'nombre apellido email telefono profesion')
     .populate('interventor', 'nombre apellido email telefono profesion')
     .populate('supervisor', 'nombre apellido email telefono profesion')
     .populate('creadoPor', 'nombre apellido email');

    if (!proyectoActualizado) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Convertir a objeto serializable
    const proyectoSerializable = {
      ...proyectoActualizado.toObject(),
      _id: proyectoActualizado._id.toString(),
      interventor: proyectoActualizado.interventor ? {
        ...proyectoActualizado.interventor.toObject(),
        _id: proyectoActualizado.interventor._id.toString()
      } : null,
      contratista: proyectoActualizado.contratista ? {
        ...proyectoActualizado.contratista.toObject(),
        _id: proyectoActualizado.contratista._id.toString()
      } : null,
      supervisor: proyectoActualizado.supervisor ? {
        ...proyectoActualizado.supervisor.toObject(),
        _id: proyectoActualizado.supervisor._id.toString()
      } : null,
      creadoPor: proyectoActualizado.creadoPor ? {
        ...proyectoActualizado.creadoPor.toObject(),
        _id: proyectoActualizado.creadoPor._id.toString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: proyectoSerializable,
      message: 'Proyecto actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en PUT /api/proyectos/[id]:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }
    
    // Manejar otros errores de Mongoose (como errores de middleware pre-save)
    if (error.message && error.message.includes('fecha de fin')) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: [error.message] },
        { status: 400 }
      );
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
    // Temporalmente quitar autenticación para debugging
    // const user = getUserFromRequest(request);
    await connectToDatabase();

    // Eliminar proyecto directamente
    const proyectoEliminado = await Proyecto.findByIdAndDelete(params.id);

    if (!proyectoEliminado) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en DELETE /api/proyectos/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}