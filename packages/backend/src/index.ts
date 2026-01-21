import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { initDatabase, closeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import saveRoutes from './routes/saves.js';
import adminRoutes from './routes/admin.js';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/debug', (_req, res) => {
  res.json({ 
    message: 'Backend is running', 
    timestamp: new Date().toISOString(),
    frontendPath: config.upload.frontendPath,
    frontendExists: fs.existsSync(config.upload.frontendPath)
  });
});

app.use('/Games', express.static(config.upload.gamesPath));
app.use('/images', express.static(config.upload.imagesPath));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/saves', saveRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `API Route not found: ${req.method} ${req.originalUrl}` 
  });
});

if (fs.existsSync(config.upload.frontendPath)) {
  app.use(express.static(config.upload.frontendPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/Games') || req.path.startsWith('/images')) {
      return next();
    }
    res.sendFile(path.join(config.upload.frontendPath, 'index.html'));
  });
}

const ensureDirectories = () => {
  const dirs = [
    config.upload.gamesPath,
    config.upload.imagesPath,
    config.upload.uploadsPath,
    path.dirname(config.database.path),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

const startServer = async () => {
  try {
    ensureDirectories();

    await initDatabase();
    console.log('SQLite database connected successfully');
    console.log(`Database path: ${config.database.path}`);

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down...');
      closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
