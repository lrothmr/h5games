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
      SELECT game_id, name, url, image, pinned, open, clicks, likes, created_at, category 
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
      category: row[9] || '其他',
    })) : [];

    return res.json({ success: true, message: '获取成功', data: games });
  } catch (error) {
    console.error('Get games error:', error);
    try {
      const db = getDatabase();
      const result = db.exec("SELECT game_id, name, url FROM games");
      const games = result.length > 0 ? result[0].values.map((row: any[]) => ({
        id: row[0], name: row[1], url: row[2], category: '其他'
      })) : [];
      return res.json({ success: true, message: '获取成功(兼容模式)', data: games });
    } catch (innerError) {
      return res.status(500).json({ success: false, message: '数据库查询失败' });
    }
  }
};

export const getGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT game_id, name, url, image, pinned, open, clicks, likes, created_at, category 
      FROM games WHERE game_id = ?
    `);
    stmt.bind([id]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: '游戏不存在' });
    }

    const row = stmt.get();
    stmt.free();

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
      category: row[9] || '其他',
    };

    return res.json({ success: true, message: '获取成功', data: game });
  } catch (error) {
    console.error('Get game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const createGame = async (req: Request, res: Response) => {
  try {
    const { name, url, image, pinned, open, category } = req.body;
    const finalName = (name && name.trim()) ? name : '未命名游戏';

    const db = getDatabase();
    const gameId = `H${String(Date.now()).slice(-6)}`;

    db.run(`
      INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices, category) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [gameId, finalName, url || `/Games/${gameId}`, image || null, pinned ? 1 : 0, open !== false ? 1 : 0, '[]', category || '其他']);
    saveDatabase();

    return res.json({
      success: true,
      message: '创建成功',
      data: { id: gameId, name: finalName, url: url || `/Games/${gameId}`, image, pinned: Boolean(pinned), open: open !== false },
    });
  } catch (error) {
    console.error('Create game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const updateGame = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, image, pinned, open, category } = req.body;

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
    if (category !== undefined) { updates.push(`category = ?`); params.push(category); }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 1) {
      params.push(id);
      db.run(`UPDATE games SET ${updates.join(', ')} WHERE game_id = ?`, params);
      saveDatabase();
    }

    return res.json({ success: true, message: '更新成功', data: { id, name, url, image, pinned, open, category } });
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

    const { name, pinned, open, category } = req.body;
    const gameId = req.body.gameId || `H${String(Date.now()).slice(-6)}`;
    const zipPath = req.file.path;

    const result = await extractGameZip(zipPath, gameId);

    if (!result.success) {
      console.error('Extraction failed:', result.error);
      return res.status(400).json({ success: false, message: result.error || '解压失败' });
    }

    let finalName = '未命名游戏';
    if (name && name.trim()) {
      finalName = name.trim();
    } else if (result.title) {
      finalName = result.title;
    } else {
      finalName = req.file.originalname.replace(/\.zip$/i, '');
    }

    const db = getDatabase();
    const checkStmt = db.prepare("SELECT id FROM games WHERE game_id = ?");
    checkStmt.bind([gameId]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      db.run(`
        UPDATE games SET name = ?, url = ?, image = ?, pinned = ?, open = ?, category = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE game_id = ?
      `, [finalName, result.gameDir, result.imagePath || null, (pinned === 'true' || pinned === true) ? 1 : 0, (open !== 'false' && open !== false) ? 1 : 0, category || '其他', gameId]);
    } else {
      db.run(`
        INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices, category) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [gameId, finalName, result.gameDir, result.imagePath || null, (pinned === 'true' || pinned === true) ? 1 : 0, (open !== 'false' && open !== false) ? 1 : 0, '[]', category || '其他']);
    }
    saveDatabase();

    return res.json({
      success: true,
      message: '上传成功',
      data: { id: gameId, name: finalName, url: result.gameDir, image: result.imagePath },
    });
  } catch (error) {
    console.error('Upload game error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadGameChunk = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传文件分片' });
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    const tempDir = path.join(config.upload.uploadsPath, 'temp', uploadId);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const chunkPath = path.join(tempDir, `${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);
    return res.json({ success: true, message: '分片上传成功' });
  } catch (error) {
    console.error('Upload chunk error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : '服务器内部错误' });
  }
};

export const mergeGameChunks = async (req: Request, res: Response) => {
  try {
    const { uploadId, fileName, totalChunks, name, pinned, open, category } = req.body;
    if (!uploadId || !fileName || !totalChunks) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    const tempDir = path.join(config.upload.uploadsPath, 'temp', uploadId);
    const zipPath = path.join(config.upload.uploadsPath, `${uploadId}-${fileName}`);
    const writeStream = fs.createWriteStream(zipPath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${i}`);
      if (!fs.existsSync(chunkPath)) return res.status(400).json({ success: false, message: `缺少分片 ${i}` });
      writeStream.write(fs.readFileSync(chunkPath));
    }
    writeStream.end();
    await new Promise<void>((r) => writeStream.on('finish', () => r()));
    fs.rmSync(tempDir, { recursive: true });

    const gameId = req.body.gameId || `H${String(Date.now()).slice(-6)}`;
    const result = await extractGameZip(zipPath, gameId);
    if (!result.success) {
      console.error('Merge extraction failed:', result.error);
      return res.status(400).json({ success: false, message: result.error });
    }

    let finalName = (name && name.trim()) ? name : (result.title || fileName.replace(/\.zip$/i, ''));
    const db = getDatabase();
    const checkStmt = db.prepare("SELECT id FROM games WHERE game_id = ?");
    checkStmt.bind([gameId]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      db.run(`UPDATE games SET name=?, url=?, image=?, pinned=?, open=?, category=?, updated_at=CURRENT_TIMESTAMP WHERE game_id=?`, 
        [finalName, result.gameDir, result.imagePath || null, pinned ? 1 : 0, open !== false ? 1 : 0, category || '其他', gameId]);
    } else {
      db.run(`INSERT INTO games (game_id, name, url, image, pinned, open, liked_devices, category) VALUES (?,?,?,?,?,?,?,?)`, 
        [gameId, finalName, result.gameDir, result.imagePath || null, pinned ? 1 : 0, open !== false ? 1 : 0, '[]', category || '其他']);
    }
    saveDatabase();
    return res.json({ success: true, message: '合并成功', data: { id: gameId, name: finalName } });
  } catch (error) {
    console.error('Merge error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const uploadGameImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: '请上传图片' });
    const db = getDatabase();
    const ext = path.extname(req.file.originalname);
    const newFileName = `${id}${ext}`;
    const newPath = path.join(config.upload.imagesPath, newFileName);
    fs.renameSync(req.file.path, newPath);
    const imagePath = `/images/${newFileName}`;
    db.run(`UPDATE games SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE game_id = ?`, [imagePath, id]);
    saveDatabase();
    return res.json({ success: true, message: '上传成功', data: { image: imagePath } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const recordClick = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    const db = getDatabase();
    db.run(`INSERT INTO game_clicks (game_id, user_agent, ip_address) VALUES (?, ?, ?)`, [gameId, req.headers['user-agent'] || '', req.ip || '']);
    db.run(`UPDATE games SET clicks = clicks + 1 WHERE game_id = ?`, [gameId]);
    saveDatabase();
    return res.json({ success: true, message: '记录成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const recordLike = async (req: Request, res: Response) => {
  try {
    const { gameId, deviceId } = req.body;
    const db = getDatabase();
    const result = db.exec(`SELECT likes, liked_devices FROM games WHERE game_id = ?`, [gameId]);
    if (result.length === 0) return res.status(404).json({ success: false, message: '未找到' });
    const likedDevices = JSON.parse(result[0].values[0][1] as string || '[]');
    if (likedDevices.includes(deviceId)) return res.status(400).json({ success: false, message: '已点赞' });
    likedDevices.push(deviceId);
    db.run(`UPDATE games SET likes = likes + 1, liked_devices = ? WHERE game_id = ?`, [JSON.stringify(likedDevices), gameId]);
    saveDatabase();
    return res.json({ success: true, message: '点赞成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const getLikes = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;
    const db = getDatabase();
    const result = db.exec(`SELECT game_id, liked_devices FROM games`);
    const likedGames = result.length > 0 ? result[0].values.filter(row => JSON.parse(row[1] as string || '[]').includes(deviceId)).map(row => row[0]) : [];
    return res.json({ success: true, data: { likedGames } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};