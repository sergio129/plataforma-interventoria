import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../config/database';
import File from '../../../../../modules/archivo/models/File';
import { GridFSStorage, initGridFS } from '../../../../../lib/storage/gridfsStorage';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const fileId = params.id;
    console.log('Buscando archivo con ID:', fileId);

    // Verificar que GridFS esté inicializado
    try {
      const { initGridFS } = await import('../../../../../lib/storage/gridfsStorage');
      initGridFS();
      console.log('GridFS inicializado correctamente');
    } catch (initError) {
      console.error('Error inicializando GridFS:', initError);
    }
    
    const file = await File.findById(fileId);
    console.log('Archivo encontrado:', file ? 'Sí' : 'No');
    console.log('Datos del archivo:', file?.toObject());

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    if (!file.activo) {
      return NextResponse.json(
        { error: 'Archivo no disponible' },
        { status: 410 }
      );
    }

    // Verificar si el archivo es confidencial y el usuario tiene acceso
    if (file.esConfidencial && !file.usuariosAutorizados.includes(user.userId) && file.creadoPor?.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este archivo' },
        { status: 403 }
      );
    }

    try {
      console.log('Intentando descargar archivo de GridFS con ID:', file.gridfsId);
      
      // Obtener el archivo de GridFS (solo devuelve Buffer)
      const buffer = await GridFSStorage.downloadFile(file.gridfsId);
      console.log('Buffer recibido desde GridFS, tamaño:', buffer?.length || 'undefined');
      
      if (!buffer) {
        console.error('GridFS no devolvió buffer válido');
        return NextResponse.json(
          { error: 'Archivo no encontrado en almacenamiento' },
          { status: 404 }
        );
      }

      // Configurar headers para la descarga
      const headers = new Headers();
      headers.set('Content-Type', file.tipoMime || 'application/octet-stream');
      headers.set('Content-Length', buffer.length.toString());
      headers.set('Content-Disposition', `attachment; filename="${file.nombreOriginal}"`);
      headers.set('Cache-Control', 'private, max-age=3600');

      return new NextResponse(buffer, {
        status: 200,
        headers
      });

    } catch (gridfsError) {
      console.error('Error descargando archivo de GridFS:', gridfsError);
      console.error('Stack trace:', gridfsError.stack);
      return NextResponse.json(
        { error: 'Error accediendo al archivo' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en descarga de archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}