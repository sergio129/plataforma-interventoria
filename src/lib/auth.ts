import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export interface TokenPayload {
  userId: string;
  email?: string;
  tipoUsuario?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extrae y verifica el JWT del header Authorization (Bearer <token>).
 * Si es inválido o no existe lanza una NextResponse con 401.
 */
export function getUserFromRequest(request: Request): TokenPayload {
  const auth = request.headers.get('authorization');
  if (!auth) {
    throw NextResponse.json({ success: false, message: 'Token no proporcionado' }, { status: 401 });
  }

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw NextResponse.json({ success: false, message: 'Formato de token inválido' }, { status: 401 });
  }

  const token = parts[1];
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const payload = jwt.verify(token, secret) as TokenPayload;
    if (!payload || !payload.userId) {
      throw new Error('Payload inválido');
    }
    return payload;
  } catch (error) {
    console.error('JWT verification error', error);
    throw NextResponse.json({ success: false, message: 'Token inválido o expirado' }, { status: 401 });
  }
}
