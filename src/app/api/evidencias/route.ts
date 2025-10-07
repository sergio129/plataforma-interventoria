import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../config/database';
import Evidencia from '../../../modules/evidencia/models/Evidencia';
import File from '../../../modules/archivo/models/File';
import { GridFSStorage } from '../../../lib/storage/gridfsStorage';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Marcar la ruta como dinámica
export const dynamic = 'force-dynamic';

// Configuración
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', // Archivos .txt
  'application/vnd.ms-excel', // Excel 97-2003
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel 2007+
  'application/vnd.ms-powerpoint', // PowerPoint 97-2003
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' // PowerPoint 2007+
];

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

async function hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  try {
    // Importar modelos necesarios
    const { default: Usuario } = await import('../../../models/Usuario');
    const { default: Rol } = await import('../../../models/Rol');
    
    // Obtener usuario con su rol poblado
    const usuario = await Usuario.findById(userId).populate('rol');
    if (!usuario || !usuario.rol) {
      console.log('Usuario sin rol encontrado');
      return false;
    }

    // Buscar el permiso específico en el rol
    const permiso = usuario.rol.permisos?.find((p: any) => p.recurso === resource);
    if (!permiso) {
      console.log(`No se encontró permiso para recurso: ${resource}`);
      return false;
    }

    // Verificar si tiene la acción específica
    const tieneAccion = permiso.acciones.includes(action);
    console.log(`Permiso ${resource}:${action} para usuario ${userId}: ${tieneAccion}`);
    return tieneAccion;
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return false;
  }
}

