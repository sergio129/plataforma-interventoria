import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a MongoDB
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
    if (this.isConnected) {
      console.log('📊 Ya existe una conexión activa a MongoDB');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI no está definida en las variables de entorno');
      }

      // Configuración de opciones de conexión
      const options = {
        // Configuraciones de pool de conexiones
        maxPoolSize: 10, // Mantener hasta 10 conexiones de socket
        serverSelectionTimeoutMS: 5000, // Mantener intentando enviar operaciones por 5 segundos
        socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
        
        // Configuraciones de reintentos
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

  public getConnection(): typeof mongoose.connection {
    return mongoose.connection;
  }

  private setupConnectionEvents(): void {
    // Evento cuando se pierde la conexión
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
      this.isConnected = false;
    });

    // Evento cuando se reconecta
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
      this.isConnected = true;
    });

    // Evento de error
    mongoose.connection.on('error', (error) => {
      console.error('❌ Error de conexión MongoDB:', error);
    });

    // Evento cuando la aplicación está cerrando
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  // Método para crear índices de todos los modelos
  public async createIndexes(): Promise<void> {
    try {
      console.log('🏗️  Creando índices de base de datos...');
      
      // Los índices se crean automáticamente cuando se registran los modelos
      // Pero podemos forzar la creación para asegurar que estén actualizados
      
      const collections = await mongoose.connection.db?.listCollections().toArray();
      if (collections) {
        for (const collection of collections) {
          const model = mongoose.models[collection.name];
          if (model) {
            await model.createIndexes();
            console.log(`✅ Índices creados para ${collection.name}`);
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
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        collectionsInfo: collections.map(col => col.name)
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Método para limpiar la base de datos (solo para desarrollo/testing)
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar la base de datos en producción');
    }

    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      if (collections) {
        for (const collection of collections) {
          await mongoose.connection.db?.collection(collection.name).deleteMany({});
          console.log(`🗑️  Colección ${collection.name} limpiada`);
        }
      }
      console.log('✅ Base de datos limpiada exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando la base de datos:', error);
      throw error;
    }
  }
}

// Función de conveniencia para obtener la instancia
export const db = DatabaseConfig.getInstance();

// Función para conectar (puede ser utilizada en otros archivos)
export const connectToDatabase = async (): Promise<void> => {
  await db.connect();
};

// Función para desconectar
export const disconnectFromDatabase = async (): Promise<void> => {
  await db.disconnect();
};

export default DatabaseConfig;