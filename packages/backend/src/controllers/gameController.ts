import { Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../config/database.js';
import { extractGameZip, deleteGameFiles } from '../utils/fileHandler.js';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

export const getGames = async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT game_id, name, url, image, pinned, open, clicks, likes, created_at 
      FROM games 
      ORDER BY pinned DESC, created_at DESC
    `);

    const games = result.length > 0 ? result[0].values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      url: row[2],
      image: row[3],
      pinned: Boolean(row[4]),
      open: Boolean(row[5]),
      clicks: row[6],
      likes: row[7],
      createdAt: row[8] ? String(row[8]).split('T')[0] : new Date().toISOString().split('T')[0],
    })) : [];

    return res.json({ success: true, message: '获取成功', data: games });
  } catch (error) {
    console.error('Get games error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const getGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const result = db.exec(`
      SELECT game_id, name, url, image, pinned, open, clicks, likes, created_at 
      FROM games WHERE game_id = ?
    `, [id]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    const row = result[0].values[0];
    const game = {
      id: row[0],
      name: row[1],
      url: row[2],
      image: row[3],
      pinned: Boolean(row[4]),
      open: Boolean(row[5]),
      clicks: row[6],
      likes: row[7],
      createdAt: row[8] ? String(row[8]).split('T')[0] : new Date().toISOString().split('T')[0],
    };

    return res.json({ success: true, message: '获取成功', data: game });
  } catch (error) {
    console.error('Get game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const createGame = async (req: Request, res: Response) => {
  try {
    const { name, url, image, pinned, open } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '游戏名称不能为空' });
    }

    const db = getDatabase();
    const gameId = `H${String(Date.now()).slice(-6)}`;

    db.run(`
      INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [gameId, name, url || `/Games/${gameId}`, image || null, pinned ? 1 : 0, open !== false ? 1 : 0, '[]']);
    saveDatabase();

    return res.json({
      success: true,
      message: '创建成功',
      data: { id: gameId, name, url: url || `/Games/${gameId}`, image, pinned: Boolean(pinned), open: open !== false },
    });
  } catch (error) {
    console.error('Create game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const updateGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, image, pinned, open } = req.body;

    const db = getDatabase();
    const result = db.exec(`SELECT id FROM games WHERE game_id = ?`, [id]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { updates.push(`name = ?`); params.push(name); }
    if (url !== undefined) { updates.push(`url = ?`); params.push(url); }
    if (image !== undefined) { updates.push(`image = ?`); params.push(image); }
    if (pinned !== undefined) { updates.push(`pinned = ?`); params.push(pinned ? 1 : 0); }
    if (open !== undefined) { updates.push(`open = ?`); params.push(open ? 1 : 0); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 1) {
      params.push(id);
      db.run(`UPDATE games SET ${updates.join(', ')} WHERE game_id = ?`, params);
      saveDatabase();
    }

    return res.json({ success: true, message: '更新成功', data: { id, name, url, image, pinned, open } });
  } catch (error) {
    console.error('Update game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const deleteGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const result = db.exec(`SELECT id FROM games WHERE game_id = ?`, [id]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    deleteGameFiles(id);
    db.run(`DELETE FROM games WHERE game_id = ?`, [id]);
    saveDatabase();

    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadGame = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传 ZIP 文件' });
    }

    const { name, pinned, open } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '游戏名称不能为空' });
    }

    const gameId = req.body.gameId || `H${String(Date.now()).slice(-6)}`;
    const zipPath = req.file.path;

    const result = await extractGameZip(zipPath, gameId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || '解压失败' });
    }

    const db = getDatabase();
    const existing = db.exec(`SELECT id FROM games WHERE game_id = '${gameId}'`);

    if (existing.length > 0 && existing[0].values.length > 0) {
      const updates = [
        `name = '${name}'`,
        `url = '${result.gameDir}'`,
        result.imagePath ? `image = '${result.imagePath}'` : null,
        pinned !== undefined ? `pinned = ${pinned === 'true' || pinned === true ? 1 : 0}` : null,
        open !== undefined ? `open = ${open !== 'false' && open !== false ? 1 : 0}` : null,
        `updated_at = CURRENT_TIMESTAMP`,
      ].filter(Boolean);

      db.run(`UPDATE games SET ${updates.join(', ')} WHERE game_id = '${gameId}'`);
    } else {
      db.run(`
        INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        gameId,
        name,
        result.gameDir,
        result.imagePath || null,
        pinned === 'true' || pinned === true ? 1 : 0,
        open !== 'false' && open !== false ? 1 : 0,
        '[]',
      ]);
    }
    saveDatabase();

    return res.json({
      success: true,
      message: '上传成功',
      data: {
        id: gameId,
        name,
        url: result.gameDir,
        image: result.imagePath,
        pinned: pinned === 'true' || pinned === true,
        open: open !== 'false' && open !== false,
      },
    });
  } catch (error) {
    console.error('Upload game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadGameChunk = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件分片' });
    }

    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      // Clean up the uploaded chunk since it's invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const tempDir = path.join(config.upload.uploadsPath, 'temp', uploadId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);

    return res.json({ success: true, message: '分片上传成功' });
  } catch (error) {
    console.error('Upload chunk error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const mergeGameChunks = async (req: Request, res: Response) => {
  try {
    const { uploadId, fileName, totalChunks, name, pinned, open } = req.body;

    if (!uploadId || !fileName || !totalChunks || !name) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const tempDir = path.join(config.upload.uploadsPath, 'temp', uploadId);
    const zipPath = path.join(config.upload.uploadsPath, `${uploadId}-${fileName}`);

    // Verify all chunks exist
    for (let i = 0; i < totalChunks; i++) {
      if (!fs.existsSync(path.join(tempDir, `${i}`))) {
        return res.status(400).json({ success: false, message: `缺少分片 ${i}` });
      }
    }

    // Merge chunks
    const writeStream = fs.createWriteStream(zipPath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${i}`);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    }
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Clean up temp chunks
    fs.rmSync(tempDir, { recursive: true });

    // Process the merged zip file
    const gameId = req.body.gameId || `H${String(Date.now()).slice(-6)}`;
    const result = await extractGameZip(zipPath, gameId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || '解压失败' });
    }

    const db = getDatabase();
    const existing = db.exec(`SELECT id FROM games WHERE game_id = '${gameId}'`);

    if (existing.length > 0 && existing[0].values.length > 0) {
      const updates = [
        `name = '${name}'`,
        `url = '${result.gameDir}'`,
        result.imagePath ? `image = '${result.imagePath}'` : null,
        pinned !== undefined ? `pinned = ${pinned === 'true' || pinned === true ? 1 : 0}` : null,
        open !== undefined ? `open = ${open !== 'false' && open !== false ? 1 : 0}` : null,
        `updated_at = CURRENT_TIMESTAMP`,
      ].filter(Boolean);

      db.run(`UPDATE games SET ${updates.join(', ')} WHERE game_id = '${gameId}'`);
    } else {
      db.run(`
        INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        gameId,
        name,
        result.gameDir,
        result.imagePath || null,
        pinned === 'true' || pinned === true ? 1 : 0,
        open !== 'false' && open !== false ? 1 : 0,
        '[]',
      ]);
    }
    saveDatabase();

    return res.json({
      success: true,
      message: '上传并合并成功',
      data: {
        id: gameId,
        name,
        url: result.gameDir,
        image: result.imagePath,
        pinned: pinned === 'true' || pinned === true,
        open: open !== 'false' && open !== false,
      },
    });

  } catch (error) {
    console.error('Merge chunks error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadGameImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传图片文件' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT id FROM games WHERE game_id = '${id}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    const ext = path.extname(req.file.originalname);
    const newFileName = `${id}${ext}`;
    const newPath = path.join(config.upload.imagesPath, newFileName);

    fs.renameSync(req.file.path, newPath);

    const imagePath = `/images/${newFileName}`;
    db.run(`UPDATE games SET image = '${imagePath}', updated_at = CURRENT_TIMESTAMP WHERE game_id = '${id}'`);
    saveDatabase();

    return res.json({ success: true, message: '图片上传成功', data: { image: imagePath } });
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const recordClick = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ success: false, message: '游戏ID不能为空' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT clicks FROM games WHERE game_id = '${gameId}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    db.run(`INSERT INTO game_clicks (game_id, user_agent, ip_address) VALUES (?, ?, ?)`,
      [gameId, req.headers['user-agent'] || '', req.ip || '']);

    const currentClicks = result[0].values[0][0] as number;
    db.run(`UPDATE games SET clicks = ${currentClicks + 1} WHERE game_id = '${gameId}'`);
    saveDatabase();

    return res.json({ success: true, message: '记录成功' });
  } catch (error) {
    console.error('Record click error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const recordLike = async (req: Request, res: Response) => {
  try {
    const { gameId, deviceId } = req.body;

    if (!gameId || !deviceId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT likes, liked_devices FROM games WHERE game_id = '${gameId}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    const currentLikes = result[0].values[0][0] as number;
    const likedDevicesStr = result[0].values[0][1] as string || '[]';
    const likedDevices: string[] = JSON.parse(likedDevicesStr);

    if (likedDevices.includes(deviceId)) {
      return res.status(400).json({ success: false, message: '已经点赞过此游戏' });
    }

    likedDevices.push(deviceId);
    db.run(`UPDATE games SET likes = ${currentLikes + 1}, liked_devices = '${JSON.stringify(likedDevices)}' WHERE game_id = '${gameId}'`);
    saveDatabase();

    return res.json({ success: true, message: '点赞成功', data: { likes: currentLikes + 1 } });
  } catch (error) {
    console.error('Record like error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const getLikes = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.json({ success: true, message: '获取成功', data: { likedGames: [] } });
    }

    const db = getDatabase();
    const result = db.exec(`SELECT game_id, liked_devices FROM games`);

    const likedGames: string[] = [];
    if (result.length > 0) {
      for (const row of result[0].values) {
        const gameId = row[0] as string;
        const likedDevicesStr = row[1] as string || '[]';
        const likedDevices: string[] = JSON.parse(likedDevicesStr);
        if (likedDevices.includes(deviceId as string)) {
          likedGames.push(gameId);
        }
      }
    }

    return res.json({ success: true, message: '获取成功', data: { likedGames } });
  } catch (error) {
    console.error('Get likes error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
