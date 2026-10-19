import {readFileSync,writeFileSync} from 'node:fs';
import {calculateAccuracyDetails,calculateReviewedMoveAccuracy} from '../src/grading.js';
import {evaluationChance} from '../src/evaluation.js';
const results=[];
for(const mode of ['before','after'])for(const id of ['20','42','80']){
 const report=JSON.parse(readFileSync(`test/evidence/v12/${mode}-${id}.json`)),rows=report.grades;
 const sides={};for(const color of ['w','b']){
  const own=rows.filter(r=>r.color===color),accuracy=own.map(r=>r.accuracyContribution),harmonic=accuracy.some(a=>a===0)?0:accuracy.length/accuracy.reduce((s,a)=>s+1/a,0);
  const nontrivial=own.filter(r=>r.beforeEvaluation?.kind==='cp' && evaluationChance(r.beforeEvaluation)>.05 && evaluationChance(r.beforeEvaluation)<.95);
  sides[color]={includedMoves:own.length,selected:color==='w'?report.whiteAccuracy:report.blackAccuracy,arithmetic:accuracy.reduce((a,b)=>a+b,0)/accuracy.length,harmonic,
    nontrivialSubsetDiagnostic:nontrivial.length?{count:nontrivial.length,arithmetic:nontrivial.reduce((sum,r)=>sum+r.accuracyContribution,0)/nontrivial.length}:null};
 }
 results.push({mode,id,sides});
}
const full=JSON.parse(readFileSync('test/evidence/v12/final-report.json'));
const decomposition={};for(const color of ['w','b']){
 const projected=full.reviewedMoves.map(row=>({...row,beforeEvaluation:undefined,afterEvaluation:undefined,positionBeforeEvaluation:undefined,positionAfterEvaluation:undefined,
  beforePlayerCp:row.beforePlayerCp??(evaluationChance(row.beforeEvaluation)>.5?10000:-10000),afterPlayerCp:row.afterPlayerCp??(evaluationChance(row.afterEvaluation)>.5?10000:-10000),
  positionBeforeWhiteCp:row.positionBeforeWhiteCp??(evaluationChance(row.positionBeforeEvaluation)>.5?10000:-10000),positionAfterWhiteCp:row.positionAfterWhiteCp??(evaluationChance(row.positionAfterEvaluation)>.5?10000:-10000)}));
 const details=calculateAccuracyDetails(full.reviewedMoves,color),legacyProjection=calculateAccuracyDetails(projected,color);
 decomposition[color]={selected:details.value,legacySentinelProjection:legacyProjection.value,typedVsSentinelDifference:details.value-legacyProjection.value,
  priorV11:color==='w'?68.34474981611713:68.84142934672248,moveCount:details.contributions.length,contributions:details.contributions};
}
writeFileSync('test/evidence/v12/accuracy-analysis.json',JSON.stringify({scope:'Numeric diagnostics, not empirical Elo/Chess.com calibration. Sentinel projection exists only here as a legacy counterfactual, never production display or grading. Nontrivial-only arithmetic is a subset diagnostic, not a replacement game accuracy.',results,decomposition},null,2)+'\n');
