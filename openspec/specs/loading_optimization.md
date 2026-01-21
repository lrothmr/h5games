# H5 游戏加载性能优化方案 (Service Worker + Game Pack)

## 1. 问题背景
H5 游戏（尤其是 Cocos, Laya, Egret 引擎制作的游戏）通常包含：
- **大量碎文件**：成百上千的 JSON、PNG、MP3，导致 HTTP 握手开销巨大。
- **大文件**：巨大的资源包导致首屏白屏时间长，且容易因网络波动中断。
- **并发限制**：浏览器对同一域名的并发请求限制。

## 2. 核心方案：基于 Service Worker 的虚拟文件系统

### 2.1 技术原理
利用 Service Worker 拦截游戏发出的所有网络请求（`fetch` 事件），从一个预先加载并解压在内存/索引数据库（IndexedDB）中的 **Game Pack** 中直接返回资源。

### 2.2 实现步骤

#### 第一步：后端资源打包
- 在上传游戏时，系统不再只是解压缩到静态目录。
- **打包格式**：将所有游戏资源打包成一个 `.pkg` 或特殊的 `.zip` 文件。
- **索引表**：生成一个 `manifest.json`，记录每个文件的偏移量、大小和路径。

#### 第二步：前端 Service Worker 注册
在加载 `GamePlay.tsx` 页面时，注册一个专用的 Service Worker。

```javascript
// service-worker.js 逻辑伪代码
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // 如果请求属于当前游戏的资源路径
  if (isGameResource(url)) {
    event.respondWith(
      // 从 IndexedDB 或 缓存的 ArrayBuffer 中读取并构造 Response
      getFromVirtualFileSystem(url)
    );
  }
});
```

#### 第三步：流式加载与分片解压
- **分片下载**：使用 `Range` 请求分段下载大包。
- **流式解压缩**：使用 `CompressionStream` 或 `fflate` 库在浏览器端流式解压。
- **按需读取**：Service Worker 只在游戏请求某个具体文件时，才从大包中提取对应的字节块。

## 3. 方案优势

| 维度 | 传统方式 | 优化方案 |
| :--- | :--- | :--- |
| **HTTP 请求数** | 100+ (取决于文件数) | **1 个** (大包下载) |
| **响应速度** | 受限于网络往返和并发数 | **接近本地 IO** (SW 拦截) |
| **离线支持** | 较难维护 | **天然支持** (IndexedDB 存储) |
| **服务器压力** | 频繁的小文件 IO 访问 | **顺序读取大文件**，对磁盘友好 |

## 4. 实施建议 (V2.1)

1.  **后端改造**：在 `fileHandler.ts` 中增加一个 `generatePackage` 函数，将解压后的文件重新组织成一个带有索引头的大文件。
2.  **前端改造**：
    - 开发 `GameLoader.ts` 负责大包的下载和 IndexedDB 管理。
    - 编写 `sw.js` 脚本并将其放置在 `public` 目录，确保能控制 `/Games/` 下的路径。
    - 针对 Cocos Creator 等引擎，自动修正其 `XMLHttpRequest` 的行为以匹配 SW。

## 5. 备选快速方案 (如果不使用 SW)
如果不想引入 Service Worker，可以采用 **HTTP/2 Push** 或 **合并资源图集**，但效果不如 SW 彻底。
目前推荐优先实现 **Service Worker + 资源包拦截**。
