import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    isAdmin?: boolean;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: number;
      username: string;
      isAdmin?: boolean;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
  }
};

export const adminAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: number;
      username: string;
      isAdmin?: boolean;
    };

    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
  }
};
