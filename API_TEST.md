# Pruebas de la API de Plataforma de Interventoría

Este archivo contiene ejemplos de requests para probar la API.

## 1. Información de la API

```bash
GET http://localhost:3000/api
```

## 2. Health Check

```bash
GET http://localhost:3000/api/health
```

## 3. Login (usar con los datos creados en init-data.ts)

### Login como Administrador
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@interventoria.com",
  "password": "123456"
}
```

### Login como Interventor
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "juan.rodriguez@interventoria.com",
  "password": "123456"
}
```

## 4. Obtener perfil (requiere token)

```bash
GET http://localhost:3000/api/auth/perfil
Authorization: Bearer YOUR_TOKEN_HERE
```

## 5. Listar usuarios (solo admin)

```bash
GET http://localhost:3000/api/usuarios
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
```

## 6. Crear usuario (solo admin)

```bash
POST http://localhost:3000/api/usuarios
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
Content-Type: application/json

{
  "nombre": "Carlos",
  "apellido": "Mendoza",
  "email": "carlos.mendoza@interventoria.com",
  "password": "Password123",
  "cedula": "1234567890",
  "telefono": "3001234567",
  "tipoUsuario": "contratista",
  "profesion": "Ingeniero Civil"
}
```

## 7. Estadísticas de usuarios (solo admin)

```bash
GET http://localhost:3000/api/usuarios/estadisticas
Authorization: Bearer YOUR_ADMIN_TOKEN_HERE
```

## Datos de prueba creados automáticamente:

Los siguientes usuarios fueron creados con el script de inicialización:

1. **Administrador**
   - Email: admin@interventoria.com
   - Password: 123456
   - Tipo: administrador

2. **Interventor**
   - Email: juan.rodriguez@interventoria.com
   - Password: 123456
   - Tipo: interventor

3. **Contratista**
   - Email: maria.lopez@interventoria.com
   - Password: 123456
   - Tipo: contratista

4. **Supervisor**
   - Email: carlos.martinez@interventoria.com
   - Password: 123456
   - Tipo: supervisor

## Notas importantes:

- Todos los endpoints excepto `/api/auth/login` requieren autenticación con JWT
- Los tokens JWT expiran en 24 horas
- Las rutas de administración solo están disponibles para usuarios con rol "administrador"
- El servidor debe estar corriendo en el puerto 3000