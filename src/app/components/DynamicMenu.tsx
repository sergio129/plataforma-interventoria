"use client";
import React from 'react';
import { useMenuGeneration } from '../hooks/useMenuGeneration';

interface DynamicMenuProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function DynamicMenu({ className, style }: DynamicMenuProps) {
  const { menuItems, loading } = useMenuGeneration();

  if (loading) {
    return (
      <div className={className} style={style}>
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
          Cargando menú...
        </div>
      </div>
    );
  }

  return (
    <nav className={className} style={style}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        minWidth: '200px'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          Navegación
        </h2>
        
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menuItems.map((item) => (
            <li key={item.href} style={{ marginBottom: '0.5rem' }}>
              <a
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  backgroundColor: window.location.pathname === item.href ? '#eff6ff' : 'transparent',
                  borderLeft: window.location.pathname === item.href ? '3px solid #3b82f6' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (window.location.pathname !== item.href) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (window.location.pathname !== item.href) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon && (
                  <span style={{ fontSize: '1.25rem' }}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}