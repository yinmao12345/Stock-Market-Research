const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);

  fs.promises.stat(filePath)
    .then(stat => stat.isDirectory() ? path.join(filePath, 'index.html') : filePath)
    .then(async finalPath => {
      const ext = path.extname(finalPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const data = await fs.promises.readFile(finalPath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    })
    .catch(() => {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    });
}).listen(port, () => {
  console.log(`industry-chain-map running at http://localhost:${port}`);
});
