import { Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export const getInviteCodes = async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT i.id, i.code, i.is_used, i.created_at, i.used_at, u.username as used_by
      FROM invite_codes i
      LEFT JOIN users u ON i.used_by_user_id = u.id
      ORDER BY i.created_at DESC
    `);

    let codes = [];
    if (result && result.length > 0 && result[0].values) {
      codes = result[0].values.map((row: any[]) => ({
        id: row[0],
        code: row[1],
        isUsed: Boolean(row[2]),
        createdAt: row[3],
        usedAt: row[4],
        usedBy: row[5],
      }));
    }

    return res.json({ success: true, message: '获取成功', data: codes });
  } catch (error) {
    console.error('Get invite codes error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? `获取邀请码失败: ${error.message}` : '服务器内部错误' });
  }
};

export const generateInviteCode = async (req: Request, res: Response) => {
  try {
    const { count = 1 } = req.body;
    const db = getDatabase();
    const codes = [];

    const stmt = db.prepare("INSERT INTO invite_codes (code) VALUES (?)");
    
    for (let i = 0; i < count; i++) {
      const code = uuidv4().substring(0, 8).toUpperCase();
      stmt.run([code]);
      codes.push(code);
    }
    stmt.free();
    
    saveDatabase();

    return res.json({ success: true, message: '生成成功', data: codes });
  } catch (error) {
    console.error('Generate invite code error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const deleteInviteCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    db.run(`DELETE FROM invite_codes WHERE id = ?`, [id]);
    saveDatabase();

    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete invite code error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, username, email, auto_save, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    let users = [];
    if (result && result.length > 0 && result[0].values) {
      users = result[0].values.map((row: any[]) => ({
        id: row[0],
        username: row[1],
        email: row[2],
        autoSave: Boolean(row[3]),
        createdAt: row[4],
      }));
    }

    return res.json({ success: true, message: '获取成功', data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? `数据库错误: ${error.message}` : '服务器内部错误' 
    });
  }
};

export const getMfaStatus = async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.exec("SELECT value FROM system_settings WHERE key = 'admin_mfa_enabled'");
    const enabled = result.length > 0 && result[0].values[0][0] === '1';
    return res.json({ success: true, enabled });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取 MFA 状态失败' });
  }
};

export const listFiles = async (req: Request, res: Response) => {
  try {
    const { gameId, folder = '' } = req.query;
    if (!gameId) return res.status(400).json({ success: false, message: '缺少 gameId' });

    const baseDir = path.join(config.upload.gamesPath, gameId as string, folder as string);
    if (!fs.existsSync(baseDir)) return res.status(404).json({ success: false, message: '目录不存在' });

    const items = fs.readdirSync(baseDir).map(name => {
      const fullPath = path.join(baseDir, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        path: path.join(folder as string, name).replace(/\\/g, '/'),
        isDir: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime
      };
    });

    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取文件列表失败' });
  }
};

export const readFileContent = async (req: Request, res: Response) => {
  try {
    const { gameId, filePath } = req.query;
    if (!gameId || !filePath) return res.status(400).json({ success: false, message: '参数不完整' });

    const fullPath = path.join(config.upload.gamesPath, gameId as string, filePath as string);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, message: '文件不存在' });

    const content = fs.readFileSync(fullPath, 'utf-8');
    return res.json({ success: true, data: content });
  } catch (error) {
    return res.status(500).json({ success: false, message: '读取文件失败' });
  }
};

export const saveFileContent = async (req: Request, res: Response) => {
  try {
    const { gameId, filePath, content } = req.body;
    if (!gameId || !filePath) return res.status(400).json({ success: false, message: '参数不完整' });

    const fullPath = path.join(config.upload.gamesPath, gameId as string, filePath as string);
    
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve(config.upload.gamesPath))) {
      return res.status(403).json({ success: false, message: '非法路径访问' });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    return res.json({ success: true, message: '保存成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '保存文件失败' });
  }
};