import { NextResponse } from 'next/server';
import { TipoRecurso, TipoPermiso } from '@/lib/models/Rol';

export async function GET() {
  try {
    const recursos = Object.values(TipoRecurso).map(r => ({ key: r, label: r }));
    const acciones = Object.values(TipoPermiso);
    return NextResponse.json({ success: true, data: { recursos, acciones } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Error' }, { status: 500 });
  }
}
