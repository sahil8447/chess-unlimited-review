import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {runV1Review} from '../test/helpers/v1-review.mjs';
import {startTransport} from './engine-transport.mjs';
const pgn=readFileSync(process.argv[2]||'test/games/rafael-ayden-2026.pgn','utf8');
const engine=startTransport({source:'test/helpers/v1-offscreen.txt'}),start=performance.now();
try {const report=await runV1Review(pgn,engine.evaluate);report.elapsedMs=performance.now()-start;report.transport=engine.metrics;report.cacheHits=engine.metrics.requests-engine.metrics.searches;
const game=new Chess();game.loadPgn(pgn);report.identity={plies:game.history().length,finalFen:game.fen(),mate:game.isCheckmate(),headers:game.header()};
writeFileSync(process.argv[3]||'test/evidence/v1-supplied.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({elapsedMs:report.elapsedMs,white:report.whiteAccuracy,black:report.blackAccuracy,metrics:engine.metrics}));
}finally{engine.close();}
