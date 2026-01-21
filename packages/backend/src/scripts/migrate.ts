import { initDatabase, getDatabase, saveDatabase, closeDatabase } from '../config/database.js';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

const migrate = async () => {
  try {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    console.log('Connecting to SQLite database...');
    await initDatabase();
    console.log('Database connected successfully');

    const db = getDatabase();

    const gamesJsonPath = path.resolve(__dirname, '../../../../MyGames/games.json');
    
    if (fs.existsSync(gamesJsonPath)) {
      console.log('Found existing games.json, importing data...');
      const gamesData = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf-8'));
      
      for (const game of gamesData) {
        const existing = db.exec(`SELECT id FROM games WHERE game_id = ?`, [game.id]);
        
        if (existing.length === 0 || existing[0].values.length === 0) {
          db.run(
            `INSERT INTO games (game_id, name, url, image, pinned, open, clicks, likes, liked_devices) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              game.id,
              game.name,
              game.url,
              game.image || null,
              game.pinned ? 1 : 0,
              game.open !== false ? 1 : 0,
              game.clicks || 0,
              game.likes || 0,
              JSON.stringify([])
            ]
          );
          console.log(`Imported game: ${game.name}`);
        }
      }
      
      saveDatabase();
      console.log('Games import completed');
    }

    closeDatabase();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
