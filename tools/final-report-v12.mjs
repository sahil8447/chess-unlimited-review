import {readFileSync,writeFileSync} from 'node:fs';
import {createReport} from './review-report.mjs';
import {validateReviewExport,redactReviewExport} from '../src/reviewExport.js';
const pgn=readFileSync('test/games/rafael-ayden-2026.pgn','utf8');
const report=await createReport(pgn);
const validation=validateReviewExport(report);if(!validation.valid)throw Error(validation.errors.join('\n'));
const clean=redactReviewExport(report);clean.validation=validation;clean.source={kind:'new-engine-reproduction-not-user-browser-export',base:'e5c16022e20f1206441a5db7c62cb44be0c7ab0d'};
writeFileSync('test/evidence/v12/final-report.json',JSON.stringify(clean,null,2)+'\n');
console.log(JSON.stringify({validation,accuracy:[report.whiteAccuracy,report.blackAccuracy],elapsedMs:report.elapsedMs,transport:report.transport,tail:report.reviewedMoves.slice(-4).map(m=>({move:m.san,grade:m.grade,before:m.beforeEvaluation,after:m.afterEvaluation,transition:m.mateEvidence,loss:m.loss,cpLoss:m.cpLoss}))}));
