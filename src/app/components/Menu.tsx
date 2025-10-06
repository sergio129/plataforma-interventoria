"use client";
import React from 'react';
import Link from 'next/link';
import './menu.css';

interface MenuItem { href: string; label: string }

export default function Menu({ items }: { items: MenuItem[] }) {
  return (
    <aside className="pi-menu">
      <div className="pi-menu-logo">Plataforma</div>
      <nav>
        <ul>
          {items.map(i => (
            <li key={i.href}><Link href={i.href} className="pi-menu-link">{i.label}</Link></li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
