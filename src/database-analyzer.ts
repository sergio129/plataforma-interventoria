import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseAnalyzer {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Conectado exitosamente a MongoDB');
      this.db = this.client.db('AseoriaJuridica');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async analyzeDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no conectada');
    }

    try {
      // Listar todas las colecciones
      console.log('\n📋 ANÁLISIS DE LA BASE DE DATOS "AseoriaJuridica"');
      console.log('='.repeat(50));

      const collections = await this.db.listCollections().toArray();
      console.log(`\n📁 Colecciones encontradas (${collections.length}):`);
      collections.forEach((col, index) => {
        console.log(`${index + 1}. ${col.name}`);
      });

      // Analizar cada colección
      for (const collectionInfo of collections) {
        await this.analyzeCollection(collectionInfo.name);
      }

    } catch (error) {
      console.error('❌ Error analizando la base de datos:', error);
    }
  }

  async analyzeCollection(collectionName: string): Promise<void> {
    if (!this.db) return;

    try {
      const collection: Collection = this.db.collection(collectionName);
      
      console.log(`\n🔍 ANÁLISIS DE COLECCIÓN: "${collectionName}"`);
      console.log('-'.repeat(40));

      // Contar documentos
      const count = await collection.countDocuments();
      console.log(`📊 Total de documentos: ${count}`);

      if (count === 0) {
        console.log('⚠️  Colección vacía');
        return;
      }

      // Obtener algunos documentos de muestra
      const sampleDocs = await collection.find({}).limit(3).toArray();
      
      console.log('\n📄 Estructura de documentos (muestra):');
      sampleDocs.forEach((doc, index) => {
        console.log(`\nDocumento ${index + 1}:`);
        this.printDocumentStructure(doc, 1);
      });

      // Obtener índices
      const indexes = await collection.indexes();
      console.log(`\n🏷️  Índices (${indexes.length}):`);
      indexes.forEach((index, i) => {
        console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      });

    } catch (error) {
      console.error(`❌ Error analizando colección "${collectionName}":`, error);
    }
  }

  private printDocumentStructure(obj: any, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      
      if (type === 'object' && value !== null) {
        console.log(`${indent}${key}: {object}`);
        if (depth < 2) { // Limitar profundidad para evitar salida muy larga
          this.printDocumentStructure(value, depth + 1);
        }
      } else if (type === 'array') {
        console.log(`${indent}${key}: [array] (${value.length} elementos)`);
        if (value.length > 0 && depth < 2) {
          console.log(`${indent}  Tipo de elementos: ${typeof value[0]}`);
          if (typeof value[0] === 'object') {
            this.printDocumentStructure(value[0], depth + 2);
          }
        }
      } else {
        const displayValue = type === 'string' ? `"${value}"` : value;
        console.log(`${indent}${key}: (${type}) ${displayValue}`);
      }
    });
  }

  async getCollectionStats(): Promise<void> {
    if (!this.db) return;

    try {
      const collections = await this.db.listCollections().toArray();
      
      console.log('\n📈 ESTADÍSTICAS RESUMIDAS');
      console.log('='.repeat(30));

      for (const collectionInfo of collections) {
        const collection = this.db.collection(collectionInfo.name);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          // Obtener un documento para ver los campos principales
          const sampleDoc = await collection.findOne({});
          const fields = sampleDoc ? Object.keys(sampleDoc).join(', ') : 'N/A';
          
          console.log(`\n📋 ${collectionInfo.name}:`);
          console.log(`   - Documentos: ${count}`);
          console.log(`   - Campos principales: ${fields}`);
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
    }
  }

  async close(): Promise<void> {
    await this.client.close();
    console.log('\n🔐 Conexión cerrada');
  }
}

// Función principal para ejecutar el análisis
async function main() {
  const analyzer = new DatabaseAnalyzer();
  
  try {
    await analyzer.connect();
    await analyzer.analyzeDatabase();
    await analyzer.getCollectionStats();
  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  } finally {
    await analyzer.close();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseAnalyzer };