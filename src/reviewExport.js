import {completeRootLine} from './tactics.js';
import {normalizeEvaluation} from './evaluation.js';
import {Chess} from 'chess.js';
import {GRADES,calculateAccuracy,calculateReviewedMoveAccuracy} from './grading.js';
import {evaluationCp,evaluationChance} from './evaluation.js';

export function validateReviewExport(report) {
  const errors=[],warnings=[];const game=new Chess();let history=[];
  try{game.loadPgn(report?.pgn);history=game.history({verbose:true});}catch(error){return {valid:false,errors:['Invalid PGN: '+error.message],warnings};}
  const rows=report.reviewedMoves;
  if(!Array.isArray(rows)||rows.length!==history.length)errors.push('Reviewed ply count does not match PGN');
  for(const [i,move] of history.entries()){
    const row=rows?.[i];if(!row)continue;
    if(row.uci!==move.from+move.to+(move.promotion||'')||row.san!==move.san||row.color!==move.color||row.number!==Number(move.before.split(' ')[5]))errors.push(`Move identity mismatch at ply ${i+1}`);
    if(row.beforeFen!==move.before||row.afterFen!==move.after)errors.push(`Board mismatch at ply ${i+1}`);
    if(!GRADES[row.grade])errors.push(`Invalid grade at ply ${i+1}`);
    for(const field of ['beforeEvaluation','afterEvaluation'])if(row[field]){
      if(evaluationChance(row[field])==null)errors.push(`Unknown/invalid ${field} at ply ${i+1}`);
      const cpField=field==='beforeEvaluation'?'beforePlayerCp':'afterPlayerCp';
      if(row[cpField]!==evaluationCp(row[field]))errors.push(`Typed score/scalar mismatch at ply ${i+1}`);
    }
    for(const prefix of ['Before','After'])if(row['position'+prefix+'Evaluation']){
      const e=row['position'+prefix+'Evaluation'],cp=evaluationCp(e),scalar=row['position'+prefix+'WhiteCp'];
      if(evaluationChance(e)==null || scalar!==cp)errors.push(`Position score mismatch at ply ${i+1}`);
      const moverCp=cp===null?null:cp*(move.color==='w'?1:-1);
      if(row['position'+prefix+'Cp']!==moverCp)errors.push(`Mover perspective mismatch at ply ${i+1}`);
    }
    if(row.qualityEvidence && row.beforeEvaluation){
      const q=row.qualityEvidence,best=q.rootBestLine,played=q.playedLine;
      if(!completeRootLine(best,move.before,q.depth)||!completeRootLine(played,move.before,q.depth)||played.move!==row.uci||best.rank!==1)errors.push(`Quality root evidence invalid at ply ${i+1}`);
      else {
        const matches=(a,b)=>a.kind===b.kind && (a.kind==='cp'?a.cp===b.cp:a.kind==='mate'?a.moves===b.moves:true);
        if(!matches(normalizeEvaluation(best),row.beforeEvaluation))errors.push(`Best-score perspective mismatch at ply ${i+1}`);
        if(!['draw','checkmate'].includes(row.afterEvaluation.kind) && !matches(normalizeEvaluation(played),row.afterEvaluation))errors.push(`Played-score perspective mismatch at ply ${i+1}`);
      }
    }
    if(row.beforeEvaluation && (row.beforeEvaluation.kind!=='cp'||row.afterEvaluation?.kind!=='cp') && row.cpLoss!==null)errors.push(`Mate/draw state has numeric cpLoss at ply ${i+1}`);
    if(!row.beforeEvaluation && [row.beforePlayerCp,row.afterPlayerCp].some(n=>Math.abs(n)===10000))warnings.push(`Legacy mate sentinel is ambiguous at ply ${i+1}; reverify with engine`);
    const accuracy=calculateReviewedMoveAccuracy(row);
    if(accuracy===null||!Number.isFinite(row.accuracyContribution)||Math.abs(accuracy-row.accuracyContribution)>1e-7)errors.push(`Accuracy contribution mismatch at ply ${i+1}`);
  }
  if(rows?.length===history.length)for(const [color,field] of [['w','whiteAccuracy'],['b','blackAccuracy']]){
    const actual=calculateAccuracy(rows,color);if(actual!==null && Math.abs(actual-report[field])>1e-7)errors.push(`Accuracy aggregate mismatch for ${color}`);
  }
  const result=game.header().Result;
  if(game.isCheckmate() && result!==(game.turn()==='w'?'0-1':'1-0'))errors.push('Result contradicts final mate');
  if(report.headers?.Result && report.headers.Result!==result)errors.push('Export header result differs from PGN');
  if(report.complete===true && report.lifecycle && (report.lifecycle.state!=='complete'||!report.lifecycle.finalAnalysisComplete))errors.push('Non-final lifecycle marked complete');
  if(report.complete===true && !(report.metrics?.totalMs>0))errors.push('Final export has no elapsed duration');
  if(report.complete===false && !report.lifecycle)warnings.push('Legacy incomplete export has no lifecycle; its 42 records do not prove final analysis');
  if(report.metrics?.totalMs===0 && report.metrics?.requestMs>0)warnings.push('Legacy live metrics contain work but totalMs was not snapshotted');
  const metrics=report.metrics||{};
  for(const [key,value] of Object.entries(metrics))if(key.endsWith('Ms') && value!=null && (!Number.isFinite(value)||value<0))errors.push(`Invalid duration ${key}`);
  if(report.schemaVersion>=2){
    const tolerance=Math.max(10,metrics.requests||0);
    if(metrics.requestMs>metrics.totalMs+tolerance)errors.push('Request wall time exceeds snapshot elapsed time');
    if(metrics.engineMs>metrics.requestMs+tolerance)errors.push('Engine time exceeds awaited request time');
    if(report.complete!==Boolean(report.lifecycle?.finalAnalysisComplete))errors.push('Complete flag disagrees with final-analysis lifecycle');
  }
  return {valid:errors.length===0,errors,warnings,game:{plies:history.length,whitePlies:history.filter(m=>m.color==='w').length,blackPlies:history.filter(m=>m.color==='b').length,initialFen:history[0]?.before,finalFen:game.fen(),checkmate:game.isCheckmate(),result}};
}

export function redactReviewExport(report) {
  const game=new Chess();game.loadPgn(report.pgn);const headers=game.header(),clean=new Chess(headers.FEN||undefined);
  for(const key of ['Result','WhiteElo','BlackElo','TimeControl','SetUp','FEN'])if(headers[key]!=null)clean.header(key,headers[key]);
  clean.header('White','White player','Black','Black player');for(const move of game.history())clean.move(move);
  const allowed=['schemaVersion','scorePerspectives','reviewedMoves','graphData','whiteAccuracy','blackAccuracy','performance','metrics','lifecycle','complete','options','verifications','searchLog','timingDefinitions'];
  const output=Object.fromEntries(allowed.filter(key=>report[key]!==undefined).map(key=>[key,structuredClone(report[key])]));
  output.pgn=clean.pgn();output.headers=clean.header();
  const identities=[headers.White,headers.Black].filter(name=>name && name!=='?' && name.length>2);
  const scrub=value=>{
    if(typeof value==='string'){for(const name of identities)value=value.replaceAll(name,'Player');return value;}
    if(Array.isArray(value))return value.map(scrub);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/url|country|title|avatar|token|email/i.test(key)).map(([key,v])=>[key,scrub(v)]));
    return value;
  };
  return scrub(output);
}
