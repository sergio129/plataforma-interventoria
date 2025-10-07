"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si ya está autenticado al cargar la página
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        if (payload.exp > now) {
          // Ya está autenticado, redirigir al dashboard
          const redirect = searchParams.get('redirect') || 'dashboard';
          router.replace(`/${redirect}`);
          return;
        }
      } catch (e) {
        // Token inválido, continuar con el login
      }
    }

    // Verificar errores en los parámetros de URL
    const errorParam = searchParams.get('error');
    if (errorParam === 'token-expired') {
      setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    } else if (errorParam === 'access-denied') {
      setError('No tienes permisos para acceder a esa página.');
    }
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        setError(body?.message || "Credenciales inválidas");
        setLoading(false);
        return;
      }

      // Guardar token en localStorage y establecer cookie
      try {
        if (body.data?.token) {
          localStorage.setItem("auth_token", body.data.token);
          // Mantener compatibilidad con el token anterior
          localStorage.setItem("token", body.data.token);
          
          // Establecer cookie para el middleware (httpOnly sería ideal pero no es posible desde el cliente)
          // Calcular fecha de expiración del token
          const payload = JSON.parse(atob(body.data.token.split('.')[1]));
          const expDate = new Date(payload.exp * 1000);
          
          document.cookie = `auth_token=${body.data.token}; expires=${expDate.toUTCString()}; path=/; SameSite=Strict; Secure=${location.protocol === 'https:'}`;
        }
      } catch (e) {
        console.warn("No se pudo acceder a localStorage o establecer cookie", e);
      }

      // Redirigir basado en el parámetro redirect o al dashboard por defecto
      const redirect = searchParams.get('redirect') || 'dashboard';
      router.push(`/${redirect}`);
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ width: 420, padding: 24, borderRadius: 8, background: "white", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 20 }}>Iniciar Sesión</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#374151" }}>
          {searchParams.get('redirect') ? 
            'Debes iniciar sesión para acceder a esa página' : 
            'Ingresa tus credenciales para acceder'
          }
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", marginBottom: 12 }}
          />

          <label style={{ display: "block", marginBottom: 8, fontSize: 13 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb", marginBottom: 12 }}
          />

          {error && (
            <div style={{ marginBottom: 12, color: "#b91c1c", fontSize: 13 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#2563eb", color: "white", fontWeight: 600, border: "none", cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
          <a href="/" style={{ color: "#374151", textDecoration: "underline" }}>Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)'
      }}>
        <div style={{ color: 'white' }}>Cargando...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
