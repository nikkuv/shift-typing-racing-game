import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { RoomService } from './rooms.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const dev=process.argv.includes('--dev');
const service=new RoomService();
let vite;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end();return;}
 if(url.pathname==='/api/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,multiplayer:true}));return;}
 if(url.pathname==='/api/config'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({publicUrl:process.env.PUBLIC_URL||null}));return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
 if(dev){vite.middlewares(req,res);return;}
 let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
 let file=path.resolve(dist,'.'+pathname);if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403).end();return;}
 if(pathname==='/'||(!path.extname(pathname)&&!pathname.startsWith('/api/')))file=path.join(dist,'index.html');
 try{const stat=await fs.promises.stat(file);if(!stat.isFile())throw new Error();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',file.endsWith('index.html')?'no-cache':'public, max-age=3600');res.setHeader('Content-Length',stat.size);if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);}catch{res.writeHead(404).end('Not found');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 if(req.url!=='/ws'){if(!dev)socket.destroy();return;}
 try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}
 if(wss.clients.size>=200){socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',ws=>{
 ws.alive=true;ws.on('pong',()=>{ws.alive=true;});let windowAt=Date.now(),messages=0;
 service.send(ws,{type:'hello',serverTime:Date.now()});
 ws.on('message',raw=>{if(Date.now()-windowAt>=1000){windowAt=Date.now();messages=0;}if(++messages>100){ws.close(1008,'Too many updates');return;}
  try{const data=JSON.parse(raw.toString());if(!data||typeof data!=='object')throw new Error('Invalid message.');service.handle(ws,data);}catch(e){service.send(ws,{type:'error',message:e.message||'Could not process this action.',code:e.code||'INVALID_ACTION'});}
 });
 ws.on('close',()=>service.disconnect(ws));ws.on('error',()=>{});
});
const tick=setInterval(()=>service.tick(),250);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive||ws.bufferedAmount>512000){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
if(dev){const {createServer}=await import('vite');vite=await createServer({root,server:{middlewareMode:true,hmr:{server}},appType:'spa'});}
const port=Number(process.env.PORT||5175),host=process.env.HOST||'127.0.0.1';
server.listen(port,host,()=>console.log(`SHIFT multiplayer is running at http://${host}:${port}`));
function shutdown(){clearInterval(tick);clearInterval(heartbeat);for(const ws of wss.clients)ws.close(1001,'Server restarting');wss.close();server.close();vite?.close();setTimeout(()=>process.exit(0),500).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
