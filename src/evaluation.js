// Scores always carry an explicit perspective. Mate is never a centipawn value.
export function normalizeEvaluation(raw,{turn='w',pov=turn,terminal=false}={}) {
  const sign=turn===pov?1:-1,depth=Number.isInteger(raw?.depth)?raw.depth:null;
  if(!raw || raw.error || raw.success===false)return {kind:'unknown',depth,reason:'Missing or failed engine result'};
  if(raw.kind){
    if(raw.kind==='cp' && Number.isFinite(raw.cp))return {...raw,cp:raw.cp*sign,depth};
    if(raw.kind==='mate' && Number.isInteger(raw.moves) && raw.moves!==0)return {...raw,moves:raw.moves*sign,depth};
    if(raw.kind==='checkmate' && [-1,1].includes(raw.outcome))return {...raw,outcome:raw.outcome*sign,depth};
    if(raw.kind==='draw')return {...raw,depth};
    return {kind:'unknown',depth,reason:'Invalid typed evaluation'};
  }
  if(terminal){
    if(raw.mate!=null)return {kind:'checkmate',outcome:-sign,depth:0};
    return {kind:'draw',depth:0};
  }
  const cp=raw.scoreCp??raw.score;
  if(raw.mate!=null){
    if(!Number.isInteger(raw.mate)||raw.mate===0 || cp!=null)return {kind:'unknown',depth,reason:'Contradictory or invalid mate result'};
    return {kind:'mate',moves:sign*raw.mate,depth};
  }
  return Number.isFinite(cp)?{kind:'cp',cp:sign*cp,depth}:{kind:'unknown',depth,reason:'Missing finite score'};
}
export const evaluationCp=e=>e?.kind==='cp'?e.cp:e?.kind==='draw'?0:null;
export function evaluationChance(e) {
  if(e?.kind==='mate')return Number.isInteger(e.moves)&&e.moves!==0&&e.cp==null?(e.moves>0?1:0):null;
  if(e?.kind==='checkmate')return [-1,1].includes(e.outcome)&&e.cp==null?(e.outcome>0?1:0):null;
  if(e?.kind==='draw')return e.cp==null&&e.moves==null?.5:null;
  if(e?.kind==='cp' && Number.isFinite(e.cp) && e.moves==null)return 1/(1+Math.exp(-.00368208*Math.max(-10000,Math.min(10000,e.cp))));
  return null;
}
export function formatEvaluation(e) {
  if(evaluationChance(e)===null)return "Unknown";
  if(e?.kind==='cp')return `${e.cp>=0?'+':''}${(e.cp/100).toFixed(2)}`;
  if(e?.kind==='mate')return `${e.moves>0?'+':'−'}M${Math.abs(e.moves)}`;
  if(e?.kind==='checkmate')return e.outcome>0?'Checkmate delivered':'Checkmated';
  if(e?.kind==='draw')return 'Draw';
  return 'Unknown';
}
export function evaluationLoss(before,after) {
  const a=evaluationChance(before),b=evaluationChance(after);
  return a==null||b==null?null:Math.max(0,a-b);
}
export function classifyMateTransition({before,after,bestMovePlayed,verified=false,legalChoices}) {
  const beforeMated=before?.kind==='mate' && before.moves<0;
  const afterMated=(after?.kind==='mate'&&after.moves<0)||(after?.kind==='checkmate'&&after.outcome<0);
  if(before?.kind==='unknown'||after?.kind==='unknown')return {kind:'unknown',forced:false};
  if(after?.kind==='checkmate'&&after.outcome>0)return {kind:'delivers-checkmate',forced:false};
  if(beforeMated && afterMated)return {kind:bestMovePlayed?'best-mate-defense':Math.abs(after.moves||0)<Math.abs(before.moves)?'shortens-existing-mate':'already-forced-loss',forced:legalChoices===1};
  if(!beforeMated && afterMated)return {kind:verified?'allows-forced-mate':'unverified-mate-transition',forced:false};
  if(before?.kind==='mate'&&before.moves>0 && !(after?.kind==='mate'&&after.moves>0) && !(after?.kind==='checkmate'&&after.outcome>0))return {kind:verified?'misses-forced-mate':'unverified-mate-transition',forced:false};
  return {kind:'ordinary',forced:false};
}
export function compareEvaluations(a,b) {
  if(evaluationChance(a)==null||evaluationChance(b)==null)return null;
  const tier=e=>e.kind==='checkmate'?3*e.outcome:e.kind==='mate'?2*Math.sign(e.moves):0;
  const difference=tier(a)-tier(b);if(difference)return Math.sign(difference);
  if(a.kind==='mate'&&b.kind==='mate')return Math.sign(a.moves>0?b.moves-a.moves:Math.abs(a.moves)-Math.abs(b.moves));
  if(a.kind==='checkmate')return 0;
  return Math.sign((evaluationCp(a)??0)-(evaluationCp(b)??0));
}
