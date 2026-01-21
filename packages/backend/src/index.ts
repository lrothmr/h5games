import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { initDatabase, closeDatabase } from './config/database.js';
import routes from './routes/index.js';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/debug', (_req, res) => {
  res.json({ 
    message: 'Backend is running', 
    timestamp: new Date().toISOString(),
    databasePath: config.database.path
  });
});

// 防止下载工具拦截：拦截游戏资源包请求并设置响应头
app.use('/Games', (req, res, next) => {
  if (req.url.endsWith('game.core')) {
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Type', 'application/octet-stream');
    // 增加特征标识，告诉前端这是 VFS 请求
    res.setHeader('X-VFS-Response', 'true');
  }
  next();
});

app.use('/Games', express.static(config.upload.gamesPath));
app.use('/images', express.static(config.upload.imagesPath));

app.use('/api', routes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `API Route not found: ${req.method} ${req.originalUrl}` 
  });
});

const ensureDirectories = () => {
  const dirs = [
    config.upload.gamesPath,
    config.upload.imagesPath,
    config.upload.uploadsPath,
    path.join(config.upload.uploadsPath, 'temp'),
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
