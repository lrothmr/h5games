#!/bin/bash

echo "🚀 开始部署 MyGames V2..."

npm install
npm run build

mkdir -p data
mkdir -p public/Games
mkdir -p public/images
mkdir -p public/uploads

npm run db:migrate

if command -v pm2 >/dev/null 2>&1; then
    echo "🟢 使用 PM2 启动服务..."
    pm2 delete mygames 2>/dev/null || true
    pm2 start ecosystem.config.js
    echo "✅ 部署完成！服务已在后台运行。"
    echo "查看日志: pm2 logs mygames"
else
    echo "⚠️ 未检测到 PM2，将直接启动服务 (按 Ctrl+C 停止)..."
    npm start
fi
