import {Chess} from 'chess.js';
import {readFileSync,writeFileSync} from 'node:fs';
const book={};let lines=0,maxPly=0;
for(const code of 'abcde')for(const row of readFileSync(`data/openings/${code}.tsv`,'utf8').trim().split('\n').slice(1)){
 const [eco,name,pgn]=row.split('\t');const game=new Chess();game.loadPgn(pgn);const history=game.history({verbose:true});lines++;maxPly=Math.max(maxPly,history.length);
 let ply=0;
 for(const move of history){ply++;const key=move.before.split(' ').slice(0,4).join(' ')+'|'+move.from+move.to+(move.promotion||'');if(!book[key])book[key]=[eco,name,ply];else book[key][2]=Math.max(book[key][2],ply);}
}
writeFileSync('src/openingBookData.json',JSON.stringify(book)+'\n');
console.log(JSON.stringify({lines,positions:Object.keys(book).length,maxPly}));
