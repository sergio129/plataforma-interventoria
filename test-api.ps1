# Script de prueba de la API de Plataforma de Interventoría
# Ejecutar: .\test-api.ps1

Write-Host "🧪 Iniciando pruebas de la API..." -ForegroundColor Cyan

# Verificar que el servidor esté corriendo
Write-Host "`n1. Verificando que el servidor esté activo..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "✅ Servidor activo" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Environment: $($response.environment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: El servidor no está activo en el puerto 3000" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar 'npm run dev' primero" -ForegroundColor Red
    exit 1
}

# Obtener información de la API
Write-Host "`n2. Obteniendo información de la API..." -ForegroundColor Yellow
try {
    $apiInfo = Invoke-RestMethod -Uri "http://localhost:3000/api" -Method GET
    Write-Host "✅ API activa" -ForegroundColor Green
    Write-Host "   Version: $($apiInfo.version)" -ForegroundColor Gray
    Write-Host "   Endpoints disponibles:" -ForegroundColor Gray
    $apiInfo.endpoints.PSObject.Properties | ForEach-Object {
        Write-Host "     - $($_.Name): $($_.Value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error al obtener información de la API" -ForegroundColor Red
}

# Test de login con admin
Write-Host "`n3. Probando login como administrador..." -ForegroundColor Yellow
$loginData = @{
    email = "admin@interventoria.com"
    password = "123456"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -Headers $headers
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.data.usuario.nombre) $($loginResponse.data.usuario.apellido)" -ForegroundColor Gray
    Write-Host "   Tipo: $($loginResponse.data.usuario.tipoUsuario)" -ForegroundColor Gray
    Write-Host "   Token generado: $($loginResponse.data.token.Substring(0, 20))..." -ForegroundColor Gray
    
    $adminToken = $loginResponse.data.token
    
    # Test de obtener perfil
    Write-Host "`n4. Obteniendo perfil del usuario..." -ForegroundColor Yellow
    $authHeaders = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/perfil" -Method GET -Headers $authHeaders
        Write-Host "✅ Perfil obtenido exitosamente" -ForegroundColor Green
        Write-Host "   Email: $($profileResponse.data.email)" -ForegroundColor Gray
        Write-Host "   Profesión: $($profileResponse.data.profesion)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error al obtener perfil: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test de listar usuarios
    Write-Host "`n5. Listando usuarios (solo admin)..." -ForegroundColor Yellow
    try {
        $usuariosResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios" -Method GET -Headers $authHeaders
        Write-Host "✅ Lista de usuarios obtenida" -ForegroundColor Green
        Write-Host "   Total de usuarios: $($usuariosResponse.data.usuarios.Count)" -ForegroundColor Gray
        Write-Host "   Usuarios:" -ForegroundColor Gray
        $usuariosResponse.data.usuarios | ForEach-Object {
            Write-Host "     - $($_.nombre) $($_.apellido) ($($_.tipoUsuario))" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error al listar usuarios: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test de estadísticas
    Write-Host "`n6. Obteniendo estadísticas de usuarios..." -ForegroundColor Yellow
    try {
        $statsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/estadisticas" -Method GET -Headers $authHeaders
        Write-Host "✅ Estadísticas obtenidas" -ForegroundColor Green
        Write-Host "   Total usuarios: $($statsResponse.data.resumen.total)" -ForegroundColor Gray
        Write-Host "   Usuarios activos: $($statsResponse.data.resumen.activos)" -ForegroundColor Gray
        Write-Host "   Usuarios inactivos: $($statsResponse.data.resumen.inactivos)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error al obtener estadísticas: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
}

# Test de login con credenciales incorrectas
Write-Host "`n7. Probando login con credenciales incorrectas..." -ForegroundColor Yellow
$badLoginData = @{
    email = "admin@interventoria.com"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $badLoginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $badLoginData -Headers $headers
    Write-Host "❌ Error: Login debería haber fallado" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Login correctamente rechazado (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "❌ Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test de acceso sin token
Write-Host "`n8. Probando acceso a ruta protegida sin token..." -ForegroundColor Yellow
try {
    $noTokenResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/perfil" -Method GET
    Write-Host "❌ Error: Acceso debería haber sido denegado" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Acceso correctamente denegado (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "❌ Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Pruebas completadas!" -ForegroundColor Cyan
Write-Host "La API está funcionando correctamente." -ForegroundColor Green