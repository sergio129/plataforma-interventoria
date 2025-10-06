# Plataforma Virtual de Interventoría

Una plataforma web desarrollada en TypeScript y Node.js para la gestión integral de proyectos de interventoría, supervisión y control de obras.

## 🚀 Características Principales

### Gestión de Usuarios
- **Roles diferenciados**: Administrador, Interventor, Contratista, Supervisor
- **Autenticación segura** con JWT
- **Perfiles profesionales** con certificaciones y experiencia
- **Control de acceso** por roles y permisos

### Gestión de Proyectos
- **Información completa** de proyectos (construcción, infraestructura, tecnología)
- **Seguimiento de avance** con indicadores y métricas
- **Gestión de hitos** y cronogramas
- **Control presupuestal** y financiero
- **Geolocalización** de proyectos

### Documentación
- **Gestión de documentos** con versionado
- **Control de aprobaciones** y revisiones
- **Clasificación por tipos** (contratos, planos, informes, etc.)
- **Seguridad y permisos** de acceso
- **Trazabilidad completa** de cambios

### Reportes de Interventoría
- **Reportes especializados**: Avance, calidad, seguridad, cumplimiento
- **Gestión de hallazgos** y no conformidades
- **Seguimiento de acciones correctivas**
- **Análisis de recursos** y costos
- **Evidencias fotográficas** y documentales

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de datos**: MongoDB + Mongoose
- **Autenticación**: JWT + bcryptjs
- **Validación**: express-validator
- **Documentación**: Swagger/OpenAPI (próximamente)
- **Testing**: Jest (próximamente)

## 📋 Requisitos Previos

- Node.js >= 16.x
- MongoDB >= 5.x
- npm >= 8.x

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd plataforma-interventoria
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Editar el archivo `.env` con la configuración correcta:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/AseoriaJuridica
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Compilar TypeScript**
   ```bash
   npm run build
   ```

## 🚀 Uso

### Desarrollo
```bash
# Modo desarrollo con recarga automática
npm run dev

# Inicializar datos de ejemplo
npx ts-node src/init-data.ts

# Analizar base de datos
npx ts-node src/database-analyzer.ts
```

### Producción
```bash
# Compilar y ejecutar
npm run build
npm start
```

## 📊 Estructura del Proyecto

```
src/
├── config/           # Configuraciones
│   ├── database.ts   # Configuración de MongoDB
│   └── ...
├── models/           # Modelos de datos (Mongoose)
│   ├── Usuario.ts    # Modelo de usuarios
│   ├── Proyecto.ts   # Modelo de proyectos
│   ├── Documento.ts  # Modelo de documentos
│   ├── Reporte.ts    # Modelo de reportes
│   └── ...
├── controllers/      # Controladores (próximamente)
├── routes/          # Rutas de la API (próximamente)
├── middleware/      # Middlewares (próximamente)
├── services/        # Lógica de negocio (próximamente)
├── utils/           # Utilidades (próximamente)
├── init-data.ts     # Script de inicialización
├── database-analyzer.ts # Herramienta de análisis
└── index.ts         # Punto de entrada principal
```

## 🗄️ Modelos de Datos

### Usuario
- Información personal y profesional
- Roles: administrador, interventor, contratista, supervisor
- Certificaciones y experiencia
- Control de estado y acceso

### Proyecto
- Información general y ubicación
- Participantes y roles
- Cronograma e hitos
- Presupuesto y avance
- Documentos relacionados

### Documento
- Metadatos y clasificación
- Versionado y aprobaciones
- Control de acceso y seguridad
- Trazabilidad de descargas

### Reporte
- Tipos especializados de reportes
- Avance de actividades
- Hallazgos y no conformidades
- Recursos utilizados
- Aspectos de calidad y seguridad

## 🌐 API Endpoints

### Información General
- `GET /api` - Información de la API
- `GET /api/health` - Estado del servicio

### Próximamente
- `POST /api/auth/login` - Autenticación
- `GET /api/usuarios` - Listar usuarios
- `POST /api/proyectos` - Crear proyecto
- `GET /api/reportes/:id` - Obtener reporte
- Y muchos más...

## 🔒 Seguridad

- **Autenticación JWT** para todas las rutas protegidas
- **Validación de entrada** en todos los endpoints
- **Sanitización de datos** para prevenir inyecciones
- **Control de acceso** basado en roles
- **Encriptación** de contraseñas con bcrypt
- **Headers de seguridad** con Helmet.js

## 📈 Funcionalidades Próximas

### Fase 2
- [ ] API REST completa con todos los endpoints
- [ ] Sistema de autenticación y autorización
- [ ] Carga y gestión de archivos
- [ ] Notificaciones por email
- [ ] Dashboard con indicadores

### Fase 3
- [ ] Frontend web (React/Vue.js)
- [ ] App móvil (React Native)
- [ ] Reportes automáticos
- [ ] Integración con sistemas externos
- [ ] Firma digital de documentos

### Fase 4
- [ ] Inteligencia artificial para análisis
- [ ] Geolocalización avanzada
- [ ] Workflow configurable
- [ ] API pública para integraciones
- [ ] Módulo de facturación

## 🧪 Testing

```bash
# Ejecutar tests (próximamente)
npm test

# Coverage (próximamente)
npm run test:coverage
```

## 📚 Documentación

La documentación completa de la API estará disponible en:
- **Desarrollo**: http://localhost:3000/api/docs
- **Producción**: https://tu-dominio.com/api/docs

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Desarrollo Backend**: TypeScript + Node.js + MongoDB
- **Arquitectura**: Microservicios con API REST
- **Base de datos**: MongoDB con Mongoose ODM

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@interventoria.com
- Issues: GitHub Issues
- Documentación: Wiki del proyecto

---

**Plataforma Virtual de Interventoría** - Modernizando la gestión de proyectos de interventoría con tecnología de vanguardia.