function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/[^a-zA-Z0-9\.]/g, '_').replace(/\.[^.]*$/, '');
  
  return `${timestamp}_${random}_${baseName}.${extension}`;
}

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

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

    // Obtener evidencias sin populate primero
    const evidenciasBase = await Evidencia.find(filtro)
      .populate('creadoPor', 'nombre apellido')
      .sort({ fecha: -1 });

    console.log('Evidencias base (sin populate archivos):', evidenciasBase[0]?.archivos);

    // Populate manual de archivos
    const evidencias = await Promise.all(
      evidenciasBase.map(async (evidencia) => {
        if (evidencia.archivos && evidencia.archivos.length > 0) {
          const archivosPopulados = await File.find({
            _id: { $in: evidencia.archivos }
          }).select('_id nombreOriginal tamaño tipoMime');

          console.log('Archivos populados para evidencia:', evidencia._id, archivosPopulados);

          // Agregar tamañoFormateado
          const archivosConFormato = archivosPopulados.map(archivo => {
            const archivoObj = archivo.toObject();
            if (archivoObj.tamaño) {
              const bytes = archivoObj.tamaño;
              if (bytes === 0) {
                archivoObj.tamañoFormateado = '0 Bytes';
              } else {
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                archivoObj.tamañoFormateado = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
              }
            }
            return archivoObj;
          });

          return {
            ...evidencia.toObject(),
            archivos: archivosConFormato
          };
        }
        return evidencia.toObject();
      })
    );
    
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
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const formData = await request.formData();
    const titulo = formData.get('titulo') as string;
    const descripcion = formData.get('descripcion') as string;
    const categoria = formData.get('categoria') as string;
    const fecha = formData.get('fecha') as string;
    
    // Validaciones básicas
    if (!titulo || !descripcion || !categoria) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Procesar archivos subidos
    const archivosIds: string[] = [];
    const files = formData.getAll('files') as File[];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      // Validaciones del archivo
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `El archivo "${file.name}" es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.name}` },
          { status: 400 }
        );
      }

      // Leer el archivo y calcular checksum
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const checksum = calculateChecksum(buffer);

      // Generar nombre único para el archivo
      const fileName = generateFileName(file.name);
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      try {
        // Subir archivo a GridFS
        const gridfsId = await GridFSStorage.uploadFile(buffer, fileName, {
          nombreOriginal: file.name,
          categoria: 'evidencia',
          creadoPor: user.userId,
          esConfidencial: false,
          descripcion: `Archivo adjunto a evidencia: ${titulo}`,
          tipoMime: file.type,
          extension
        });

        // Guardar registro en la base de datos
        const newFile = new File({
          nombreOriginal: file.name,
          nombreArchivo: fileName,
          gridfsId,
          tamaño: file.size,
          tipoMime: file.type,
          extension,
          descripcion: `Archivo adjunto a evidencia: ${titulo}`,
          categoria: 'evidencia',
          creadoPor: user.userId,
          esConfidencial: false,
          checksum,
          usuariosAutorizados: []
        });

        const archivoGuardado = await newFile.save();
        archivosIds.push(archivoGuardado._id);

      } catch (fileError) {
        console.error('Error subiendo archivo:', fileError);
        return NextResponse.json(
          { error: `Error subiendo el archivo: ${file.name}` },
          { status: 500 }
        );
      }
    }

    // Crear la evidencia
    const nuevaEvidencia = new Evidencia({
      titulo,
      descripcion,
      categoria,
      fecha: fecha ? new Date(fecha) : new Date(),
      archivos: archivosIds,
      creadoPor: user.userId,
      eliminado: false
    });

    const evidenciaGuardada = await nuevaEvidencia.save();
    await evidenciaGuardada.populate('creadoPor', 'nombre apellido');
    await evidenciaGuardada.populate({
      path: 'archivos',
      model: 'File',
      select: '_id nombreOriginal tamaño tipoMime'
    });

    // Agregar tamañoFormateado manualmente después del populate
    if (evidenciaGuardada.archivos && Array.isArray(evidenciaGuardada.archivos)) {
      evidenciaGuardada.archivos.forEach((archivo: any) => {
        if (archivo && archivo.tamaño) {
          const bytes = archivo.tamaño;
          if (bytes === 0) {
            archivo.tamañoFormateado = '0 Bytes';
          } else {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            archivo.tamañoFormateado = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: evidenciaGuardada
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando evidencia:', error);
    
    // Si es un error de validación de Mongoose, devolver detalles
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Error de validación', 
          details: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const evidenciaId = searchParams.get('id');

    if (!evidenciaId) {
      return NextResponse.json(
        { error: 'ID de evidencia requerido' },
        { status: 400 }
      );
    }

    // Buscar la evidencia existente
    const evidenciaExistente = await Evidencia.findById(evidenciaId);
    if (!evidenciaExistente) {
      return NextResponse.json(
        { error: 'Evidencia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos de actualización
    const puedeActualizar = await hasPermission(user.userId, 'evidencias', 'actualizar');
    if (!puedeActualizar) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar evidencias' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, descripcion, categoria, fecha } = body;

    // Validaciones básicas
    if (!titulo || !descripcion || !categoria) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Actualizar la evidencia
    evidenciaExistente.titulo = titulo;
    evidenciaExistente.descripcion = descripcion;
    evidenciaExistente.categoria = categoria;
    evidenciaExistente.fecha = fecha ? new Date(fecha) : evidenciaExistente.fecha;
    evidenciaExistente.fechaActualizacion = new Date();

    const evidenciaActualizada = await evidenciaExistente.save();
    await evidenciaActualizada.populate('creadoPor', 'nombre apellido');
    await evidenciaActualizada.populate({
      path: 'archivos',
      model: 'File',
      select: '_id nombreOriginal tamaño tipoMime'
    });

    // Agregar tamañoFormateado manualmente después del populate
    if (evidenciaActualizada.archivos && Array.isArray(evidenciaActualizada.archivos)) {
      evidenciaActualizada.archivos.forEach((archivo: any) => {
        if (archivo && archivo.tamaño) {
          const bytes = archivo.tamaño;
          if (bytes === 0) {
            archivo.tamañoFormateado = '0 Bytes';
          } else {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            archivo.tamañoFormateado = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: evidenciaActualizada
    });

  } catch (error) {
    console.error('Error actualizando evidencia:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Error de validación', 
          details: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const evidenciaId = searchParams.get('id');

    if (!evidenciaId) {
      return NextResponse.json(
        { error: 'ID de evidencia requerido' },
        { status: 400 }
      );
    }

    // Buscar la evidencia existente
    const evidenciaExistente = await Evidencia.findById(evidenciaId);
    if (!evidenciaExistente) {
      return NextResponse.json(
        { error: 'Evidencia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos de eliminación
    const puedeEliminar = await hasPermission(user.userId, 'evidencias', 'eliminar');
    if (!puedeEliminar) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar evidencias' },
        { status: 403 }
      );
    }

    // Eliminación lógica (soft delete)
    evidenciaExistente.eliminado = true;
    evidenciaExistente.fechaActualizacion = new Date();
    await evidenciaExistente.save();

    return NextResponse.json({
      success: true,
      message: 'Evidencia eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando evidencia:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}