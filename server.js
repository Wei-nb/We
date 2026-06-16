const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

const server = http.createServer((req, res) => {
  // 去除查询参数，只保留路径部分
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.js' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
