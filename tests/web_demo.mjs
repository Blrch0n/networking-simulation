import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url).pathname;
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const data=JSON.parse(fs.readFileSync(`${root}/frontend/public/demo/network.json`));globalThis.fetch=async()=>({ok:true,json:async()=>data});
const {browserApi:api}=await import('../frontend/src/webDemo.ts');
for(const topology of ['mst','resilient','mesh']){
 const r=await api('/simulation/runs',{topology});assert.equal(r.nodes.length,22);assert.equal(r.edges.length,{mst:21,resilient:28,mesh:231}[topology]);assert.equal(r.metrics.bridges,topology==='mst'?21:0);
 for(const e of topology==='resilient'?r.edges:r.edges.slice(0,1)){
  await api(`/simulation/runs/${r.id}/incidents`,{kind:'cut',asset_id:e.id});
  let cut;for(let i=0;i<3;i++)cut=await api(`/simulation/runs/${r.id}/control`,{action:'step'});
  assert(cut.failed.includes(e.id));assert(!cut.metrics.route_edges.includes(e.id));if(topology==='resilient')assert.equal(cut.metrics.components,1);
  const fixed=await api(`/simulation/runs/${r.id}/repair`,{});assert.equal(fixed.failed.length,0);
 }
 const saved=await api(`/simulation/runs/${r.id}`);assert.equal(saved.id,r.id);
 console.log(topology, r.edges.length, 'links; normal max RTT',r.metrics.max_rtt_ms,'PASS');
}
const r=await api('/simulation/runs',{});await api(`/simulation/runs/${r.id}/incidents`,{kind:'node',asset_id:'khovd'});let down;for(let i=0;i<3;i++)down=await api(`/simulation/runs/${r.id}/control`,{action:'step'});assert.equal(down.metrics.rtt_ms,null);
await assert.rejects(()=>api(`/simulation/runs/${r.id}/incidents`,{kind:'cut',asset_id:'nope'}));
assert.equal((await api('/lab/status')).available,false);
console.log('PASS: browser persistence, node outage, unreachable RTT, invalid cable, lab unavailable');
