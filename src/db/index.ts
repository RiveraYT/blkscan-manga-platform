import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!connectionString) {
    console.warn('⚠️ [DB Warning] DATABASE_URL no está configurada en .env.');
    throw new Error('DATABASE_URL no está configurada en el entorno.');
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    dbInstance = drizzle(pool, { schema });
    return dbInstance;
  } catch (error) {
    console.error('❌ Error al inicializar pool de PostgreSQL:', error);
    throw error;
  }
}

export const db = connectionString ? getDb() : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);
export { schema };
