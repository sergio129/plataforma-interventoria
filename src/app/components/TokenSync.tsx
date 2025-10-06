"use client";
import { useEffect } from 'react';

export default function TokenSync() {
  useEffect(() => {
    // Sincronizar token de localStorage a cookies para el middleware
    const token = localStorage.getItem('token');
    if (token) {
      // Establecer cookie para que el middleware pueda leerla
      document.cookie = `token=${token}; path=/; secure; samesite=strict`;
    }
  }, []);

  return null; // Este componente no renderiza nada
}