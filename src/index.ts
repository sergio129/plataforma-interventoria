import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';

// Importar modelos para que se registren en mongoose
import './models/Usuario';
import './models/Proyecto';
import './models/Documento';
import './models/Reporte';

// Cargar variables de entorno
dotenv.config();

class PlataformaInterventoriaServer {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Seguridad
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://tu-dominio.com'] // Cambiar por el dominio real en producción
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compresión
    this.app.use(compression());

    // Parsing de JSON y URL encoded
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Middleware para logging de requests
    if (process.env.NODE_ENV !== 'production') {
      this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }

    // Middleware para servir archivos estáticos
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
    // Ruta de health check
    this.app.get('/api/health', (req: express.Request, res: express.Response) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Ruta de información de la API
    this.app.get('/api', (req: express.Request, res: express.Response) => {
      res.json({
        message: 'Plataforma Virtual de Interventoría - API REST',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          usuarios: '/api/usuarios',
          proyectos: '/api/proyectos (próximamente)',
          documentos: '/api/documentos (próximamente)',
          reportes: '/api/reportes (próximamente)'
        }
      });
    });

    // Importar rutas
    const authRoutes = require('./routes/auth').default;
    const usuariosRoutes = require('./routes/usuarios').default;
    const evidenciaRoutes = require('./routes/evidencias').default;

    // Registrar rutas
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/usuarios', usuariosRoutes);
    this.app.use('/api/evidencias', evidenciaRoutes);
    
    // Próximamente:
    // this.app.use('/api/proyectos', proyectosRouter);
    // this.app.use('/api/documentos', documentosRouter);
    // this.app.use('/api/reportes', reportesRouter);

    // Ruta catch-all para 404
    this.app.all('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Endpoint no encontrado',
        message: `La ruta ${req.method} ${req.path} no existe`,
        availableEndpoints: [
          'GET /api',
          'GET /api/health',
          'POST /api/auth/login',
          'GET /api/auth/perfil',
          'GET /api/usuarios',
          'POST /api/usuarios'
        ]
      });
    });
  }

  private initializeErrorHandling(): void {
    // Middleware de manejo de errores
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);

      // Error de validación de Mongoose
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e: any) => e.message);
        return res.status(400).json({
          error: 'Error de validación',
          details: errors
        });
      }

      // Error de duplicado de MongoDB
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
          error: 'Recurso duplicado',
          message: `Ya existe un registro con ese ${field}`
        });
      }

      // Error de casting de MongoDB (ID inválido)
      if (err.name === 'CastError') {
        return res.status(400).json({
          error: 'ID inválido',
          message: 'El ID proporcionado no tiene un formato válido'
        });
      }

      // Error de JSON malformado
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'JSON inválido',
          message: 'El cuerpo de la petición no es un JSON válido'
        });
      }

      // Error genérico del servidor
      return res.status(err.status || 500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' 
          ? 'Ha ocurrido un error inesperado' 
          : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Conectar a la base de datos
      console.log('🚀 Iniciando Plataforma de Interventoría...');
      await connectToDatabase();

      // Iniciar servidor
      this.app.listen(this.port, () => {
        console.log(`✅ Servidor corriendo en puerto ${this.port}`);
        console.log(`🌐 URL: http://localhost:${this.port}`);
        console.log(`📚 API: http://localhost:${this.port}/api`);
        console.log(`❤️  Health: http://localhost:${this.port}/api/health`);
        console.log(`🏗️  Ambiente: ${process.env.NODE_ENV || 'development'}`);
      });

    } catch (error) {
      console.error('❌ Error iniciando el servidor:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Crear y exportar la instancia del servidor
const server = new PlataformaInterventoriaServer();

// Iniciar el servidor si este archivo es ejecutado directamente
if (require.main === module) {
  server.start().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export default server;