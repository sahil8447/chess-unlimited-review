import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const rules = readFileSync(new URL('../src/brilliantRules.js', import.meta.url),'utf8');
const {classifyBrilliantMove} = await import('data:text/javascript,'+encodeURIComponent(rules));
const base = {verified:true, deepBefore:30,deepAfter:24,bestAlternativeCp:30,
 worstAcceptedCp:10,materialCostCp:300,opponentCanGainMaterial:true,offeredCaptureCount:1};
const run=(grade,verification=base)=>classifyBrilliantMove({baseGrade:grade, verification,rating:1037});
assert.equal(run('best').eligible,true, 'sound near-best piece sacrifice must remain a candidate');
for (const grade of ['inaccuracy','mistake','blunder','miss'])
 assert.equal(run(grade).eligible,false, `${grade} must not become brilliant`);
assert.equal(run('best',{...base,deepAfter:-500}).eligible,false,'losing sacrifice rejected');
assert.equal(run('best',{...base,bestAlternativeCp:150}).eligible,false,'inferior sacrifice rejected');
assert.equal(run('best',{...base,deepBefore:800}).eligible,false,'already winning rejected');
assert.equal(run('best',{...base,opponentCanGainMaterial:false}).eligible,false,'ordinary recapture rejected');
assert.equal(run('best',{...base,materialCostCp:0}).eligible,false,'zero-cost trade rejected');
console.log('8 Brilliant safety checks passed; grade changes remain OFF.');
