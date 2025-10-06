"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import './menu.css';

interface MenuItem { href: string; label: string }

export default function Menu({ items }: { items: MenuItem[] }) {
  const [permisos, setPermisos] = useState<{ recurso: string; acciones: string[] }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/permisos/me');
        if (!res.ok) return;
        const j = await res.json();
        if (j.success) setPermisos(j.data || []);
      } catch (e) {
        // ignore
      }
    }
    load();
  }, []);

  function canAccessHref(href: string) {
    // map simple paths to recurso by first segment
    const seg = href.split('/').filter(Boolean)[0] || 'dashboard';
    const permiso = permisos.find(p => p.recurso === seg || p.recurso === `${seg}s`);
    if (!permiso) return true; // if no permiso entry, show by default
    return permiso.acciones.includes('acceder');
  }

  return (
    <div className="menu">
      <div className="menu-title">
        <span className="menu-icon">📋</span>
        Plataforma
      </div>
      <ul className="menu-list">
        {items.filter(i => canAccessHref(i.href)).map(i => (
          <li key={i.href}><Link href={i.href} className="menu-link">{i.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
