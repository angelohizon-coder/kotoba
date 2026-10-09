// Optional reliable localhost origin. Uses only Node built-ins; npm is never required.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer between 1024 and 65535.');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'};
const server = http.createServer(async (request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end('Method not allowed'); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname.includes('\0')) throw new Error('Invalid path');
    let file = resolve(root, '.' + pathname.replaceAll('\\', '/'));
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); response.end('Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the other server or choose another PORT.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Kotoba is ready at http://127.0.0.1:${port}\nNo npm, dependencies, or build step. Press Ctrl+C to stop.`));
