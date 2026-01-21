import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    path: process.env.DB_PATH || path.resolve(__dirname, '../../../data/mygames.db'),
  },
  
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    mfaSecret: process.env.ADMIN_MFA_SECRET || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '104857600', 10),
    publicPath: path.resolve(__dirname, '../../..', process.env.PUBLIC_PATH || '../public'),
    gamesPath: path.resolve(__dirname, '../../..', process.env.PUBLIC_PATH || '../public', 'Games'),
    imagesPath: path.resolve(__dirname, '../../..', process.env.PUBLIC_PATH || '../public', 'images'),
    uploadsPath: path.resolve(__dirname, '../../..', process.env.PUBLIC_PATH || '../public', 'uploads'),
  },
};

export default config;
