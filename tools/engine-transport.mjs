import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Runs the actual offscreen transport + shipped WASM, substituting only Chrome Worker IPC.
export function startTransport({source='offscreen.js'}={}) {
 let handler;const workers=[];const metrics={requests:0,searches:0,workerStarts:0,initializationMs:0,engineMs:0,requestMs:0,byDepth:{}};
 class Worker {
  constructor(){this.started=performance.now();metrics.workerStarts++;
   this.process=spawn(process.execPath,['engine/stockfish-19-lite-single.js'],{stdio:['pipe','pipe','pipe']});workers.push(this);
   this.lines=createInterface({input:this.process.stdout});
   this.lines.on('line',data=>{if(data==='readyok')metrics.initializationMs+=performance.now()-this.started;
    if(data.startsWith('bestmove')&&this.searchStart){metrics.engineMs+=performance.now()-this.searchStart;this.searchStart=null;}
    this.onmessage?.({data});});
   this.process.on('error',e=>this.onerror?.({message:e.message}));this.process.stderr.resume();
  }
  postMessage(command){if(command.startsWith('go ')){metrics.searches++;this.searchStart=performance.now();const depth=command.match(/depth (\d+)/)?.[1];metrics.byDepth[depth]=(metrics.byDepth[depth]||0)+1;}this.process.stdin.write(command+'\n');}
  terminate(){this.lines.close();this.process.kill();}
 }
 const chrome={runtime:{getURL:p=>p,onMessage:{addListener:fn=>handler=fn}}};
 runInNewContext(readFileSync(source,'utf8'),{Worker,chrome,setTimeout,clearTimeout,console:{log(){}}});
 return {metrics,async evaluate(fen,depth=12,options={}){
  metrics.requests++;const start=performance.now();
  const result=await new Promise(resolve=>handler({type:'OFFSCREEN_ANALYZE',fen,depth,...options},{},resolve));metrics.requestMs+=performance.now()-start;
  if(!result.success)throw Error(result.error);
  return {...result,score:result.scoreCp};
 },close(){workers.forEach(w=>w.terminate());}};
}
