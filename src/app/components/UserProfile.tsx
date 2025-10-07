"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserProfile() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ nombre?: string; apellido?: string; email?: string; roles?: string[] } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // read token and try to fetch user by id
    try {
      const raw = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!raw) return;
      let token = raw;
      try { const parsed = JSON.parse(raw); token = parsed?.token || (typeof parsed === 'string' ? parsed : raw); } catch {}
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(decodeURIComponent(escape(window.atob(parts[1]))));
        const id = payload?.userId;
        if (id) {
          fetch(`/api/usuarios/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(j => {
            if (j?.success && j.data) {
              const roleNames: string[] = (j.data.roles || []).map((r: any) => r?.nombre).filter(Boolean);
              setUser({ nombre: j.data.nombre, apellido: j.data.apellido, email: j.data.email, roles: roleNames });
            }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  function logout() {
    try { 
      // Limpiar localStorage
      localStorage.removeItem('token'); 
      localStorage.removeItem('auth_token');
      
      // Limpiar cookies
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (e) {
      console.warn('Error al limpiar datos de autenticación:', e);
    }
    router.push('/auth/signin');
  }

  const initials = (user ? ((user.nombre?.[0]||'') + (user.apellido?.[0]||'')) : 'US').toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn ghost" onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: '#3b82f6', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials}</span>
          <span style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : 'Usuario'}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{user?.email || ''}</div>
          </span>
        </span>
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 260, background: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 60 }}>
          <div style={{ padding: 16, background: 'linear-gradient(90deg,#3b82f6,#06b6d4)', color: 'white' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initials}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : 'Usuario'}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{user?.email || ''}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Rol del Sistema</div>
                  <div style={{ fontWeight: 700 }}>{(user?.roles && user.roles.length) ? user.roles.join(', ') : '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn danger" onClick={logout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
