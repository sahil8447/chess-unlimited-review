import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {build} from 'esbuild';
test('release manifest, CSP, runtime paths and engine/piece assets are complete',()=>{
 const manifest=JSON.parse(readFileSync('dist/manifest.json'));
 assert.equal(manifest.manifest_version,3);assert.ok(manifest.permissions.includes('offscreen'));
 assert.match(manifest.content_security_policy.extension_pages,/'wasm-unsafe-eval'/);
 for(const file of [manifest.background.service_worker,...manifest.content_scripts.flatMap(s=>[...s.js,...s.css]),'offscreen.html','offscreen.js','engine/stockfish-19-lite-single.js','engine/stockfish-19-lite-single.wasm'])assert.ok(existsSync('dist/'+file),file);
 const pieces=readdirSync('pieces').filter(name=>name.endsWith('.svg'));assert.equal(pieces.length,12);
 for(const file of [...pieces.map(p=>'pieces/'+p),'background.js','offscreen.js','offscreen.html','manifest.json','engine/stockfish-19-lite-single.js','engine/stockfish-19-lite-single.wasm'])assert.ok(readFileSync(file).equals(readFileSync('dist/'+file)),file+' must match source');
});
test('committed content bundle matches the current source build',async()=>{
 const result=await build({entryPoints:['src/content.js'],bundle:true,outfile:'dist/content.js',format:'iife',platform:'browser',target:'chrome120',write:false});
 assert.ok(Buffer.from(result.outputFiles[0].contents).equals(readFileSync('dist/content.js')),'Run npm run build after source changes');
});
