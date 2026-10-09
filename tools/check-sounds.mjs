import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../web/sounds.js',import.meta.url),'utf8');
function fixture({unsupported=false,suspended=false,fail=false,deferred=false}={}) {
  const nodes=[];const contexts=[];let release;
  class Audio {
    constructor(){this.state=suspended?'suspended':'running';this.currentTime=12;this.destination={};contexts.push(this);}
    async resume(){if(fail)throw new Error('Blocked');if(deferred)await new Promise(resolve=>{release=resolve;});this.state='running';}
    createOscillator(){const node={frequencies:[],starts:[],stops:[],connect(){},disconnect(){this.disconnected=true;},frequency:{setValueAtTime(value,at){node.frequencies.push([value,at]);}},start(at){this.starts.push(at);},stop(at){this.stops.push(at);}};nodes.push(node);return node;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }
  const window={...(unsupported?{}:{AudioContext:Audio})};
  vm.runInNewContext(source,{window});
  return {api:window.KotobaSounds,nodes,contexts,release:()=>release?.()};
}
let checks=0;
async function check(name,run){await run();checks++;console.log('PASS '+name);}
await check('muted feedback does not create an audio context or schedule sounds',async()=>{
  const f=fixture();assert.equal(await f.api.play('correct',false),false);assert.equal(f.contexts.length,0);assert.equal(f.nodes.length,0);
});
await check('unsupported browsers and unknown cues fail quietly',async()=>{
  const f=fixture({unsupported:true});assert.equal(f.api.available(),false);assert.equal(await f.api.play('incorrect'),false);
  const valid=fixture();assert.equal(await valid.api.play('unknown'),false);assert.equal(valid.contexts.length,0);
});
await check('correct and incorrect answers produce distinct short tone sequences',async()=>{
  const f=fixture();assert.equal(await f.api.play('correct'),true);assert.deepEqual(f.nodes.map(n=>n.frequencies[0][0]),[660,880]);
  assert.equal(await f.api.play('incorrect'),true);assert.deepEqual(f.nodes.slice(2).map(n=>n.frequencies[0][0]),[280,220]);
  assert.equal(f.contexts.length,1);
});
await check('completion and saved feedback remain separate from answer grading',async()=>{
  const f=fixture();assert.equal(await f.api.play('complete'),true);assert.equal(f.nodes.length,3);assert.equal(await f.api.play('saved'),true);assert.equal(f.nodes.length,4);
});
await check('suspended audio resumes after an explicit playback request',async()=>{
  const f=fixture({suspended:true});assert.equal(await f.api.play('correct'),true);assert.equal(f.contexts[0].state,'running');assert.equal(f.nodes.length,2);
});
await check('blocked audio playback returns failure without an uncaught rejection',async()=>{
  const f=fixture({suspended:true,fail:true});assert.equal(await f.api.play('complete'),false);assert.equal(f.nodes.length,0);
});
await check('muting while audio resumes cancels the pending cue',async()=>{
  const f=fixture({suspended:true,deferred:true});const playing=f.api.play('correct');f.api.stop();f.release();assert.equal(await playing,false);assert.equal(f.nodes.length,0);
});
await check('stopping and ending tones release their audio nodes',async()=>{
  const f=fixture();await f.api.play('correct');f.api.stop();assert.ok(f.nodes.every(n=>n.stops.length===2));f.nodes.forEach(n=>n.onended());assert.ok(f.nodes.every(n=>n.disconnected));
});
console.log(`${checks} sound checks passed.`);
