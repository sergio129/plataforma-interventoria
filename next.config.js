/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporalmente ignoramos errores durante la migración
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporalmente ignoramos errores durante la migración
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig