import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {lookupBook} from '../src/openingBook.js';
test('local opening book is reproducibly derived from attributed, legal CC0 source lines',()=>{
 const sources=JSON.parse(readFileSync('data/openings/SOURCES.json','utf8')),expected={};let count=0;
 for(const source of sources.sources){
  const bytes=readFileSync('data/openings/'+source.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  for(const row of bytes.toString().trim().split('\n').slice(1)){
   const [eco,name,pgn]=row.split('\t'),game=new Chess();game.loadPgn(pgn);count++;let ply=0;
   for(const move of game.history({verbose:true})){ply++;const key=move.before.split(' ').slice(0,4).join(' ')+'|'+move.from+move.to+(move.promotion||'');if(!expected[key])expected[key]=[eco,name,ply];else expected[key][2]=Math.max(expected[key][2],ply);}
  }
 }
 assert.equal(count,3865);assert.deepEqual(JSON.parse(readFileSync('src/openingBookData.json','utf8')),expected);
 const g=new Chess();const fields=g.fen().split(' ');fields[5]='60';assert.equal(lookupBook(fields.join(' '),'e2e4'),null,'do not extend opening labels past recorded source coverage');
});
