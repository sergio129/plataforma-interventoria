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

    const evidencias = await Evidencia.find(filtro)
      .populate('creadoPor', 'nombre apellido')
      .populate('archivos', 'nombreOriginal tamaño tipoMime tamañoFormateado')
      .sort({ fecha: -1 });
    
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
    await evidenciaGuardada.populate('archivos', 'nombreOriginal tamaño tipoMime tamañoFormateado');

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
        details: process.env.NODE_ENV === 'development' ? error.message : undef