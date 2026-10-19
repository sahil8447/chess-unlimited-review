// Explicit opening sequences and tactical FENs, never historical game attribution
// or assertions of proprietary Brilliant labels. All moves are replayed legally.
export const calibrationPositions = [
 {id:'queens-gambit',kind:'sound',moves:'d4 d5',move:'c4',accept:'dxc4',continuation:'e3',description:'Pawn offer for central control and development'},
 {id:'reti-gambit',kind:'sound',moves:'Nf3 d5',move:'c4',accept:'dxc4',continuation:'e3',description:'Flank pawn offer for central play'},
 {id:'evans-gambit',kind:'sound',moves:'e4 e5 Nf3 Nc6 Bc4 Bc5',move:'b4',accept:'Bxb4',continuation:'c3',description:'Pawn offer gains a tempo against the bishop'},
 {id:'benko-gambit',kind:'sound',moves:'d4 Nf6 c4 c5 d5',move:'b5',accept:'cxb5',continuation:'a6',description:'Black pawn offer opens queenside files'},
 {id:'marshall-attack',kind:'sound',moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3',move:'d5',accept:'exd5',continuation:'Nxd5 Nxe5 Nxe5 Rxe5 c6',description:'Pawn investment for development and kingside initiative'},
 {id:'catalan-pawn-offer',kind:'sound',moves:'d4 Nf6 c4 e6 Nf3 d5',move:'g3',accept:'dxc4',continuation:'Bg2',description:'Offers the c4 pawn by developing a different piece'},
 {id:'hung-queen',kind:'negative',moves:'e4 e5 Qh5 Nc6 Bc4 Nf6',move:'Qxe5+',accept:'Nxe5',description:'Queen takes a pawn and is lost to the knight'},
 {id:'hung-rook',kind:'negative',fen:'4k3/8/8/8/8/8/7q/R1K5 w - - 0 1',move:'Ra2',accept:'Qxa2',description:'Uncompensated rook offer'},
 {id:'ordinary-exchange',kind:'negative',moves:'e4 e5 Nf3 Nc6 Bb5 a6',move:'Bxc6',accept:'dxc6',description:'Ordinary bishop for knight exchange'},
 {id:'ordinary-pawn-capture',kind:'negative',moves:'e4 d5',move:'exd5',accept:'Qxd5',description:'Ordinary equal pawn exchange'},
 {id:'winning-rook-blunder',kind:'negative',fen:'r2q1rk1/ppp2ppp/2n5/8/2B5/2N5/PPP2PPP/R2QRRK1 w - - 0 1',move:'Re5',accept:'Nxe5',description:'Needlessly offers a rook from a materially winning position'}
];
