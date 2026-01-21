import { Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getInviteCodes = async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT i.id, i.code, i.is_used, i.created_at, i.used_at, u.username as used_by
      FROM invite_codes i
      LEFT JOIN users u ON i.used_by_user_id = u.id
      ORDER BY i.created_at DESC
    `);

    const codes = result.length > 0 ? result[0].values.map((row: any[]) => ({
      id: row[0],
      code: row[1],
      isUsed: Boolean(row[2]),
      createdAt: row[3],
      usedAt: row[4],
      usedBy: row[5],
    })) : [];

    return res.json({ success: true, message: '获取成功', data: codes });
  } catch (error) {
    console.error('Get invite codes error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
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

    const users = result.length > 0 ? result[0].values.map((row: any[]) => ({
      id: row[0],
      username: row[1],
      email: row[2],
      autoSave: Boolean(row[3]),
      createdAt: row[4],
    })) : [];

    return res.json({ success: true, message: '获取成功', data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
