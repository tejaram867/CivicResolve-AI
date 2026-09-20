import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fusionx',
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
};

// Singleton connection pool instance
export const pool = mysql.createPool(dbConfig);

/**
 * Executes a lightweight test query (SELECT 1).
 * Acquires a connection from the pool and guarantees release in a finally block.
 *
 * @returns {Promise<{success: boolean, result?: any, error?: string, code?: string}>}
 */
export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS health');
    return {
      success: true,
      result: rows[0],
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default pool;
