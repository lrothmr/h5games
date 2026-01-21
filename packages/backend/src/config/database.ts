import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from './index.js';

let db: Database | null = null;

export const initDatabase = async (): Promise<Database> => {
  if (db) return db;

  const SQL = await initSqlJs();
  
  const dbDir = path.dirname(config.database.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(config.database.path)) {
    const buffer = fs.readFileSync(config.database.path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      auto_save INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      url VARCHAR(500) NOT NULL,
      image VARCHAR(500),
      pinned INTEGER DEFAULT 0,
      open INTEGER DEFAULT 1,
      clicks INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      liked_devices TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      category VARCHAR(50) DEFAULT '其他'
    )
  `);

  // 确保旧数据库也有 category 和 liked_devices 字段
  const tableInfo = db.exec("PRAGMA table_info(games)");
  const columns = tableInfo[0].values.map(v => v[1]);
  if (!columns.includes('category')) {
    try {
      db.run("ALTER TABLE games ADD COLUMN category VARCHAR(50) DEFAULT '其他'");
      console.log('Successfully added category column to games table');
    } catch (e) {
      console.error('Failed to add category column:', e);
    }
  }

  if (!columns.includes('liked_devices')) {
    try {
      db.run("ALTER TABLE games ADD COLUMN liked_devices TEXT DEFAULT '[]'");
      console.log('Successfully added liked_devices column to games table');
    } catch (e) {
      console.error('Failed to add liked_devices column:', e);
    }
  }



  db.run(`
    CREATE TABLE IF NOT EXISTS user_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id VARCHAR(50) NOT NULL,
      save_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id VARCHAR(50) NOT NULL,
      user_agent VARCHAR(500),
      ip_address VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) UNIQUE NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      FOREIGN KEY (used_by_user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert some initial invite codes if table is empty
  const result = db.exec("SELECT COUNT(*) FROM invite_codes");
  if (result[0].values[0][0] === 0) {
    const initialCodes = ['WELCOME2024', 'GAMESTART', 'PLAYNOW', 'VIPUSER'];
    const stmt = db.prepare("INSERT INTO invite_codes (code) VALUES (?)");
    initialCodes.forEach(code => stmt.run([code]));
    stmt.free();
  }

  const adminCheck = db.exec("SELECT COUNT(*) FROM system_settings WHERE key = 'admin_password'");
  if (adminCheck[0].values[0][0] === 0) {
    db.run("INSERT INTO system_settings (key, value) VALUES (?, ?)", ['admin_password', config.admin.password]);
    db.run("INSERT INTO system_settings (key, value) VALUES (?, ?)", ['admin_password_changed', '0']);
  }

  saveDatabase();

  return db;
};

export const getDatabase = (): Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

export const saveDatabase = (): void => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  }
};

export const closeDatabase = (): void => {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
};
