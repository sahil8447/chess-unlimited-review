import book from './openingBookData.json' with {type:'json'};
export function lookupBook(fen,uci){
  if(typeof fen!=='string'||typeof uci!=='string')return null;
  const entry=book[fen.split(' ').slice(0,4).join(' ')+'|'+uci];
  const ply=2*(Number(fen.split(' ')[5])-1)+(fen.split(' ')[1]==='b'?2:1);
  return entry && Number.isInteger(ply) && ply<=entry[2]?{eco:entry[0],name:entry[1],source:'lichess-org/chess-openings (CC0)'}:null;
}
