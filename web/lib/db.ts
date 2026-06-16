import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let postgresPool: Pool | null = null;
let sqliteDb: Database | null = null;

const dbUrl = process.env.DATABASE_URL;

export async function getDbConnection() {
  if (dbUrl) {
    if (!postgresPool) {
      postgresPool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });
      // Initialize tables for Postgres
      const client = await postgresPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            telegram_chat_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS portfolio (
            id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            symbol VARCHAR(20) NOT NULL,
            yf_symbol VARCHAR(20) NOT NULL,
            company_name VARCHAR(100),
            quantity DOUBLE PRECISION NOT NULL,
            buy_price DOUBLE PRECISION NOT NULL,
            exchange VARCHAR(10) NOT NULL,
            sector VARCHAR(50),
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
      } catch (err) {
        console.error('Failed to initialize Postgres tables:', err);
      } finally {
        client.release();
      }
    }
    return { conn: postgresPool, type: 'postgres' as const };
  } else {
    if (!sqliteDb) {
      const dbPath = path.resolve(process.cwd(), '../data/stock_analyzer.db');
      sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      // Enable foreign keys
      await sqliteDb.run('PRAGMA foreign_keys = ON;');
      // Initialize tables for SQLite
      await sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          telegram_chat_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS portfolio (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          yf_symbol TEXT NOT NULL,
          company_name TEXT,
          quantity REAL NOT NULL,
          buy_price REAL NOT NULL,
          exchange TEXT NOT NULL,
          sector TEXT,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
    return { conn: sqliteDb, type: 'sqlite' as const };
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { conn, type } = await getDbConnection();

  if (type === 'postgres') {
    const res = await (conn as Pool).query(sql, params);
    return res.rows;
  } else {
    // Replace %s with ? for SQLite
    const sqliteSql = sql.replace(/%s/g, '?');
    const db = conn as Database;
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await db.all<T[]>(sqliteSql, params);
    } else {
      const res = await db.run(sqliteSql, params);
      // Return something matching row format if possible or empty array
      return [] as any;
    }
  }
}
