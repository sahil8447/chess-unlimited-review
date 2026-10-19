import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';

// No added browser dependency: Node 24 WebSocket talks to the system Chromium.
export async function startBrowserFixture(){
 const directory=await mkdtemp(join(tmpdir(),'chess-review-browser-'));
 await writeFile(join(directory,'entry.js'),`export {Chess} from ${JSON.stringify(resolve('node_modules/chess.js/dist/esm/chess.js'))}; export {createReviewBoard} from ${JSON.stringify(resolve('src/board.js'))}; export {createEvaluationGraph} from ${JSON.stringify(resolve('src/graph.js'))};`);
 await build({entryPoints:[join(directory,'entry.js')],bundle:true,format:'iife',globalName:'ChessReviewTest',outfile:join(directory,'modules.js'),platform:'browser',target:'chrome120'});
 await build({entryPoints:['src/content.js'],bundle:true,format:'iife',outfile:join(directory,'content.js'),platform:'browser',target:'chrome120'});
 const callbackData={game:{pgnHeaders:{Result:'0-1'},moveList:'nv0KoE7F'}};
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/callback/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(callbackData));return;}
  let file;
  if(['/modules.js','/content.js'].includes(url.pathname))file=join(directory,url.pathname.slice(1));
  else if(/^\/engine\/stockfish-19-lite-single\.(js|wasm)$/.test(url.pathname))file=resolve('.'+url.pathname);
  else if(/^\/pieces\/[wb][PNBRQK]\.svg$/.test(url.pathname))file=resolve('.'+url.pathname);
  if(file){res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.svg')?'image/svg+xml':'text/javascript');res.end(await readFile(file));return;}
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><body><script src="/modules.js"></script><script>
  window.chrome=window.chrome||{};chrome.runtime={getURL:p=>'/'+p,sendMessage:r=>window.testEngine(r)};
  window.testEngine=async request=>{const game=new ChessReviewTest.Chess(request.fen),move=game.moves({verbose:true})[0];const uci=move ? move.from+move.to+(move.promotion||'') : null;return {success:true,scoreCp:0,mate:null,depth:request.depth,bestMove:uci,pv:uci?[uci]:[],candidates:uci?[{rank:1,depth:request.depth,move:uci,pv:[uci],scoreCp:0,mate:null,bound:false}]:[]};};
  </script>${url.searchParams.has('content')?'<script src="/content.js"></script>':''}</body></html>`);
 }catch(error){res.statusCode=500;res.end(error.message);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const child=spawn(process.env.CHESS_CHROMIUM || 'chromium',['--headless','--no-sandbox','--disable-gpu','--enable-unsafe-extension-debugging','--remote-debugging-port=0','--no-first-run',`--user-data-dir=${join(directory,'profile')}`],{stdio:['ignore','ignore','pipe']});
 let socket;
 try{
  const endpoint=await new Promise((resolve,reject)=>{let stderr='';const timer=setTimeout(()=>reject(new Error('Chromium startup timed out')),15000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Chromium exited '+code));});child.stderr.on('data',data=>{stderr+=data;const match=stderr.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let sequence=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),job=pending.get(message.id);if(!job)return;pending.delete(message.id);clearTimeout(job.timer);message.error?job.reject(new Error(message.error.message)):job.resolve(message.result);});
  const command=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await command('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
  await command('Page.enable',{},sessionId);
  const evaluate=async(fn)=>{const response=await command('Runtime.evaluate',{expression:typeof fn==='function'?`(${fn.toString()})()`:fn,awaitPromise:true,returnByValue:true},sessionId);if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);return response.result.value;};
  let navigation=0;
  const navigate=async(path='/analysis')=>{const url=new URL(base+path);url.searchParams.set('_testNav',String(++navigation));await command('Page.navigate',{url:url.href},sessionId);for(let i=0;i<200;i++){try{if(await evaluate(`location.href === ${JSON.stringify(url.href)} && document.readyState === "complete" && !!window.ChessReviewTest`))return;}catch{}await new Promise(r=>setTimeout(r,20));}throw Error('Browser fixture did not load');};
  await navigate();
  return {evaluate,navigate,async loadExtension(){return command('Extensions.loadUnpacked',{path:resolve('dist')});},async close(){await command('Browser.close').catch(()=>{});socket.close();child.kill();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});}};
 }catch(error){socket?.close();child.kill();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});throw error;}
}
