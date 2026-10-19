import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {fetchCurrentChessComPgn} from '../src/chesscomPgn.js';
import {classifyMove,classifyTacticalMove,classifyBrilliantMove as legacyBrilliant,calculateAccuracy,calculateMoveAccuracy,calculateAlternativeLoss,GRADES} from '../src/grading.js';
import {detectMissedOpportunity} from '../src/missDetection.js';
import {generateMoveExplanation} from '../src/moveExplanation.js';
const chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=';
const index=square=>'abcdefgh'.indexOf(square[0])+8*(Number(square[1])-1);
const encode=(from,to)=>chars[index(from)]+chars[index(to)];
function stubFetch(t,game){const originalFetch=globalThis.fetch,originalLocation=globalThis.location;globalThis.location={pathname:'/game/live/42'};let requested;globalThis.fetch=async(url,options)=>{requested={url,options};return {ok:true,json:async()=>({game})};};t.after(()=>{globalThis.fetch=originalFetch;if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;});return ()=>requested;}
function replay(pgn){const game=new Chess();game.loadPgn(pgn);return game;}
test('legal PGN replay supports SAN, castling, en passant, ratings and results',()=>{
 const game=replay('[WhiteElo "1037"]\n[BlackElo "1020"]\n[Result "1-0"]\n\n1. e4 a6 2. e5 d5 3. exd6 cxd6 4. Nf3 Nf6 5. Be2 e6 6. O-O 1-0');
 assert.equal(game.header().WhiteElo,'1037');assert.equal(game.header().Result,'1-0');assert.ok(game.history({verbose:true}).some(m=>m.flags.includes('e')));assert.equal(game.get('g1').type,'k');
});
test('custom black-to-move FEN and promotion replay keep move numbers',()=>{
 const game=replay('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n\n23... a1=Q+ *');
 const move=game.history({verbose:true})[0];assert.equal(move.color,'b');assert.equal(move.promotion,'q');assert.equal(move.before.split(' ')[5],'23');assert.equal(game.get('a1').type,'q');
});
test('terminal mate and stalemate are distinct from an empty game',()=>{
 assert.equal(replay('1. f3 e5 2. g4 Qh4# 0-1').isCheckmate(),true);
 assert.equal(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').isStalemate(),true);
 assert.equal(new Chess().isGameOver(),false);assert.throws(()=>replay('1. e5 *'));
});
test('Chess.com callback reconstructs game and forwards cancellation securely',async t=>{
 const request=stubFetch(t,{pgnHeaders:{White:'A',Black:'B',WhiteElo:1037,Result:'0-1'},moveList:encode('f2','f3')+encode('e7','e5')+encode('g2','g4')+encode('d8','h4')});
 const controller=new AbortController(),pgn=await fetchCurrentChessComPgn({signal:controller.signal});
 assert.equal(replay(pgn).isCheckmate(),true);assert.equal(replay(pgn).header().WhiteElo,'1037');
 assert.equal(request().url,'/callback/live/game/42');assert.equal(request().options.credentials,'same-origin');assert.equal(request().options.signal,controller.signal);
});
test('Chess.com king-to-rook castling encoding is converted legally',async t=>{
 const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
 stubFetch(t,{pgnHeaders:{FEN:fen,SetUp:'1',Result:'1-0'},moveList:encode('e1','h1')+encode('e8','a8')});
 const game=replay(await fetchCurrentChessComPgn());assert.deepEqual(game.history(),['O-O','O-O-O']);
});
test('Chess.com promotion encoding respects a custom black starting FEN',async t=>{
 // Destination 65 encodes a queen promotion straight ahead for a2.
 stubFetch(t,{pgnHeaders:{FEN:'7k/8/8/8/8/8/p7/7K b - - 0 23',SetUp:'1',Result:'0-1'},moveList:chars[index('a2')]+chars[65]});
 const game=replay(await fetchCurrentChessComPgn());assert.equal(game.get('a1').type,'q');assert.equal(game.history()[0],'a1=Q+');
});
for(const [name,game] of Object.entries({unfinished:{pgnHeaders:{Result:'*'},moveList:'ab'},odd:{pgnHeaders:{Result:'1-0'},moveList:'a'},illegal:{pgnHeaders:{Result:'1-0'},moveList:encode('e2','e5')},missing:null}))test(`Chess.com ${name} response gives a recoverable error`,async t=>{
 stubFetch(t,game);await assert.rejects(fetchCurrentChessComPgn());
});
test('unsupported Chess.com URL and HTTP failure are explicit',async t=>{
 stubFetch(t,{});globalThis.location.pathname='/analysis';await assert.rejects(fetchCurrentChessComPgn(),/completed Chess.com/);
 globalThis.location.pathname='/game/daily/42';globalThis.fetch=async()=>({ok:false,status:503});await assert.rejects(fetchCurrentChessComPgn(),/503/);
});
for(const [cp,expected] of [[-10,'good'],[-60,'inaccuracy'],[-120,'mistake'],[-300,'blunder']])test(`move loss classifies ${expected} deterministically`,()=>{
 const args={beforeCp:0,afterCp:cp,bestMovePlayed:false};assert.equal(classifyMove(args).grade,expected);assert.deepEqual(classifyMove(args),classifyMove(args));
});
test('best and excellent grades remain available and all grade metadata exists',()=>{
 assert.equal(classifyMove({beforeCp:0,afterCp:0,bestMovePlayed:true}).grade,'best');assert.equal(classifyMove({beforeCp:0,afterCp:0,bestMovePlayed:false}).grade,'excellent');
 for(const grade of ['brilliant','great','best','excellent','good','inaccuracy','mistake','miss','blunder'])assert.ok(GRADES[grade].label);
});
test('accuracy preserves percent-point units, color symmetry and missing-data handling',()=>{
 assert.ok(calculateMoveAccuracy(0,0)>99);assert.ok(calculateMoveAccuracy(0,-300)<calculateMoveAccuracy(0,-50));
 const moves=[{color:'w',beforePlayerCp:0,afterPlayerCp:-50},{color:'b',beforePlayerCp:50,afterPlayerCp:20}];
 const mirrored=moves.map(m=>({...m,color:m.color==='w'?'b':'w'}));
 assert.equal(calculateAccuracy(moves,'w'),calculateAccuracy(mirrored,'b'));assert.equal(calculateAccuracy([], 'w'),null);
 assert.equal(calculateAccuracy([{...moves[0],afterPlayerCp:null}],'w'),null);
});
test('Great requires a critical best move and complete same-depth alternatives',()=>{
 const args={baseGrade:'best',bestMovePlayed:true,beforeCp:0,afterCp:0,alternativeLoss:.2};
 assert.equal(classifyTacticalMove(args),'great');assert.equal(classifyTacticalMove({...args,bestMovePlayed:false}),'best');
 const candidates=[{rank:1,depth:18,scoreCp:0},{rank:2,depth:18,scoreCp:-300}];assert.ok(calculateAlternativeLoss(candidates)>.1);
 assert.equal(calculateAlternativeLoss([candidates[0],{...candidates[1],depth:17}]),null);assert.equal(calculateAlternativeLoss([candidates[0],{...candidates[1],bound:true}]),null);
 assert.equal(calculateAlternativeLoss([{...candidates[0],scoreCp:null,mate:0},candidates[1]]),null);
});
test('legacy boolean-only Brilliant path cannot award badges',()=>{
 for(const baseGrade of ['best','good','inaccuracy','mistake','blunder'])assert.equal(legacyBrilliant({baseGrade,isVerifiedSacrifice:true,beforeCp:0,afterCp:0,bestMovePlayed:true,rating:700}),baseGrade);
});
test('Miss detects a legal material-winning continuation, not normal eval loss',()=>{
 const beforeFen='4k3/8/8/8/8/8/q7/R3K3 w Q - 0 1';
 const args={beforeFen,bestVariation:['a1a2','e8e7','a2a7'],bestMovePlayed:false,beforePlayerCp:500,afterPlayerCp:0,color:'w'};
 const result=detectMissedOpportunity(args);assert.equal(result.grade,'miss');assert.ok(result.materialGain>=9);
 assert.equal(detectMissedOpportunity({...args,bestMovePlayed:true}),null);assert.equal(detectMissedOpportunity({...args,bestVariation:['a1a2','e8e7']}),null);assert.equal(detectMissedOpportunity({...args,afterPlayerCp:450}),null);
});
test('explanations use legal best SAN and recognize actual terminal mate',()=>{
 const game=new Chess();for(const san of ['f3','e5','g4'])game.move(san);const beforeFen=game.fen(),move=game.move('Qh4#');
 const text=generateMoveExplanation({move,grade:'best',beforeFen,afterFen:game.fen(),bestMove:'d8h4',bestMovePlayed:true,beforePlayerCp:10000,afterPlayerCp:10000});assert.match(text,/checkmate/);
});
test('Miss rejects an illegal tail even after three material-winning PV plies',()=>{
 const result=detectMissedOpportunity({beforeFen:'4k3/8/8/8/8/8/q7/R3K3 w Q - 0 1',bestVariation:['a1a2','e8e7','a2a7','a1a8'],bestMovePlayed:false,beforePlayerCp:500,afterPlayerCp:0,color:'w'});
 assert.equal(result,null);
});
