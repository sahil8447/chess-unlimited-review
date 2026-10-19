import { Chess } from 'chess.js';

export const VALUES = {p:100,n:320,b:330,r:500,q:900,k:0};
export const MATERIAL_LIMITS = Object.freeze({minimumCost:75,maxCaptures:4,maxExchangePlies:8,maxExchangeNodes:256});
export function materialBalance(chess, color) {
  let cp = 0;
  for (const row of chess.board()) for (const piece of row) {
    if (piece) cp += (piece.color === color ? 1 : -1) * VALUES[piece.type];
  }
  return cp / 100;
}
export const materialCp = (chess,color) => Math.round(materialBalance(chess,color)*100);
export const uciOf = move => move.from + move.to + (move.promotion || '');
export function playUci(chess,uci) {
  if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Invalid PV move');
  return chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
}
function after(chess,move) { const copy = new Chess(chess.fen());playUci(copy,uciOf(move));return copy; }

// This is deliberately only a cheap candidate filter. Actual captures, net
// material relative to BEFORE the move, engine soundness and quality still gate
// eligibility. An attacked piece, defended piece or equal trade is not proof.
export function findMaterialOffers(chess,move,beforeFen=move?.before) {
  if (!chess || !move || !beforeFen || chess.isGameOver() || chess.turn()===move.color) return [];
  const baseline = materialCp(new Chess(beforeFen),move.color);
  return chess.moves({verbose:true}).filter(capture => capture.captured &&
    baseline-materialCp(after(chess,capture),move.color) >= MATERIAL_LIMITS.minimumCost);
}

// Static threat comparison, NOT a legal pass or a claimed game continuation.
// Changing the turn lets chess.js test the attacker's king safety and pins.
function threatPosition(position,color) {
  if(position.turn()===color)return new Chess(position.fen());
  const fields=position.fen().split(' ');fields[1]=color;fields[3]='-';
  return new Chess(fields.join(' '));
}
function offerCausality({before,chess,move,capture,offeredSquare,materialCostCp}) {
  if(offeredSquare===move.to)return {supported:true,kind:'moved-unit',beforeCapturable:false,reason:'The move placed the offered unit on its captured square'};
  const unit=before.get(offeredSquare),present=chess.get(offeredSquare),opponent=chess.turn();
  if(!unit || !present || unit.color!==move.color || unit.type!==present.type)return {supported:false,kind:'unknown',reason:'Offered-unit identity is not established'};
  const previous=threatPosition(before,opponent);
  const previousCaptures=previous.moves({verbose:true}).filter(reply=>reply.captured && reply.to===offeredSquare && reply.captured===unit.type);
  if(!previousCaptures.length)return {supported:true,kind:'new-legal-offer',beforeCapturable:false,reason:'No king-safe capture of this unit was available in the before-position threat comparison'};
  const prior=previousCaptures.map(oldCapture=>inspectMaterialOffer({before,chess:previous,move,capture:oldCapture,causalCheck:false}));
  if(prior.some(item=>!item.materialTraceComplete))return {supported:false,kind:'unknown',beforeCapturable:true,reason:'Before-position exchange evidence exhausted its budget'};
  const beforeCostCp=Math.max(...prior.map(item=>item.materialCostCp));
  if(materialCostCp-beforeCostCp>=MATERIAL_LIMITS.minimumCost)return {supported:true,kind:'increased-investment',beforeCapturable:true,beforeCostCp,reason:'The move materially increased the loss after legal acceptance'};
  // Narrow maintained-offer case: a voluntary pawn move opens a previously
  // unavailable home-bishop development route while declining a legal central
  // pawn exchange that removes the threat. Compensation is still engine-gated.
  // Check evasions and arbitrary quiet moves do not satisfy this relation.
  const canExchange=before.moves({verbose:true}).some(reply=>reply.from===offeredSquare && reply.to===capture.from && reply.captured==='p');
  if(!before.isCheck() && !chess.isCheck() && move.piece==='p' && unit.type==='p' && capture.piece==='p' && canExchange){
    const home=move.color==='w'?'1':'8';
    const development=position=>position.moves({verbose:true}).filter(reply=>reply.piece==='b' && reply.from[1]===home && reply.to[1]!==home && !reply.captured).map(uciOf);
    const oldRoutes=new Set(development(before)),newRoutes=development(threatPosition(chess,move.color)).filter(uci=>!oldRoutes.has(uci));
    if(newRoutes.length)return {supported:true,kind:'maintained-development-gambit',beforeCapturable:true,beforeCostCp,newDevelopmentMoves:newRoutes,reason:'Voluntary development preparation maintains a central pawn investment instead of exchanging the attacker'};
  }
  return {supported:false,kind:'pre-existing-unrelated-threat',beforeCapturable:true,beforeCostCp,reason:'The same unit was already capturable for comparable material; the move supplies no supported offer causality'};
}

