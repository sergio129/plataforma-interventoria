import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../../lib/database';
import File from '../../../../modules/archivo/models/File';
import { GridFSStorage } from '../../../../lib/storage/gridfsStorage';
import jwt from 'jsonwebtoken';

// Marcar la ruta como dinámica
export const dynamic = 'force-dynamic';

// Configuración
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB (límite que especificaste)
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const radicadoId = formData.get('radicadoId') as string;
    const categoria = formData.get('categoria') as string || 'adjunto';
    const descripcion = formData.get('descripcion') as string || '';
    const esConfidencial = formData.get('esConfidencial') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      );
    }

    // Validaciones
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Leer el archivo y calcular checksum
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const checksum = calculateChecksum(buffer);

    // Verificar si ya existe un archivo con el mismo nombre en el mismo radicado
    if (radicadoId) {
      const existingFile = await File.findOne({ 
        nombreOriginal: file.name,
        radicadoId, 
        activo: true 
      });
      if (existingFile) {
        return NextResponse.json(
          { error: `Ya existe un archivo llamado "${file.name}" en este radicado` },
          { status: 409 }
        );
      }
    }
    // Si no hay radicadoId, permitir cualquier archivo (no verificar duplicados globales)

    // Generar nombre único para el archivo
    const fileName = generateFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      // Subir archivo a GridFS
      const gridfsId = await GridFSStorage.uploadFile(buffer, fileName, {
        nombreOriginal: file.name,
        categoria,
        radicadoId: radicadoId || undefined,
        creadoPor: user.userId,
        esConfidencial,
        descripcion,
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
        descripcion,
        categoria,
        radicadoId: radicadoId || undefined,
        creadoPor: user.userId,
        esConfidencial,
        checksum,
        usuariosAutorizados: esConfidencial ? [user.userId] : []
      });

      await newFile.save();
      await newFile.populate('creadoPor', 'nombre email');

      return NextResponse.json({
        success: true,
        data: newFile,
        message: 'Archivo subido exitosamente a GridFS'
      }, { status: 201 });

    } catch (gridfsError) {
      console.error('Error subiendo a GridFS:', gridfsError);
      return NextResponse.json(
        { error: 'Error subiendo archivo al sistema de almacenamiento' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
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
    const radicadoId = searchParams.get('radicadoId');
    const categoria = searchParams.get('categoria');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    // Construir filtros
    const filtros: any = { activo: true };
    
    if (radicadoId) {
      filtros.radicadoId = radicadoId;
    }
    
    if (categoria) {
      filtros.categoria = categoria;
    }

    const [archivos, total] = await Promise.all([
      File.find(filtros)
        .populate('creadoPor', 'nombre email')
        .populate('radicadoId', 'consecutivo asunto')
        .sort({ fechaSubida: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      File.countDocuments(filtros)
    ]);

    // Filtrar archivos confidenciales según permisos
    const archivosAccesibles = archivos.filter((archivo: any) => {
      if (!archivo.esConfidencial) return true;
      return archivo.usuariosAutorizados.some((id: any) => 
        id.toString() === user.userId.toString()
      );
    });

    return NextResponse.json({
      success: true,
      data: archivosAccesibles,
      pagination: {
        page,
        limit,
        total: archivosAccesibles.length,
        pages: Math.ceil(archivosAccesibles.length / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}