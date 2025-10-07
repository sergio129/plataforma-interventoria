import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import File from '../../../../../modules/archivo/models/File';
import { GridFSStorage } from '../../../../../lib/storage/gridfsStorage';
import jwt from 'jsonwebtoken';

// Marcar la ruta como dinámica
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'download'; // 'download' o 'view'

    // Buscar el archivo en la base de datos
    const archivo = await File.findById(params.id);
    
    if (!archivo || !archivo.activo) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos de acceso
    if (archivo.esConfidencial && !archivo.tieneAcceso(user.userId)) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este archivo' },
        { status: 403 }
      );
    }

    try {
      // Descargar archivo de GridFS
      const fileBuffer = await GridFSStorage.downloadFile(archivo.gridfsId);
      
      // Configurar headers apropiados
      const headers = new Headers();
      headers.set('Content-Type', archivo.tipoMime);
      headers.set('Content-Length', archivo.tamaño.toString());
      
      if (action === 'download') {
        headers.set('Content-Disposition', `attachment; filename="${archivo.nombreOriginal}"`);
      } else if (action === 'view') {
        // Para visualización en el navegador
        if (archivo.esPDF || archivo.esImagen) {
          headers.set('Content-Disposition', `inline; filename="${archivo.nombreOriginal}"`);
          // Agregar headers para cachear la imagen/pdf por 1 hora
          headers.set('Cache-Control', 'public, max-age=3600');
        } else {
          // Si no es visualizable, forzar descarga
          headers.set('Content-Disposition', `attachment; filename="${archivo.nombreOriginal}"`);
        }
      }

      // Headers de seguridad
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers
      });

    } catch (fileError) {
      console.error('Error leyendo archivo:', fileError);
      return NextResponse.json(
        { error: 'Error al leer el archivo' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    // Buscar el archivo
    const archivo = await File.findById(params.id);
    
    if (!archivo || !archivo.activo) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario puede eliminar el archivo
    // Solo el creador o un administrador pueden eliminar
    if (archivo.creadoPor.toString() !== user.userId.toString() && user.tipoUsuario !== 'administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este archivo' },
        { status: 403 }
      );
    }

    // Eliminación suave (marcar como inactivo)
    await archivo.eliminarSoft();

    return NextResponse.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { descripcion, categoria, esConfidencial, usuariosAutorizados } = body;

    // Buscar el archivo
    const archivo = await File.findById(params.id);
    
    if (!archivo || !archivo.activo) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos de edición
    if (archivo.creadoPor.toString() !== user.userId.toString() && user.tipoUsuario !== 'administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este archivo' },
        { status: 403 }
      );
    }

    // Actualizar campos permitidos
    if (descripcion !== undefined) archivo.descripcion = descripcion;
    if (categoria !== undefined) archivo.categoria = categoria;
    if (esConfidencial !== undefined) archivo.esConfidencial = esConfidencial;
    if (usuariosAutorizados !== undefined) archivo.usuariosAutorizados = usuariosAutorizados;

    archivo.version += 1;
    await archivo.save();
    await archivo.populate('creadoPor', 'nombre email');

    return NextResponse.json({
      success: true,
      data: archivo,
      message: 'Archivo actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}