import assert from 'node:assert/strict';
import fs from 'node:fs';
import {kruskalTrace,dijkstraTrace} from '../frontend/src/walkthrough.ts';
import {mst,shortest,validateDataset,designs} from '../frontend/src/graph.ts';
const seed=JSON.parse(fs.readFileSync(new URL('../frontend/public/demo/network.json',import.meta.url),'utf8'));
const original=validateDataset({nodes:seed.nodes,edges:seed.routes});
const nodes=['a','b','c','d'].map((id,i)=>({id,name:id,lat:47,lon:100+i}));
const edges=[['a','b',1],['b','c',2],['a','c',4],['c','d',3],['b','d',8]].map(([u,v,length_km])=>({id:`${u}--${v}`,u,v,length_km}));
const small={nodes,edges};
for(const graph of [small,original,{nodes,edges:edges.slice(0,1)},{nodes:[],edges:[]},{nodes:[nodes[0]],edges:[]}]){
 const steps=kruskalTrace(graph),accepted=steps.at(-1).edgeIds;
 assert.deepEqual([...accepted].sort(),mst(graph.nodes,graph.edges).map(e=>e.id).sort());
 for(let i=1;i<steps.length-1;i++){const step=steps[i],previous=steps[i-1];assert.equal(step.edgeIds.length-previous.edgeIds.length,step.accepted?1:0);assert(step.candidate);assert.equal(new Set(step.edgeIds).size,step.edgeIds.length)}
 assert.deepEqual(kruskalTrace({nodes:[...graph.nodes].reverse(),edges:[...graph.edges].reverse()}),steps);
}
const ds=designs(original);
for(const [graph,available] of [[small,edges],[small,edges.filter(e=>!['c--d','b--d'].includes(e.id))],[original,ds.mst],[original,ds.resilient],[original,ds.mesh],[original,ds.resilient.slice(2)]]){
 for(const source of [graph.nodes[0].id,graph.nodes.at(-1).id])for(const destination of graph.nodes.map(n=>n.id)){
  const steps=dijkstraTrace(graph,available,source,destination),actual=shortest(graph.nodes,available,source,destination),last=steps.at(-1);
  assert.deepEqual(last.edgeIds,actual.route_edges);
  assert.equal(Number.isFinite(last.distances[destination])?last.distances[destination]:null,actual.length_km);
  for(let i=1;i<steps.length;i++){assert(steps[i].visited.length>=steps[i-1].visited.length);assert.equal(new Set(steps[i].visited).size,steps[i].visited.length)}
  const settled=last.visited.map(id=>last.distances[id]);assert.deepEqual(settled,[...settled].sort((a,b)=>a-b));
 }
}
const hand=dijkstraTrace(small,edges,'a','d');assert.deepEqual(hand.at(-1).edgeIds,['a--b','b--c','c--d']);assert.equal(hand.at(-1).distances.d,6);assert.equal(hand[0].distances.d,Infinity);
assert(dijkstraTrace({nodes:[],edges:[]},[],'','').at(-1).message.includes('зам байхгүй'));
console.log('PASS: deterministic Kruskal traces, accept/skip snapshots, Dijkstra routes and distances, failures, unreachable and empty graphs');
