import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Chess} from 'chess.js';

test('offscreen bridge: actual engine, paired searches, cache separation and input rejection',{timeout:120000},async()=>{
 const workers=[],commands=[];let handler;
 class Worker {
  constructor(){
   this.process=spawn(process.execPath,['engine/stockfish-19-lite-single.js'],{stdio:['pipe','pipe','inherit']});
   this.lines=createInterface({input:this.process.stdout});
   this.lines.on('line',data=>this.onmessage?.({data}));
   this.process.on('error',error=>this.onerror?.({message:error.message}));workers.push(this);
  }
  postMessage(command){commands.push(command);this.process.stdin.write(command+'\n');}
  terminate(){this.lines.close();this.process.kill();}
 }
 const chrome={runtime:{getURL:path=>path,onMessage:{addListener:fn=>{handler=fn;}}}};
 runInNewContext(readFileSync('offscreen.js','utf8'),{Worker,chrome,setTimeout,clearTimeout,console:{log(){}}});
 const send=message=>new Promise(resolve=>handler({type:'OFFSCREEN_ANALYZE',...message},{},resolve));
 const game=new Chess();game.move('d4');game.move('d5');const fen=game.fen();
 try{
  const root=await send({fen,depth:12});assert.equal(root.success,true);assert.ok(root.candidates.length===3);
  const moves=[...new Set([root.bestMove,'c2c4'])];if(moves.length===1)moves.push('g1f3');
  const paired=await send({fen,depth:12,searchmoves:moves});assert.equal(paired.success,true);
  assert.equal(paired.candidates.length,2);assert.ok(paired.candidates.every(c=>moves.includes(c.move)&&c.depth===12));
  const goCount=commands.filter(c=>c.startsWith('go ')).length;
  await send({fen,depth:12,searchmoves:moves});assert.equal(commands.filter(c=>c.startsWith('go ')).length,goCount);
  await send({fen,depth:12});assert.equal(commands.filter(c=>c.startsWith('go ')).length,goCount);
  const invalid=await send({fen,depth:12,searchmoves:['c2c4\nquit']});
  assert.equal(invalid.success,false);assert.match(invalid.error,/Invalid root search moves/);
  assert.equal(commands.filter(c=>c.startsWith('go ')).length,goCount);
  const pool=game.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));
  const single=await send({fen,depth:8,searchmoves:pool,multiPV:1});
  assert.equal(single.success,true);assert.equal(single.candidates.length,1);
  const triple=await send({fen,depth:8,searchmoves:pool,multiPV:3});
  assert.equal(triple.success,true);assert.equal(triple.candidates.length,3);
  const count=commands.filter(c=>c.startsWith('go ')).length;
  assert.equal(count,goCount+2);
  await send({fen,depth:8,searchmoves:pool,multiPV:1});
  assert.equal(commands.filter(c=>c.startsWith('go ')).length,count,'MultiPV participates in the cache key');
  for(const multiPV of [0,4,'1']){
   const invalid=await send({fen,depth:8,searchmoves:pool,multiPV});
   assert.equal(invalid.success,false);assert.match(invalid.error,/Invalid MultiPV/);
  }
  const interrupted=send({fen,depth:10});await new Promise(resolve=>setImmediate(resolve));
  workers[0].onerror({message:'simulated worker interruption'});
  const failed=await interrupted;assert.equal(failed.success,false);assert.match(failed.error,/interruption/);
  const recovered=await send({fen,depth:10});assert.equal(recovered.success,true);assert.equal(workers.length,2);
 }finally{for(const worker of workers)worker.terminate();}
});

test('background routes paired search options through existing offscreen architecture',async()=>{
 let handler,created=0,forwarded;
 const chrome={runtime:{getURL:path=>path,onMessage:{addListener:fn=>handler=fn},sendMessage:async message=>{forwarded=message;return {success:true,depth:18};}},offscreen:{hasDocument:async()=>false,createDocument:async()=>{created++;}}};
 runInNewContext(readFileSync('background.js','utf8'),{chrome,setTimeout,console});
 const response=await new Promise(resolve=>handler({type:'ANALYZE_POSITION',fen:'position',depth:18,searchmoves:['c2c4','d2d4'],multiPV:1},{},resolve));
 assert.equal(created,1);assert.equal(response.success,true);assert.equal(forwarded.type,'OFFSCREEN_ANALYZE');
 assert.deepEqual(Array.from(forwarded.searchmoves),['c2c4','d2d4']);assert.equal(forwarded.multiPV,1);
});
