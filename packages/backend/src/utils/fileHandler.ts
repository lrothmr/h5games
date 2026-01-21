import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

export interface ExtractResult {
  success: boolean;
  gameDir: string;
  imagePath?: string;
  error?: string;
  title?: string;
}

export const extractGameZip = async (
  zipPath: string,
  gameId: string
): Promise<ExtractResult> => {
  const gameDir = path.join(config.upload.gamesPath, gameId);

  try {
    if (fs.existsSync(gameDir)) {
      fs.rmSync(gameDir, { recursive: true });
    }
    fs.mkdirSync(gameDir, { recursive: true });

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    if (entries.length === 0) {
      return {
        success: false,
        gameDir: '',
        error: '压缩包为空或无法读取内容',
      };
    }

    let rootFolder = '';
    const firstEntry = entries[0];
    if (firstEntry && firstEntry.isDirectory) {
      rootFolder = firstEntry.entryName;
    } else if (firstEntry) {
      const parts = firstEntry.entryName.split('/');
      if (parts.length > 1) {
        rootFolder = parts[0] + '/';
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      let targetPath = entry.entryName;
      if (rootFolder && targetPath.startsWith(rootFolder)) {
        targetPath = targetPath.substring(rootFolder.length);
      }

      if (!targetPath) continue;

      const fullPath = path.join(gameDir, targetPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, entry.getData());
    }

    // --- 新增：从 index.html 提取标题 ---
    let extractedName: string | undefined;
    const indexPath = path.join(gameDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        extractedName = titleMatch[1].trim();
      }
    }

    const assetsDir = path.join(gameDir, 'assets');
    const internalDir = path.join(gameDir, 'internal');

    if (!fs.existsSync(assetsDir) && fs.existsSync(internalDir)) {
      fs.mkdirSync(assetsDir);
      const files = fs.readdirSync(gameDir);
      for (const file of files) {
        const fullPath = path.join(gameDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && file !== 'src' && file !== 'assets') {
           const destPath = path.join(assetsDir, file);
           fs.renameSync(fullPath, destPath);
        }
      }
    }

    let imagePath: string | undefined;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const possibleImageNames = ['cover', 'thumbnail', 'icon', 'splash', 'preview'];

    const findImage = (dir: string): string | undefined => {
      if (!fs.existsSync(dir)) return undefined;

      const files = fs.readdirSync(dir);

      for (const name of possibleImageNames) {
        for (const ext of imageExtensions) {
          const found = files.find(
            (f) => f.toLowerCase() === `${name}${ext}`
          );
          if (found) {
            return path.join(dir, found);
          }
        }
      }

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
          return path.join(dir, file);
        }
      }

      return undefined;
    };

    const foundImage = findImage(gameDir);
    if (foundImage) {
      const ext = path.extname(foundImage);
      const destImagePath = path.join(config.upload.imagesPath, `${gameId}${ext}`);
      fs.copyFileSync(foundImage, destImagePath);
      imagePath = `/images/${gameId}${ext}`;
    }

    // --- 新增：生成带偏移量的索引包 ---
    const files = [];
    let currentOffset = 0;
    const pkgPath = path.join(gameDir, 'game.core');
    const pkgStream = fs.createWriteStream(pkgPath);

    const generatePackage = (dir: string, baseDir: string) => {
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          generatePackage(fullPath, baseDir);
        } else {
          if (file !== 'manifest.json' && file !== 'game.core' && file !== 'game.pkg' && file !== 'game.dat') {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            const data = fs.readFileSync(fullPath);
            const size = data.length;
            
            files.push({
              p: relativePath,  // path
              o: currentOffset, // offset
              s: size           // size
            });
            
            pkgStream.write(data);
            currentOffset += size;
          }
        }
      }
    };

    generatePackage(gameDir, gameDir);
    pkgStream.end();

    // 写入清单文件
    fs.writeFileSync(
      path.join(gameDir, 'manifest.json'),
      JSON.stringify({ 
        gameId, 
        files, 
        v: Date.now() 
      })
    );

    fs.unlinkSync(zipPath);
    // 移除之前的 game.dat 逻辑，改用 pkg

    return {
      success: true,
      gameDir: `/Games/${gameId}`,
      imagePath,
      title: extractedName,
    };
  } catch (error) {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    return {
      success: false,
      gameDir: '',
      error: error instanceof Error ? error.message : '解压失败',
    };
  }
};

export const deleteGameFiles = (gameId: string): boolean => {
  try {
    const gameDir = path.join(config.upload.gamesPath, gameId);
    if (fs.existsSync(gameDir)) {
      fs.rmSync(gameDir, { recursive: true });
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of imageExtensions) {
      const imagePath = path.join(config.upload.imagesPath, `${gameId}${ext}`);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    return true;
  } catch {
    return false;
  }
};
