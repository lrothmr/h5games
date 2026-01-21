const DB_NAME = 'MyGamesVFS';
const STORE_NAME = 'game_files';
const vfsState = new Map();

// --- 数据库辅助函数 ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromDB(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function saveToDB(id, data, version) {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ id, data, v: version });
  } catch (e) {}
}

// --- Service Worker 事件 ---
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('message', async (event) => {
  const { type, gameId, gameUrl } = event.data;

  if (type === 'INIT_VFS') {
    try {
      const response = await fetch(`${gameUrl}/manifest.json?v=${Date.now()}`);
      const manifest = await response.json();
      
      const filesMap = new Map();
      manifest.files.forEach(file => {
        filesMap.set(file.p, { o: file.o, s: file.s });
      });
      
      vfsState.set(gameId, { 
        status: 'ready', 
        gameUrl,
        v: manifest.v,
        files: filesMap 
      });
      
      event.source.postMessage({ type: 'VFS_READY', gameId });
    } catch (error) {
      console.error('VFS Init Error:', error);
      event.source.postMessage({ type: 'VFS_ERROR', gameId });
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/Games/')) {
    const parts = url.pathname.split('/');
    const gameId = parts[2];
    const filePath = parts.slice(3).join('/');
    
    const state = vfsState.get(gameId);
    if (state && state.status === 'ready') {
      const fileInfo = state.files.get(filePath);
      if (fileInfo) {
        event.respondWith(handleRequest(gameId, state, fileInfo, filePath));
        return;
      }
    }
  }
});

async function handleRequest(gameId, state, fileInfo, filePath) {

  const cacheKey = `${gameId}:${filePath}`;

  

  const cachedData = await getFromDB(cacheKey);

  if (cachedData) {

    return new Response(cachedData, {

      headers: { 'Content-Type': getContentType(filePath) }

    });

  }



  const { o: offset, s: size } = fileInfo;

  try {

    const response = await fetch(`${state.gameUrl}/game.core`, {

      headers: { 

        'Range': `bytes=${offset}-${offset + size - 1}`,

        'X-Requested-With': 'XMLHttpRequest', // 欺骗下载工具，伪装成普通 AJAX

        'X-App-VFS': '1'

      }

    });



    const data = await response.arrayBuffer();
    saveToDB(cacheKey, data, state.v).catch(() => {});

    return new Response(data, {
      headers: { 'Content-Type': getContentType(filePath) }
    });
  } catch (error) {
    return fetch(`${state.gameUrl}/${filePath}`);
  }
}

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html', 'js': 'application/javascript', 'css': 'text/css',
    'json': 'application/json', 'png': 'image/png', 'jpg': 'image/jpeg',
    'gif': 'image/gif', 'webp': 'image/webp', 'wasm': 'application/wasm'
  };
  return types[ext] || 'application/octet-stream';
}
