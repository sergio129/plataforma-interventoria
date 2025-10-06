import { connectToDatabase, db } from '../lib/database';
import { Usuario, TipoUsuario, EstadoUsuario } from '../lib/models/Usuario';
import { Proyecto, TipoProyecto, EstadoProyecto, PrioridadProyecto } from '../lib/models/Proyecto';
import bcrypt from 'bcryptjs';

class DataInitializer {
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Iniciando inicialización de datos...');
      
      // Conectar a la base de datos
      await connectToDatabase();
      
      // Limpiar base de datos existente (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        await this.clearDatabase();
      }
      
      // Crear datos de ejemplo
      await this.createSampleUsers();
      await this.createSampleProjects();
      
      // Crear índices
      await db.createIndexes();
      
      // Mostrar estadísticas
      await this.showStatistics();
      
      console.log('✅ Inicialización completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error durante la inicialización:', error);
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    console.log('🗑️  Limpiando base de datos...');
    await db.clearDatabase();
  }

  private async createSampleUsers(): Promise<void> {
    console.log('👥 Creando usuarios de ejemplo...');

    const hashedPassword = await bcrypt.hash('123456', 10);

    const usuarios = [
      {
        nombre: 'Juan Carlos',
        apellido: 'Rodríguez',
        email: 'admin@interventoria.com',
        password: hashedPassword,
        telefono: '+57 300 123 4567',
        cedula: '12345678',
        tipoUsuario: TipoUsuario.ADMINISTRADOR,
        estado: EstadoUsuario.ACTIVO,
        profesion: 'Ingeniero Civil',
        experiencia: '15 años en interventoría de obras civiles',
        certificaciones: ['PMP', 'Interventoría INVIAS', 'Especialización en Gerencia de Proyectos']
      },
      {
        nombre: 'María Elena',
        apellido: 'González',
        email: 'interventor@interventoria.com',
        password: hashedPassword,
        telefono: '+57 310 987 6543',
        cedula: '87654321',
        tipoUsuario: TipoUsuario.INTERVENTOR,
        estado: EstadoUsuario.ACTIVO,
        profesion: 'Arquitecta',
        experiencia: '12 años en supervisión y control de obras',
        certificaciones: ['Interventoría INVIAS', 'Especialización en Construcción Sostenible']
      },
      {
        nombre: 'Carlos Alberto',
        apellido: 'Mendoza',
        email: 'contratista@interventoria.com',
        password: hashedPassword,
        telefono: '+57 320 456 7890',
        cedula: '11223344',
        tipoUsuario: TipoUsuario.CONTRATISTA,
        estado: EstadoUsuario.ACTIVO,
        profesion: 'Ingeniero Civil',
        experiencia: '10 años en ejecución de proyectos de infraestructura',
        certificaciones: ['Registro Nacional de Constructores', 'ISO 9001']
      },
      {
        nombre: 'Ana Sofía',
        apellido: 'Herrera',
        email: 'supervisor@interventoria.com',
        password: hashedPassword,
        telefono: '+57 315 234 5678',
        cedula: '55667788',
        tipoUsuario: TipoUsuario.SUPERVISOR,
        estado: EstadoUsuario.ACTIVO,
        profesion: 'Ingeniera Industrial',
        experiencia: '8 años en supervisión de proyectos',
        certificaciones: ['Six Sigma Green Belt', 'Project Management']
      }
    ];

    const usuariosCreados = await Usuario.insertMany(usuarios);
    console.log(`✅ ${usuariosCreados.length} usuarios creados`);
    
    return;
  }

  private async createSampleProjects(): Promise<void> {
    console.log('🏗️  Creando proyectos de ejemplo...');

    // Obtener usuarios para asignar a proyectos
    const admin = await Usuario.findOne({ tipoUsuario: TipoUsuario.ADMINISTRADOR });
    const interventor = await Usuario.findOne({ tipoUsuario: TipoUsuario.INTERVENTOR });
    const contratista = await Usuario.findOne({ tipoUsuario: TipoUsuario.CONTRATISTA });
    const supervisor = await Usuario.findOne({ tipoUsuario: TipoUsuario.SUPERVISOR });

    if (!admin || !interventor || !contratista || !supervisor) {
      throw new Error('No se encontraron todos los tipos de usuario necesarios');
    }

    const proyectos = [
      {
        codigo: 'CONST-2024-001',
        nombre: 'Construcción Edificio Administrativo',
        descripcion: 'Construcción de edificio administrativo de 5 pisos con área de 2,500 m² para entidad gubernamental',
        tipoProyecto: TipoProyecto.CONSTRUCCION,
        estado: EstadoProyecto.EN_EJECUCION,
        prioridad: PrioridadProyecto.ALTA,
        fechaInicio: new Date('2024-01-15'),
        fechaFinPlaneada: new Date('2024-12-30'),
        ubicacion: {
          direccion: 'Carrera 15 # 32-45',
          ciudad: 'Bogotá',
          departamento: 'Cundinamarca',
          pais: 'Colombia',
          coordenadas: {
            latitud: 4.6097,
            longitud: -74.0817
          }
        },
        contratista: contratista._id,
        interventor: interventor._id,
        supervisor: supervisor._id,
        contactoCliente: {
          nombre: 'Roberto Silva',
          cargo: 'Director de Infraestructura',
          telefono: '+57 301 456 7890',
          email: 'rsilva@entidad.gov.co'
        },
        presupuesto: {
          valorTotal: 5500000000, // 5,500 millones COP
          valorEjecutado: 2200000000, // 2,200 millones COP
          moneda: 'COP',
          fechaAprobacion: new Date('2023-12-01')
        },
        porcentajeAvance: 40,
        hitos: [
          {
            nombre: 'Diseños y permisos',
            descripcion: 'Completar diseños arquitectónicos y obtener licencias',
            fechaPlaneada: new Date('2024-02-28'),
            fechaReal: new Date('2024-02-25'),
            completado: true,
            porcentajeAvance: 100
          },
          {
            nombre: 'Cimentación',
            descripcion: 'Excavación y construcción de cimientos',
            fechaPlaneada: new Date('2024-04-30'),
            fechaReal: new Date('2024-04-28'),
            completado: true,
            porcentajeAvance: 100
          },
          {
            nombre: 'Estructura',
            descripcion: 'Construcción de estructura en concreto',
            fechaPlaneada: new Date('2024-08-31'),
            completado: false,
            porcentajeAvance: 60
          },
          {
            nombre: 'Acabados',
            descripcion: 'Instalaciones y acabados finales',
            fechaPlaneada: new Date('2024-11-30'),
            completado: false,
            porcentajeAvance: 0
          }
        ],
        creadoPor: admin._id,
        tags: ['construccion', 'edificio', 'gubernamental', 'bogota'],
        observaciones: 'Proyecto prioritario con seguimiento semanal requerido'
      },
      {
        codigo: 'INFRA-2024-002',
        nombre: 'Mejoramiento Vía Departamental',
        descripcion: 'Mejoramiento y pavimentación de 25 km de vía departamental incluyendo obras de drenaje',
        tipoProyecto: TipoProyecto.INFRAESTRUCTURA,
        estado: EstadoProyecto.PLANIFICACION,
        prioridad: PrioridadProyecto.MEDIA,
        fechaInicio: new Date('2024-03-01'),
        fechaFinPlaneada: new Date('2024-10-31'),
        ubicacion: {
          direccion: 'Vía Municipal KM 0+000 - KM 25+000',
          ciudad: 'Villavicencio',
          departamento: 'Meta',
          pais: 'Colombia'
        },
        contratista: contratista._id,
        interventor: interventor._id,
        contactoCliente: {
          nombre: 'Luis Fernando Morales',
          cargo: 'Secretario de Obras Públicas',
          telefono: '+57 318 765 4321',
          email: 'lmorales@meta.gov.co'
        },
        presupuesto: {
          valorTotal: 8500000000, // 8,500 millones COP
          valorEjecutado: 0,
          moneda: 'COP',
          fechaAprobacion: new Date('2024-01-15')
        },
        porcentajeAvance: 15,
        hitos: [
          {
            nombre: 'Estudios y diseños',
            descripcion: 'Estudios topográficos, geotécnicos y diseños viales',
            fechaPlaneada: new Date('2024-04-15'),
            completado: false,
            porcentajeAvance: 80
          },
          {
            nombre: 'Movimiento de tierras',
            descripcion: 'Excavación, corte y relleno',
            fechaPlaneada: new Date('2024-06-30'),
            completado: false,
            porcentajeAvance: 0
          },
          {
            nombre: 'Pavimentación',
            descripcion: 'Base granular y carpeta asfáltica',
            fechaPlaneada: new Date('2024-09-15'),
            completado: false,
            porcentajeAvance: 0
          }
        ],
        creadoPor: admin._id,
        tags: ['infraestructura', 'via', 'pavimentacion', 'meta'],
        observaciones: 'Requiere coordinación con comunidades locales'
      },
      {
        codigo: 'TECH-2024-003',
        nombre: 'Implementación Sistema de Gestión',
        descripcion: 'Desarrollo e implementación de sistema de gestión documental para entidad pública',
        tipoProyecto: TipoProyecto.TECNOLOGIA,
        estado: EstadoProyecto.EN_EJECUCION,
        prioridad: PrioridadProyecto.CRITICA,
        fechaInicio: new Date('2024-02-01'),
        fechaFinPlaneada: new Date('2024-08-31'),
        ubicacion: {
          direccion: 'Carrera 7 # 26-20',
          ciudad: 'Bogotá',
          departamento: 'Cundinamarca',
          pais: 'Colombia'
        },
        contratista: contratista._id,
        interventor: interventor._id,
        supervisor: supervisor._id,
        contactoCliente: {
          nombre: 'Patricia Jiménez',
          cargo: 'Directora de Sistemas',
          telefono: '+57 312 987 6543',
          email: 'pjimenez@entidad.gov.co'
        },
        presupuesto: {
          valorTotal: 1200000000, // 1,200 millones COP
          valorEjecutado: 720000000, // 720 millones COP
          moneda: 'COP',
          fechaAprobacion: new Date('2023-11-20')
        },
        porcentajeAvance: 60,
        hitos: [
          {
            nombre: 'Análisis de requisitos',
            descripcion: 'Levantamiento y análisis de requisitos funcionales',
            fechaPlaneada: new Date('2024-03-15'),
            fechaReal: new Date('2024-03-10'),
            completado: true,
            porcentajeAvance: 100
          },
          {
            nombre: 'Desarrollo',
            descripcion: 'Desarrollo de módulos del sistema',
            fechaPlaneada: new Date('2024-06-30'),
            completado: false,
            porcentajeAvance: 80
          },
          {
            nombre: 'Implementación',
            descripcion: 'Despliegue y puesta en producción',
            fechaPlaneada: new Date('2024-08-31'),
            completado: false,
            porcentajeAvance: 20
          }
        ],
        creadoPor: admin._id,
        tags: ['tecnologia', 'sistema', 'gestion', 'software'],
        observaciones: 'Proyecto crítico para modernización de procesos'
      }
    ];

    const proyectosCreados = await Proyecto.insertMany(proyectos);
    console.log(`✅ ${proyectosCreados.length} proyectos creados`);
  }

  private async showStatistics(): Promise<void> {
    console.log('\n📊 ESTADÍSTICAS DE LA BASE DE DATOS');
    console.log('='.repeat(40));
    
    const stats = await db.getDatabaseStats();
    console.log(`📂 Base de datos: ${stats.databaseName}`);
    console.log(`📁 Colecciones: ${stats.collections}`);
    console.log(`📄 Documentos totales: ${stats.objects}`);
    console.log(`💾 Tamaño de datos: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🗃️  Tamaño de almacenamiento: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🏷️  Tamaño de índices: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Contar documentos por colección
    const usuariosCount = await Usuario.countDocuments();
    const proyectosCount = await Proyecto.countDocuments();
    
    console.log(`\n📋 Documentos por colección:`);
    console.log(`   👥 Usuarios: ${usuariosCount}`);
    console.log(`   🏗️  Proyectos: ${proyectosCount}`);
  }
}

// Función principal
async function main(): Promise<void> {
  const initializer = new DataInitializer();
  
  try {
    await initializer.initialize();
  } catch (error) {
    console.error('❌ Error en la inicialización:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await db.disconnect();
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { DataInitializer };