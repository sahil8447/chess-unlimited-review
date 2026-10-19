// Positions are derived by replaying complete sourced historical PGNs, not by
// reconstructing positions from images or assigning proprietary grade labels.
export const piecePositions=[
 {id:'opera-knight',file:'morphy-opera.pgn',ply:18,move:'Nxb5',piece:'n',accept:'cxb5',continuation:'Bxb5+'},
 {id:'opera-rook',file:'morphy-opera.pgn',ply:24,move:'Rxd7',piece:'r',accept:'Rxd7',continuation:'Rd1'},
 {id:'opera-queen',file:'morphy-opera.pgn',ply:30,move:'Qb8+',piece:'q',accept:'Nxb8',continuation:'Rd8#'},
 {id:'deep-blue-knight',file:'deep-blue-kasparov-1997-game6.pgn',ply:14,move:'Nxe6',piece:'n',accept:'fxe6',continuation:'Bg6+'},
 {id:'deep-blue-bishop',file:'deep-blue-kasparov-1997-game6.pgn',ply:32,move:'Bf5',piece:'b',accept:'exf5',continuation:'Rxe7'},
 {id:'fischer-exchange',file:'fischer-spassky-1972-game6.pgn',ply:74,move:'Rxf6',piece:'r',accept:'gxf6',continuation:'Rxf6'},
];
