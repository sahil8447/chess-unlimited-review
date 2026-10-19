import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estimatePerformance} from '../src/performanceRating.js';
import {detectChessComGame} from '../src/chesscomPgn.js';
const moves = (loss=5) => Array.from({length:60}, (_,i)=>({color:i%2?'b':'w',number:Math.floor(i/2)+1,beforePlayerCp:0,afterPlayerCp:-loss,legalChoices:25,grade:loss>150?'blunder':'good'}));
const args = {moves:moves(),color:'w',headers:{Result:'1-0',WhiteElo:'1400',BlackElo:'1400'},complete:true};
test('performance is deterministic, bounded and separates strong and weak decisions',()=>{
 const strong=estimatePerformance(args), weak=estimatePerformance({...args,moves:moves(300)});
 assert.ok(strong.rating>weak.rating);assert.ok(strong.rating<=2800&&weak.rating>=400);assert.deepEqual(strong,estimatePerformance(args));
});
test('performance is color symmetric and result does not set rating',()=>{
 assert.deepEqual(estimatePerformance(args),estimatePerformance({...args,color:'b'}));
 assert.deepEqual(estimatePerformance(args),estimatePerformance({...args,headers:{...args.headers,Result:'0-1'}}));
});
for(const [name,change] of Object.entries({short:{moves:moves().slice(0,10)},unfinished:{headers:{Result:'*'}},abandoned:{headers:{Result:'1-0',Termination:'abandoned'}},incomplete:{complete:false},custom:{customStart:true},forced:{moves:moves().map(m=>({...m,legalChoices:1}))},recaptures:{moves:moves().map(m=>({...m,obviousRecapture:true}))},terminal:{moves:[]},missing:{moves:moves().map(m=>({...m,afterPlayerCp:null}))},decided:{moves:moves().map(m=>({...m,beforePlayerCp:1e20}))}}))test(`performance withholds ${name} evidence`,()=>assert.equal(estimatePerformance({...args,...change}).rating,null));
test('missing ratings use explicit neutral prior and wider uncertainty',()=>{
 const unknown=estimatePerformance({...args,headers:{Result:'1-0'}});assert.equal(unknown.prior,1500);assert.equal(unknown.confidence,'Low');assert.ok(unknown.uncertainty>estimatePerformance(args).uncertainty);
});
test('easy moves cannot inflate the estimate and independent games do not share state',()=>{
 const first=estimatePerformance(args);const easy=estimatePerformance({...args,moves:moves().map(m=>({...m,number:1}))});assert.equal(easy.confidence,'Low');
 estimatePerformance({...args,moves:moves(300)});assert.deepEqual(estimatePerformance(args),first);
});
for(const [path,type,id] of [['/game/live/42','live','42'],['/analysis/game/daily/9','daily','9'],['/play/online/123','live','123'],['/game/live/42/analysis','live','42']])test(`game identity ${path}`,()=>assert.deepEqual(detectChessComGame(path),{type,id}));
test('unsupported routes cannot invent a game identity',()=>{for(const path of ['/games/archive','/play/online','/play/computer/42','/game/live/42oops'])assert.equal(detectChessComGame(path),null);});
