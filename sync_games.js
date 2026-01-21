const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// --- 配置区域 ---
const SOURCE_GAMES_DIR = 'D:\\摸鱼游戏平台(藏宝湾特供)\\游戏文件\\新建文件夹';
const SOURCE_IMAGES_DIR = 'D:\\123\\images';
const OUTPUT_DIR = path.join(process.cwd(), 'ready_to_upload');

async function main() {
    console.log('🔍 正在启动游戏架构识别与打包系统 (增强图片模糊匹配)...');
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(SOURCE_GAMES_DIR)) {
        console.error(`❌ 源文件夹不存在: ${SOURCE_GAMES_DIR}`);
        return;
    }

    // 预先读取所有封面图片列表
    let allImages = [];
    if (fs.existsSync(SOURCE_IMAGES_DIR)) {
        allImages = fs.readdirSync(SOURCE_IMAGES_DIR).filter(f => 
            ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase())
        );
    } else {
        console.warn(`⚠️ 封面图目录不存在: ${SOURCE_IMAGES_DIR}`);
    }

    const folders = fs.readdirSync(SOURCE_GAMES_DIR);
    console.log(`发现 ${folders.length} 个文件夹。`);

    for (const folder of folders) {
        const folderPath = path.join(SOURCE_GAMES_DIR, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        // 识别架构
        const analysis = analyzeStructure(folderPath);
        
        if (!analysis.isValid) {
            console.warn(`⚠️ 跳过 ${folder}: 未找到 index.html 或结构无效`);
            continue;
        }

        console.log(`📦 正在处理: ${folder} (架构: ${analysis.type})`);

        // 创建压缩包
        const zip = new AdmZip();
        
        // 将识别到的游戏根目录内容加入 ZIP
        zip.addLocalFolder(analysis.actualRoot);

        // --- 模糊匹配封面图 ---
        let coverImgPath = null;
        let matchedImgName = '';

        const folderLower = folder.toLowerCase();
        // 查找规则：图片名包含文件夹名，或者文件夹名包含图片名
        const found = allImages.find(img => {
            const imgBase = path.parse(img).name.toLowerCase();
            return imgBase.length > 1 && (imgBase.includes(folderLower) || folderLower.includes(imgBase));
        });

        if (found) {
            coverImgPath = path.join(SOURCE_IMAGES_DIR, found);
            matchedImgName = found;
        }

        if (coverImgPath) {
            zip.addLocalFile(coverImgPath, '', 'cover.jpg');
            console.log(`   🖼️  模糊匹配成功: [${matchedImgName}] -> cover.jpg`);
        } else {
            console.log(`   ℹ️  未找到匹配封面`);
        }

        // 输出 ZIP
        const zipName = `${folder}.zip`;
        const outputPath = path.join(OUTPUT_DIR, zipName);
        try {
            zip.writeZip(outputPath);
            console.log(`   ✅ 打包完成: ${zipName}`);
        } catch (err) {
            console.error(`   ❌ 打包失败 ${folder}: ${err.message}`);
        }
    }

    console.log('\n✨ 所有操作已完成！');
    console.log(`📂 请在以下目录查看打包好的文件: ${OUTPUT_DIR}`);
}

/**
 * 识别游戏目录架构
 */
function analyzeStructure(dir) {
    const search = (currentDir, depth = 0) => {
        if (depth > 3) return null;
        const files = fs.readdirSync(currentDir);
        
        if (files.includes('index.html')) {
            let type = 'Standard H5';
            if (files.includes('assets') && (files.includes('cocos-js') || files.includes('src'))) {
                type = 'Cocos Creator';
            } else if (files.includes('main.js') && files.includes('src')) {
                type = 'Cocos/Laya Generic';
            }
            return { root: currentDir, type };
        }

        for (const file of files) {
            const fullPath = path.join(currentDir, file);
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    const res = search(fullPath, depth + 1);
                    if (res) return res;
                }
            } catch (e) {}
        }
        return null;
    };

    const result = search(dir);
    if (!result) return { isValid: false };

    return {
        isValid: true,
        actualRoot: result.root,
        type: result.type
    };
}

main().catch(console.error);