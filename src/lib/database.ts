import mongoose from 'mongoose';

// Configuración de la conexión a MongoDB basada en src/config/database.ts
export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      console.log('📊 Ya existe una conexión activa a MongoDB');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plataforma-interventoria';

      // Configuración de opciones de conexión
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true
      };

      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      console.log('✅ Conectado exitosamente a MongoDB');
      console.log(`📂 Base de datos: ${mongoose.connection.db?.databaseName}`);
      
      // Configurar eventos de conexión
      this.setupConnectionEvents();
      
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔐 Desconectado de MongoDB');
    } catch (error) {
      console.error('❌ Error desconectando de MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private setupConnectionEvents(): void {
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Error de conexión MongoDB:', error);
    });
  }

  // Método para crear índices de todos los modelos
  public async createIndexes(): Promise<void> {
    try {
      console.log('🏗️  Creando índices de base de datos...');
      
      const collections = await mongoose.connection.db?.listCollections().toArray();
      if (collections) {
        for (const collection of collections) {
          try {
            const model = mongoose.models[collection.name];
            if (model) {
              await model.createIndexes();
              console.log(`✅ Índices creados para ${collection.name}`);
            }
          } catch (error) {
            console.log(`ℹ️ Colección ${collection.name} sin modelo asociado`);
          }
        }
      }
      
      console.log('🎯 Todos los índices han sido creados exitosamente');
    } catch (error) {
      console.error('❌ Error creando índices:', error);
      throw error;
    }
  }

  // Método para obtener estadísticas de la base de datos
  public async getDatabaseStats(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('No hay conexión a la base de datos');
      }

      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      return {
        databaseName: db.databaseName,
        collections: collections.length,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Método para limpiar la base de datos (solo desarrollo)
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar la base de datos en producción');
    }

    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('No hay conexión a la base de datos');
      }

      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
      }

      console.log('✅ Base de datos limpiada');
    } catch (error) {
      console.error('❌ Error limpiando la base de datos:', error);
      throw error;
    }
  }
}

// Instancia singleton del manejador de base de datos
export const db = DatabaseConfig.getInstance();

/**
 * Función helper para conectar a la base de datos
 * Utilizada en API routes de Next.js
 */
export async function connectToDatabase(): Promise<void> {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  await db.connect();
}

/**
 * Middleware para Next.js API routes
 */
export function withDatabase(handler: any) {
  return async (req: any, res: any) => {
    try {
      await connectToDatabase();
      return await handler(req, res);
    } catch (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error de conexión a la base de datos' 
      });
    }
  };
}

export default db;