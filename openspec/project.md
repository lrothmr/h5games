# MyGames V2 - 摸鱼游戏管理平台

MyGames V2 是一个基于 React + Node.js + SQLite 构建的高性能 H5 游戏管理平台。

## 🎯 项目愿景
提供一个简单、安全、高效的 H5 游戏托管与分享平台，支持大文件上传、云存档同步以及完善的管理后台。

## 🏗️ 架构概览

### 技术栈
- **前端 (packages/frontend)**
  - 框架: React 18 (TypeScript)
  - 构建工具: Vite
  - UI 组件库: Ant Design 5
  - 状态管理: Zustand
  - 网络请求: Axios
  - 路由: React Router
- **后端 (packages/backend)**
  - 运行时: Node.js (TypeScript)
  - Web 框架: Express
  - 数据库: SQLite (使用 `sql.js` 进行内存计算并同步到文件)
  - 认证: JWT (jsonwebtoken)
  - 安全: Speakeasy (TOTP MFA)
  - 文件处理: Multer (切片上传支持)
- **部署与运维**
  - 进程管理: PM2
  - 脚本: Shell Script
  - 工作流: GitHub Actions

### 核心目录结构
```text
MyGamesV2/
├── packages/
│   ├── backend/          # 后端服务
│   │   ├── src/
│   │   │   ├── controllers/ # 业务逻辑处理
│   │   │   ├── middlewares/ # 鉴权、MFA、上传中间件
│   │   │   ├── routes/      # API 路由
│   │   │   └── config/      # 数据库与系统配置
│   └── frontend/         # 前端应用
│       ├── src/
│       │   ├── pages/       # 页面 (用户端 & 管理端)
│       │   ├── services/    # API 请求封装
│       │   └── stores/      # Zustand 状态 Store
├── public/               # 静态资源 (游戏文件、解压后的游戏内容)
└── openspec/             # 项目规范与变更记录
```

## 🛠️ 核心功能模块

### 1. 用户与认证系统 (Auth & User)
- **邀请注册制**：仅限持有管理员生成邀请码的用户注册。
- **双角色系统**：区分普通用户 (User) 与管理员 (Admin)。
- **MFA 安全防护**：管理员登录支持 Google Authenticator (TOTP) 二步验证。
- **强制初始化**：管理员首次登录强制修改默认密码。

### 2. 游戏管理 (Game Management)
- **极速上传**：支持 ZIP 一键上传，服务器自动解压。
- **大文件支持**：内置切片上传，支持 GB 级超大游戏文件。
- **引擎兼容**：自动处理 Cocos Creator 等引擎的特定路径问题。
- **互动特性**：支持点赞、置顶、点击统计。

### 3. 云存档系统 (Cloud Save)

- **跨端同步**：用户游戏进度自动/手动上传至云端。

- **数据隔离**：每个用户在每款游戏下拥有独立的存档空间。



### 4. 性能优化 (Performance Optimization)

- **虚拟文件系统 (VFS)**：通过 Service Worker 拦截请求，将大量碎文件打包加载，解决 H5 游戏首屏加载慢的问题。

- **流式分片下载**：针对大文件采用 Range 请求，支持断点续传与极速响应。



### 5. 统计与分析 (Statistics)

- **点击量追踪**：记录每款游戏的访问详情。

- **用户行为**：邀请码使用状态追踪。



## 🚦 规范与约定



- **代码规范**: 使用 TypeScript 进行全栈开发，严格定义接口类型。

- **API 约定**:

  - `/api/auth/*`: 认证相关。

  - `/api/games/*`: 游戏展示与管理。

  - `/api/saves/*`: 存档操作。

  - `/api/admin/*`: 管理员专属功能（用户列表、邀请码生成等）。

- **状态管理**: 前端使用 Zustand 进行轻量化状态管理，避免 Redux 的复杂性。

- **数据库同步**: 后端每次写操作后需调用 `saveDatabase()` 确保内存数据落盘到 SQLite 文件。



## 📜 历史版本分析 (Legacy Project)

经过对 `D:\摸鱼游戏平台(藏宝湾特供)\平台源码\MyGames` (PHP 版) 的分析：

- **存储机制**：旧版采用 `save_manager.php` 处理存档，数据以 JSON 形式存储在文件系统及数据库中。

- **游戏组织**：依赖 `games.json` 进行静态配置，缺乏动态管理 API。

- **V2 改进**：MyGames V2 将 PHP 逻辑迁移至 Node.js + Express，并引入了现代化的前端工程化 (Vite + React) 与更高级的资源加载策略。
