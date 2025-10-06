import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Definir rutas protegidas y sus permisos requeridos
const protectedRoutes: Record<string, string[]> = {
  '/dashboard': [], // Accesible para todos los usuarios autenticados
  '/roles': ['administrador'], // Solo administradores
  '/usuarios': ['administrador'], // Solo administradores  
  '/proyectos': ['administrador', 'interventor', 'contratista', 'supervisor'], // Múltiples roles
  '/documentos': ['administrador', 'interventor', 'contratista', 'supervisor'], // Múltiples roles
  '/reportes': ['administrador', 'interventor', 'supervisor'], // Solo roles que pueden generar reportes
};

function getUserFromToken(token: string): { tipoUsuario: string } | null {
  try {
    // Decodificar token JWT manualmente (sin verificar por ahora en middleware)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { tipoUsuario: payload.tipoUsuario || 'usuario' };
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar si la ruta actual está protegida
  const requiredRoles = protectedRoutes[pathname];
  
  if (requiredRoles !== undefined) {
    // Obtener token de las cookies o headers (para el middleware usaremos cookies por seguridad)
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No hay token, crear response para redirect pero agregar header especial para el cliente
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      response.headers.set('x-middleware-redirect', 'auth-required');
      return response;
    }
    
    const user = getUserFromToken(token);
    
    if (!user) {
      // Token inválido
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      response.headers.set('x-middleware-redirect', 'invalid-token');
      return response;
    }
    
    // Si la ruta requiere roles específicos, verificar permisos
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.tipoUsuario)) {
      // Usuario no tiene permisos
      const response = NextResponse.redirect(new URL('/dashboard?error=access-denied', request.url));
      response.headers.set('x-middleware-redirect', 'access-denied');
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/roles/:path*', 
    '/usuarios/:path*',
    '/proyectos/:path*',
  ]
};