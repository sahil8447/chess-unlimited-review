import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startBrowserFixture} from './helpers/browser.mjs';

test('Chromium product components and standalone WASM worker',{timeout:180000},async t=>{
 let browser;try{browser=await startBrowserFixture();}catch(error){if(/ENOENT/.test(error.message)){t.skip('System Chromium unavailable');return;}throw error;}
 try{
  await t.test('genuine unpacked extension loading',async t=>{
   try{const loaded=await browser.loadExtension();assert.ok(loaded.id);}catch(error){if(/disabled by the administrator/.test(error.message)){t.skip('Chrome policy blocks unpacked extensions: '+error.message);return;}throw error;}
  });
  await t.test('game navigation, legal PV prefix and return-to-game stay synchronized',async()=>{
   const result=await browser.evaluate(()=>{
    const {Chess,createReviewBoard}=ChessReviewTest;const game=new Chess();game.loadPgn('1. e4 e5 2. Nf3 Nc6 *');
    const moves=game.history({verbose:true}).map(m=>({...m,grade:'good'}));const changes=[];
    const board=createReviewBoard(game.pgn(),moves,Array.from({length:5},(_,ply)=>({ply,whiteCp:ply*10})),ply=>changes.push(ply));document.body.append(board.element);
    const piece=square=>board.element.querySelector(`[data-square="${square}"] img`)?.alt;
    board.goToMove(0);const start=piece('e2');board.goToMove(2);const middle=piece('e4');
    const pv=board.showEngineVariation(3,['f1c4','g8f6'],2);const bishop=piece('c4');
    const bad=board.showEngineVariation(3,['f1c4','a1a8'],2);const unchanged=piece('c4');
    [...board.element.querySelectorAll('button')].find(b=>b.textContent==='Return to game').click();
    const knight=piece('f3'),last=changes.at(-1),cells=board.element.querySelectorAll('[data-square]').length;
    board.destroy();return {start,middle,pv,bishop,bad,unchanged,knight,last,cells};
   });
   assert.deepEqual(result,{start:'White p',middle:'White p',pv:true,bishop:'White b',bad:false,unchanged:'White b',knight:'White n',last:3,cells:64});
  });
  await t.test('custom moves, undo, invalid destinations and live error recovery',async()=>{
   const result=await browser.evaluate(async()=>{
    document.body.replaceChildren();const {Chess,createReviewBoard}=ChessReviewTest;const game=new Chess();game.loadPgn('1. e4 *');let calls=0;
    const board=createReviewBoard(game.pgn(),[{grade:'good'}],[{whiteCp:0},{whiteCp:20}],null,async()=>{if(++calls===1)throw Error('temporary worker failure');return {score:30,mate:null,bestMove:'g1f3'};});document.body.append(board.element);
    const click=s=>board.element.querySelector(`[data-square="${s}"]`).click();const wait=()=>new Promise(r=>setTimeout(r,350));
    click('e7');click('e3');const illegal=!board.element.querySelector('[data-square="e3"] img');click('e7');click('e5');await wait();
    const error=board.element.textContent.includes('temporary worker failure');
    [...board.element.querySelectorAll('button')].find(b=>b.textContent.includes('Undo custom')).click();
    click('c7');click('c5');await wait();const recovered=board.element.textContent.includes('Live eval:');
    const whitePerspective=board.element.querySelector('.chess-eval-text').textContent;
    board.destroy();return {illegal,error,recovered,calls,whitePerspective};
   });
   assert.deepEqual(result,{illegal:true,error:true,recovered:true,calls:2,whitePerspective:'+0.30'});
  });
  await t.test('disposed boards cancel queued live requests',async()=>{
   const result=await browser.evaluate(async()=>{
    document.body.replaceChildren();const {Chess,createReviewBoard}=ChessReviewTest;const g=new Chess();g.loadPgn('1. e4 *');let calls=0;
    const board=createReviewBoard(g.pgn(),[{grade:'good'}],[{whiteCp:0},{whiteCp:0}],null,async()=>{calls++;return {score:0};});document.body.append(board.element);
    board.element.querySelector('[data-square="e7"]').click();board.element.querySelector('[data-square="e5"]').click();board.destroy();
    await new Promise(r=>setTimeout(r,300));return calls;
   });assert.equal(result,0);
  });
  await t.test('late live results never overwrite navigation to another position',async()=>{
   const result=await browser.evaluate(async()=>{
    document.body.replaceChildren();const {Chess,createReviewBoard}=ChessReviewTest;const g=new Chess();g.loadPgn('1. e4 *');let resolve;
    const board=createReviewBoard(g.pgn(),[{grade:'good'}],[{whiteCp:0},{whiteCp:20}],null,()=>new Promise(r=>resolve=r));document.body.append(board.element);
    board.element.querySelector('[data-square="e7"]').click();board.element.querySelector('[data-square="e5"]').click();
    await new Promise(r=>setTimeout(r,300));board.goToMove(0);resolve({score:999,mate:null,bestMove:'g1f3'});
    await new Promise(r=>setTimeout(r,30));const text=board.element.querySelector('.chess-board-info').textContent,score=board.element.querySelector('.chess-eval-text').textContent;
    board.destroy();return {text,score};
   });assert.match(result.text,/Starting Position/);assert.equal(result.score,'+0.00');
  });
  await t.test('custom FEN move numbers, promotions and terminal exploration',async()=>{
   const result=await browser.evaluate(()=>{
    document.body.replaceChildren();const {createReviewBoard}=ChessReviewTest;
    const pgn='[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n\n23... a1=Q+ *';
    const board=createReviewBoard(pgn,[{grade:'good'}],[{whiteCp:0},{whiteCp:-900}]);document.body.append(board.element);
    const title=board.element.querySelector('.chess-board-info').textContent;board.goToMove(0);
    board.element.querySelector('[data-square="a2"]').click();board.element.querySelector('[data-square="a1"]').click();
    const picker=!board.element.querySelector('.chess-promotion-picker').hidden;
    [...board.element.querySelectorAll('.chess-promotion-picker button')].find(b=>b.textContent==='Knight').click();
    const piece=board.element.querySelector('[data-square="a1"] img').alt;board.destroy();return {title,picker,piece};
   });assert.match(result.title,/23\.\.\. a1=Q\+/);assert.equal(result.picker,true);assert.equal(result.piece,'Black n');
  });
  await t.test('evaluation graph click and keyboard select the matching position',async()=>{
   const result=await browser.evaluate(()=>{
    document.body.replaceChildren();const selected=[];const graph=ChessReviewTest.createEvaluationGraph([{ply:0,whiteCp:0},{ply:1,whiteCp:20}],[{san:'e4',grade:'good'}],ply=>selected.push(ply));document.body.append(graph);
    const circles=graph.querySelectorAll('circle');circles[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));circles[0].dispatchEvent(new MouseEvent('click',{bubbles:true}));return selected;
   });assert.deepEqual(result,[1,0]);
  });
  await t.test('content review completes and malformed imports recover',async()=>{
   await browser.navigate('/analysis?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();const input=document.getElementById('chess-review-pgn'),button=document.getElementById('chess-review-import'),result=document.getElementById('chess-review-result');
    input.value='1. e5 *';button.click();const invalid=result.textContent.includes('Invalid PGN');
    input.value='1. f3 e5 2. g4 Qh4# 0-1';button.click();
    for(let i=0;i<300 && !result.textContent.includes('Game Review Complete');i++)await new Promise(r=>setTimeout(r,10));
    const rows=result.querySelectorAll('.chess-move-row');if(rows.length)rows[0].click();
    result.querySelector('.chess-pv-move')?.click();
    const exploring=result.querySelector('.chess-board-info')?.textContent.includes('Exploring variation');
    [...result.querySelectorAll('button')].find(b=>b.textContent==='Return to game')?.click();
    const returned=result.querySelector('.chess-board-info')?.textContent.includes('1. f3');
    return {invalid,exploring,returned,complete:result.textContent.includes('Game Review Complete'),moves:window.chessReviewResults?.reviewedMoves.length,rows:result.querySelectorAll('.chess-move-row').length,enabled:!button.disabled,accuracy:result.textContent.includes('Estimated Accuracy')};
   });assert.deepEqual(result,{invalid:true,exploring:true,returned:true,complete:true,moves:4,rows:4,enabled:true,accuracy:true});
  });
  await t.test('closing a review stops further engine calls and stale rendering',async()=>{
   await browser.navigate('/analysis?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();let resolve,calls=0;
    window.testEngine=()=>{calls++;return new Promise(r=>resolve=r);};document.getElementById('chess-review-pgn').value='1. e4 e5 *';document.getElementById('chess-review-import').click();
    document.querySelector('.chess-review-close').click();document.getElementById('chess-unlimited-review-btn').click();
    resolve({success:true,scoreCp:0,mate:null,depth:12,pv:[],candidates:[]});await new Promise(r=>setTimeout(r,50));
    return {calls,clean:document.getElementById('chess-review-result').textContent==='',published:!!window.chessReviewResults};
   });assert.deepEqual(result,{calls:1,clean:true,published:false});
  });
  await t.test('an active review retains its imported PGN and custom move numbers',async()=>{
   await browser.navigate('/analysis?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();const input=document.getElementById('chess-review-pgn'),button=document.getElementById('chess-review-import'),output=document.getElementById('chess-review-result');
    const original=window.testEngine;let resolve,firstRequest,calls=0;
    window.testEngine=request=>++calls===1 ? (firstRequest=request,new Promise(r=>resolve=r)) : original(request);
    input.value='[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n\n23... a1=Q+ *';button.click();
    input.value='1. d4 *';resolve(await original(firstRequest));
    for(let i=0;i<300&&button.disabled;i++)await new Promise(r=>setTimeout(r,10));
    return {moves:window.chessReviewResults?.reviewedMoves.length,number:window.chessReviewResults?.reviewedMoves[0].number,title:output.querySelector('.chess-board-info')?.textContent,piece:output.querySelector('[data-square="a1"] img')?.alt};
   });assert.equal(result.moves,1);assert.equal(result.number,23);assert.match(result.title,/23\.\.\. a1=Q\+/);assert.equal(result.piece,'Black q');
  });
  await t.test('automatic callback import reconstructs a completed game in a local fixture',async()=>{
   await browser.navigate('/game/live/42?content');const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();const result=document.getElementById('chess-review-result');
    for(let i=0;i<300&&!result.textContent.includes('Game Review Complete');i++)await new Promise(r=>setTimeout(r,10));
    return {complete:result.textContent.includes('Game Review Complete'),moves:window.chessReviewResults?.reviewedMoves.length,fetchMs:window.chessReviewResults?.metrics.fetchMs,renderMs:window.chessReviewResults?.metrics.renderMs};
   });assert.equal(result.complete,true);assert.equal(result.moves,4);assert.ok(result.fetchMs>=0);assert.ok(result.renderMs>0);
  });
  await t.test('SPA transition closes old game and keeps exactly one review button',async()=>{
   await browser.navigate('/game/live/42?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();
    await new Promise(r=>setTimeout(r,100));
    history.pushState({},'', '/game/live/43');
    await new Promise(r=>setTimeout(r,30));
    return {buttons:document.querySelectorAll('#chess-unlimited-review-btn').length,panel:!!document.getElementById('chess-unlimited-review-panel'),stale:!!window.chessReviewResults};
   });assert.deepEqual(result,{buttons:1,panel:false,stale:false});
  });
  await t.test('online game route imports player summary and short-game rating fallback',async()=>{
   await browser.navigate('/play/online/42?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();
    const output=document.getElementById('chess-review-result');
    for(let i=0;i<300&&!output.textContent.includes('Game Review Complete');i++)await new Promise(r=>setTimeout(r,10));
    return {complete:output.textContent.includes('Game Review Complete'),cards:output.querySelectorAll('.chess-player-summary > div').length,insufficient:output.textContent.includes('Insufficient data')};
   });assert.deepEqual(result,{complete:true,cards:2,insufficient:true});
  });
  await t.test('explicit cancel restores controls without publishing an old review',async()=>{
   await browser.navigate('/analysis?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();let resolve,calls=0;
    window.testEngine=()=>{calls++;return new Promise(r=>resolve=r);};
    document.getElementById('chess-review-pgn').value='1. e4 e5 *';
    document.getElementById('chess-review-import').click();
    document.getElementById('chess-review-cancel').click();
    resolve({success:true,scoreCp:0,mate:null,depth:12,pv:[],candidates:[]});
    await new Promise(r=>setTimeout(r,30));
    return {calls,enabled:!document.getElementById('chess-review-import').disabled,canceled:document.getElementById('chess-review-result').textContent.includes('canceled'),stale:!!window.chessReviewResults};
   });assert.deepEqual(result,{calls:1,enabled:true,canceled:true,stale:false});
  });
  await t.test('progressive analysis updates preserve custom exploration and selected move',async()=>{
   await browser.navigate('/analysis');
   const result=await browser.evaluate(()=>{
    const g=new ChessReviewTest.Chess();g.loadPgn('1. e4 *');
    const board=ChessReviewTest.createReviewBoard(g.pgn(),[{grade:'good'}],[{whiteCp:0},{whiteCp:20}]);document.body.append(board.element);
    board.element.querySelector('[data-square="e7"]').click();board.element.querySelector('[data-square="e5"]').click();
    const before=board.element.querySelector('.chess-board-info').textContent;
    const updated=board.updateAnalysis([{grade:'best'}],[{whiteCp:0},{whiteCp:30}],()=>{});
    const after=board.element.querySelector('.chess-board-info').textContent;
    const pawn=board.element.querySelector('[data-square="e5"] img')?.alt;
    const ply=board.getCurrentPly();board.destroy();return {before,after,updated,pawn,ply};
   });assert.equal(result.updated,true);assert.equal(result.before,result.after);assert.equal(result.pawn,'Black p');assert.equal(result.ply,1);
  });
  await t.test('mate states display as mate on board and graph, never as 100 pawn scores',async()=>{
   await browser.navigate('/analysis');
   const result=await browser.evaluate(()=>{
    const g=new ChessReviewTest.Chess();g.loadPgn('1. f3 e5 2. g4 Qh4# 0-1');
    const rows=g.history({verbose:true}).map(m=>({grade:'good'}));
    const points=Array.from({length:5},(_,ply)=>({ply,whiteCp:ply===4?null:0,...(ply===4?{evaluation:{kind:'checkmate',outcome:-1}}:{})}));
    const board=ChessReviewTest.createReviewBoard(g.pgn(),rows,points);document.body.append(board.element);
    const label=board.element.querySelector('.chess-eval-text').textContent;
    const graph=ChessReviewTest.createEvaluationGraph(points,g.history().map(san=>({san,grade:'good'})),()=>{});document.body.append(graph);
    const circles=graph.querySelectorAll('circle');circles[4].dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const text=graph.textContent;board.destroy();return {label,text,invalid:graph.querySelector('path').getAttribute('d').includes('NaN')};
   });assert.equal(result.label,'Checkmated');assert.match(result.text,/Checkmated/);assert.doesNotMatch(result.text,/100\.00/);assert.equal(result.invalid,false);
  });
  await t.test('final JSON download captures authoritative lifecycle and elapsed time',async()=>{
   await browser.navigate('/analysis?content');
   const result=await browser.evaluate(async()=>{
    document.getElementById('chess-unlimited-review-btn').click();document.getElementById('chess-review-pgn').value='1. f3 e5 2. g4 Qh4# 0-1';document.getElementById('chess-review-import').click();
    const output=document.getElementById('chess-review-result');for(let i=0;i<300&&!window.chessReviewResults?.complete;i++)await new Promise(r=>setTimeout(r,10));
    let blob;const originalCreate=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=value=>{blob=value;return 'blob:test';};HTMLAnchorElement.prototype.click=function(){};
    [...output.querySelectorAll('button')].find(b=>b.textContent==='Download review JSON').click();
    const exported=JSON.parse(await blob.text());URL.createObjectURL=originalCreate;HTMLAnchorElement.prototype.click=originalClick;
    return {complete:exported.complete,state:exported.lifecycle.state,elapsed:exported.metrics.totalMs,plies:exported.reviewedMoves.length,terminal:exported.graphData.at(-1).evaluation.kind};
   });assert.equal(result.complete,true);assert.equal(result.state,'complete');assert.ok(result.elapsed>0);assert.equal(result.plies,4);assert.equal(result.terminal,'checkmate');
  });
  await t.test('actual Stockfish 19 Lite browser Worker initializes and searches WASM',async()=>{
   await browser.navigate('/analysis');
   const result=await browser.evaluate(()=>new Promise((resolve,reject)=>{
    const worker=new Worker('/engine/stockfish-19-lite-single.js'),timer=setTimeout(()=>{worker.terminate();reject(Error('WASM worker timeout'));},20000);let searched=false,depth=0;
    worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(Error(event.message));};
    worker.onmessage=event=>{for(const line of String(event.data).split('\n')){
     if(line==='uciok')worker.postMessage('isready');
     if(line==='readyok'&&!searched){searched=true;worker.postMessage('position startpos');worker.postMessage('go depth 8');}
     const match=line.match(/\bdepth (\d+)/);if(match)depth=Math.max(depth,Number(match[1]));
     if(line.startsWith('bestmove ')){clearTimeout(timer);worker.terminate();const move=line.split(' ')[1];const chess=new ChessReviewTest.Chess();chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});resolve({depth,legal:true});}
    }};worker.postMessage('uci');
   }));assert.equal(result.depth,8);assert.equal(result.legal,true);
  });
 }finally{await browser.close();}
});
