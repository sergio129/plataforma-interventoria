"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Guardar token en localStorage para uso posterior
      try {
        if (body.data?.token) localStorage.setItem("token", body.data.token);
      } catch (e) {
        // En entornos sin localStorage simplemente continuar
        console.warn("No se pudo acceder a localStorage", e);
      }

      // Redirigir al dashboard
      router.push("/dashboard");
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
        <p style={{ marginTop: 0, marginBottom: 16, color: "#374151" }}>Ingresa tus credenciales para acceder</p>

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