// Resolve direct recaptures, then at most one additional opponent-initiated
// exchange on another square (e.g. ...Nxd5 Nxe5 Nxe5 Rxe5 in the Marshall).
// Both sides may stop an exchange when not in check. All recorded continuations
// are legal. This local material minimax is NOT a full tactical engine or proof
// that its chosen line is forced. Stockfish separately verifies compensation.
export function inspectMaterialOffer({before,chess,move,capture,causalCheck=true}) {
  const mover=move.color,baseline=materialCp(before,mover),taken=after(chess,capture);
  let nodes=0,complete=true;
  const leaf = position => ({cp:materialCp(position,mover),line:[],trace:[]});
  function choose(position,options) {
    const maximize=position.turn()===mover;
    return options.reduce((best,item)=>{
      if (!best || (maximize ? item.cp>best.cp : item.cp<best.cp) ||
          (item.cp===best.cp && item.line.length>best.line.length)) return item;
      return best;
    },null);
  }
  function descend(position,reply,next) {
    const copy=after(position,reply),result=next(copy);
    return {cp:result.cp,line:[uciOf(reply),...result.line],trace:[{san:reply.san,fen:copy.fen(),materialCp:materialCp(copy,mover)},...result.trace]};
  }
  function exchange(position,target,plies) {
    if (nodes>=MATERIAL_LIMITS.maxExchangeNodes) {complete=false;return leaf(position);}
    nodes++;
    if (position.isGameOver()) return leaf(position);
    const legal=position.moves({verbose:true});
    const captures=legal.filter(reply=>reply.captured && reply.to===target);
    if (plies===0) {if(captures.length || position.isCheck())complete=false;return leaf(position);}
    const options=[];
    if (!position.isCheck()) options.push(leaf(position));
    else for(const reply of legal.filter(reply=>!reply.captured || reply.to!==target)) {
      // A legal check evasion ends this local exchange; never invent a pass.
      options.push(descend(position,reply,leaf));
    }
    for(const reply of captures)options.push(descend(position,reply,copy=>exchange(copy,target,plies-1)));
    return choose(position,options) || leaf(position);
  }
  function opponentExchange(position) {
    const options=[];
    if (!position.isCheck()) options.push(leaf(position));
    const legal=position.moves({verbose:true});
    for(const reply of legal) {
      if (reply.captured) options.push(descend(position,reply,copy=>exchange(copy,reply.to,MATERIAL_LIMITS.maxExchangePlies-2)));
      else if (position.isCheck()) options.push(descend(position,reply,leaf));
      if (nodes>MATERIAL_LIMITS.maxExchangeNodes) break;
    }
    return choose(position,options) || leaf(position);
  }
  let bestImmediate=materialCp(taken,mover);
  const recaptures=taken.moves({verbose:true}).filter(reply=>reply.captured && reply.to===capture.to);
  const options=taken.isCheck() ? taken.moves({verbose:true}).filter(reply=>!reply.captured || reply.to!==capture.to).map(reply=>descend(taken,reply,leaf)) : [leaf(taken)];
  for(const reply of recaptures) {
    bestImmediate=Math.max(bestImmediate,materialCp(after(taken,reply),mover));
    options.push(descend(taken,reply,opponentExchange));
  }
  const settled=choose(taken,options) || leaf(taken);
  const immediateCostCp=Math.max(0,baseline-bestImmediate);
  const delayedCostCp=complete ? Math.max(0,baseline-settled.cp) : null;
  // Budget exhaustion never supplies delayed-sacrifice evidence.
  const materialCostCp=Math.max(immediateCostCp,delayedCostCp ?? 0);
  const tacticalReplies=[];
  for(const reply of taken.moves({verbose:true}).filter(reply=>reply.captured && reply.to!==capture.to && VALUES[reply.captured]>=VALUES.r)) {
    const next=after(taken,reply);
    if(next.isCheck())tacticalReplies.push({san:reply.san,captured:reply.captured,check:true});
  }
  const offeredSquare=capture.flags.includes('e') ? capture.to[0]+(mover==='w' ? '4' : '5') : capture.to;
  const causality=causalCheck ? offerCausality({before,chess,move,capture,offeredSquare,materialCostCp}) : {supported:true,kind:'internal-material-comparison'};
  return {capture:capture.san,captureUci:uciOf(capture),offeredSquare,causality,
    newlyExposed:causalCheck?causality.beforeCapturable===false:!before.isAttacked(offeredSquare,mover==='w'?'b':'w'),
    geometricallyAttackedBefore:before.isAttacked(offeredSquare,mover==='w'?'b':'w'),
    offeredPiece:capture.captured,discovered:offeredSquare!==move.to,
    immediateCostCp,delayedCostCp,exposureCostCp:materialCostCp,materialCostCp:causality.supported?materialCostCp:0,materialTraceComplete:complete,exchangeNodes:nodes,
    materialContinuation:settled.line,materialTrace:settled.trace,
    tacticalReplies,ordinaryRecaptures:recaptures.map(reply=>({san:reply.san,captured:reply.captured})),
    forcingCompensation:tacticalReplies.length>0,
    isSacrifice:causality.supported && (materialCostCp>=MATERIAL_LIMITS.minimumCost || tacticalReplies.length>0)};
}
