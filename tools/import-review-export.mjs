import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateReviewExport,redactReviewExport} from '../src/reviewExport.js';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node tools/import-review-export.mjs input.json sanitized-fixture.json');
const bytes=readFileSync(input),report=JSON.parse(bytes),validation=validateReviewExport(report);
if(!validation.valid)throw Error(validation.errors.join('\n'));
const sanitized=redactReviewExport(report);sanitized.fixtureSource={kind:process.argv.includes('--repository-reproduction')?'repository-report-not-uploaded-browser-export':'user-supplied-review-export',sha256:createHash('sha256').update(bytes).digest('hex'),validation};
writeFileSync(output,JSON.stringify(sanitized,null,2)+'\n');console.log(JSON.stringify(validation));
