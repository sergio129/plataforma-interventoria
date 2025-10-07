import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Definir rutas protegidas y sus permisos requeridos
const protectedRoutes: Record<string, string[]> = {
  '/dashboard': [], // Accesible para todos los usuarios autenticados
  '/roles': ['administrador'], // Solo administradores
  '/usuarios': ['administrador'], // Solo administradores  
  '/proyectos': ['administrador', 'interventor', 'contratista', 'supervisor'], // Múltiples roles
  '/archivo': ['administrador', 'interventor', 'contratista', 'supervisor'], // Archivo de interventoría
  '/documentos': ['administrador', 'interventor', 'contratista', 'supervisor'], // Múltiples roles
  '/reportes': ['administrador', 'interventor', 'supervisor'], // Solo roles que pueden generar reportes
};

function isValidToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now; // Verificar que el token no haya expirado
  } catch (e) {
    return false;
  }
}

function getUserFromToken(token: string): { tipoUsuario: string } | null {
  try {
    // Primero verificar si el token es válido
    if (!isValidToken(token)) {
      return null;
    }
    
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
    // Obtener token de las cookies o headers (probar ambos nombres de token)
    const token = request.cookies.get('auth_token')?.value || 
                  request.cookies.get('token')?.value ||
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No hay token, redirigir al login con parámetro de redirección
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirect', pathname.slice(1)); // Remover el '/' inicial
      return NextResponse.redirect(redirectUrl);
    }
    
    const user = getUserFromToken(token);
    
    if (!user) {
      // Token inválido, redirigir al login
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirect', pathname.slice(1));
      redirectUrl.searchParams.set('error', 'token-expired');
      return NextResponse.redirect(redirectUrl);
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