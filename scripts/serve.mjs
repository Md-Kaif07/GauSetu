// Dependency-free static preview of the included production build.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let target=resolve(root,'.'+(path==='/'?'/index.html':path));
    if(target!==resolve(root)&&!target.startsWith(resolve(root)+sep)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(target)).isDirectory())target=resolve(target,'index.html');
    const body=await readFile(target);res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`GauSetu is ready: http://localhost:${port}`));
