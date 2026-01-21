import { Response } from 'express';
import { getDatabase, saveDatabase } from '../config/database.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getAutoSave = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT auto_save FROM users WHERE id = ${req.user.id}`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    return res.json({ success: true, message: '获取成功', data: { autoSave: Boolean(result[0].values[0][0]) } });
  } catch (error) {
    console.error('Get auto save error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const setAutoSave = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const { autoSave } = req.body;

    const db = getDatabase();
    db.run(`UPDATE users SET auto_save = ${autoSave ? 1 : 0}, updated_at = CURRENT_TIMESTAMP WHERE id = ${req.user.id}`);
    saveDatabase();

    return res.json({ success: true, message: '设置成功' });
  } catch (error) {
    console.error('Set auto save error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadSave = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const { gameId, saveData } = req.body;

    if (!gameId) {
      return res.status(400).json({ success: false, message: '游戏ID不能为空' });
    }

    if (saveData === undefined || saveData === null) {
      return res.status(400).json({ success: false, message: '存档数据不能为空' });
    }

    const db = getDatabase();
    const existing = db.exec(`SELECT id FROM user_saves WHERE user_id = ${req.user.id} AND game_id = '${gameId}'`);

    const saveDataStr = JSON.stringify(saveData);

    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`UPDATE user_saves SET save_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND game_id = ?`,
        [saveDataStr, req.user.id, gameId]);
    } else {
      db.run(`INSERT INTO user_saves (user_id, game_id, save_data) VALUES (?, ?, ?)`,
        [req.user.id, gameId, saveDataStr]);
    }
    saveDatabase();

    return res.json({ success: true, message: '存档上传成功' });
  } catch (error) {
    console.error('Upload save error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const downloadSave = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ success: false, message: '游戏ID不能为空' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT save_data FROM user_saves WHERE user_id = ${req.user.id} AND game_id = '${gameId}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '未找到存档数据' });
    }

    const saveDataStr = result[0].values[0][0] as string;
    const saveData = JSON.parse(saveDataStr);

    return res.json({ success: true, message: '获取成功', data: { saveData } });
  } catch (error) {
    console.error('Download save error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const getAllSaves = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT game_id, updated_at FROM user_saves WHERE user_id = ${req.user.id}`);

    const saves = result.length > 0 ? result[0].values.map((row: any[]) => ({
      gameId: row[0],
      updatedAt: row[1],
    })) : [];

    return res.json({ success: true, message: '获取成功', data: { saves } });
  } catch (error) {
    console.error('Get all saves error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
