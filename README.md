# MyGames V2

游戏管理平台 - 使用 React + Node.js + SQLite 重构

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design 5
- React Router 6
- Axios
- Zustand (状态管理)

### 后端
- Node.js + Express
- TypeScript
- SQLite + TypeORM (better-sqlite3)
- JWT 认证
- Multer (文件上传)
- Adm-zip (ZIP 解压)

## 项目结构

```
MyGamesV2/
├── packages/
│   ├── backend/          # 后端服务
│   │   ├── src/
│   │   │   ├── config/   # 配置文件
│   │   │   ├── controllers/
│   │   │   ├── entities/ # 数据库实体
│   │   │   ├── middlewares/
│   │   │   ├── routes/
│   │   │   ├── scripts/  # 数据库迁移脚本
│   │   │   └── utils/
│   │   ├── data/         # SQLite 数据库文件
│   │   └── package.json
│   └── frontend/         # 前端应用
│       ├── src/
│       │   ├── components/
│       │   ├── layouts/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── stores/
│       │   └── utils/
│       └── package.json
├── public/               # 静态资源
│   ├── Games/           # 游戏文件
│   ├── images/          # 游戏封面图
│   └── uploads/         # 上传临时目录
├── package.json          # 根 package.json (workspaces)
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

**注意**: 本项目使用 SQLite，无需安装额外的数据库服务。

### 1. 安装依赖

```bash
cd MyGamesV2
npm install
```

### 2. 配置环境变量

复制 `packages/backend/.env.example` 到 `packages/backend/.env` 并修改配置：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# SQLite 数据库路径
DB_PATH=./data/mygames.db

# 管理员账号（独立配置）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# JWT 密钥
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_MAX_SIZE=104857600
PUBLIC_PATH=../../public
```

### 3. 初始化数据库

```bash
npm run db:migrate
```

此命令会：
- 自动创建 SQLite 数据库文件
- 自动创建数据库表结构
- 从旧项目的 `games.json` 导入游戏数据（如果存在）

### 4. 启动开发服务器

```bash
npm run dev
```

这会同时启动前端和后端开发服务器：
- 前端: http://localhost:5173
- 后端 API: http://localhost:3001
- 管理后台: http://localhost:5173/admin

### 5. 生产构建

```bash
npm run build
npm run start
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:backend` | 仅启动后端开发服务器 |
| `npm run dev:frontend` | 仅启动前端开发服务器 |
| `npm run build` | 构建前后端生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run clean` | 清理 node_modules 和 dist |

## 功能特性

### 管理后台 (/admin)
- 管理员登录（独立账号，配置在 .env 文件）
- 游戏管理（列表、添加、编辑、删除）
- ZIP 压缩包上传游戏
- 自动解压到 Games 目录
- 自动提取游戏封面图到 images 目录
- 游戏预览（iframe 内嵌）
- 游戏置顶/开关状态管理

### 用户端 (/)
- 游戏卡片列表展示
- 游戏搜索功能
- 用户登录/注册
- 云存档功能（自动/手动）
- 点击/点赞统计
- 游戏大图预览
- 新游戏/置顶标签

## API 接口

### 认证接口
- `POST /api/auth/admin/login` - 管理员登录
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册

### 游戏接口
- `GET /api/games` - 获取游戏列表
- `GET /api/games/:id` - 获取单个游戏
- `POST /api/games` - 创建游戏（需管理员权限）
- `PUT /api/games/:id` - 更新游戏（需管理员权限）
- `DELETE /api/games/:id` - 删除游戏（需管理员权限）
- `POST /api/games/upload` - 上传游戏 ZIP（需管理员权限）
- `POST /api/games/:id/image` - 上传游戏封面（需管理员权限）
- `POST /api/games/click` - 记录点击
- `POST /api/games/like` - 记录点赞
- `GET /api/games/likes` - 获取点赞状态

### 存档接口
- `GET /api/saves/auto-save` - 获取自动存档设置
- `POST /api/saves/auto-save` - 设置自动存档
- `POST /api/saves/upload` - 上传存档
- `POST /api/saves/download` - 下载存档
- `GET /api/saves/list` - 获取存档列表

## 从旧项目迁移

1. 确保旧项目 `MyGames/games.json` 文件存在
2. 运行 `npm run db:migrate`，会自动导入游戏数据
3. 手动复制旧项目的 `Games/` 和 `images/` 目录到 `MyGamesV2/public/`

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

（可在 `.env` 文件中修改）

## SQLite 数据库

数据库文件位于 `packages/backend/data/mygames.db`。

优势：
- 无需安装额外数据库服务
- 单文件存储，便于备份和迁移
- 适合中小型应用
