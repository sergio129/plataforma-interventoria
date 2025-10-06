"use client";
import React from 'react';
import Link from 'next/link';
import './menu.css';

interface MenuItem { href: string; label: string }

export default function Menu({ items }: { items: MenuItem[] }) {
  return (
    <div className="menu">
      <div className="menu-title">
        <span className="menu-icon">📋</span>
        Plataforma
      </div>
      <ul className="menu-list">
        {items.map(i => (
          <li key={i.href}><Link href={i.href} className="menu-link">{i.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
