// Optional local preview only. A normal static web host does not need Node.js.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/')path='/index.html';
    if(!/^\/(index\.html|config\.js|config\.local\.json|(?:css|js|images|data)\/[^\0]*)$/.test(path)) {res.writeHead(404);res.end('Not found');return;}
    const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw new Error('Invalid path');
    const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(5173,'127.0.0.1',()=>console.log('Local: http://localhost:5173/'));
