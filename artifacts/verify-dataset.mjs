import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const workflow=readFileSync('.github/workflows/pages.yml','utf8');
const suites=[...workflow.matchAll(/^\s+node ((?:scripts|tools)\/check-[\w-]+\.mjs)\s*$/gm)].map(match=>match[1]);
const results=[];
for(const suite of suites){
  const run=spawnSync(process.execPath,[suite],{encoding:'utf8',timeout:120000});
  const output=(run.stdout||'')+(run.stderr||'')+(run.error?String(run.error):'');
  const record={suite,exitCode:run.status,groups:[...output.matchAll(/^PASS /gm)].length,output};
  results.push(record);console.log((run.status===0?'PASS ':'FAIL ')+suite+' ('+record.groups+' groups)');
  if(run.status!==0){console.error(output);break;}
}
writeFileSync('artifacts/dataset-native-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),suites:results.length,groups:results.reduce((n,r)=>n+r.groups,0),results},null,2));
if(results.length!==suites.length||results.some(r=>r.exitCode!==0))process.exitCode=1;
else console.log(results.length+' suites and '+results.reduce((n,r)=>n+r.groups,0)+' native/provenance groups passed.');
