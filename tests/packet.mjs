import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packetPath,packetPosition,roundTripPhase} from '../frontend/src/packet.ts';
import {analyze,validateDataset} from '../frontend/src/graph.ts';
const graph={nodes:[{id:'a',name:'A',lat:0,lon:0},{id:'b',name:'B',lat:0,lon:2},{id:'c',name:'C',lat:0,lon:5}],edges:[{id:'ab',u:'a',v:'b',length_km:2,geometry:{type:'LineString',coordinates:[[2,0],[1,0],[0,0]]}},{id:'bc',u:'b',v:'c',length_km:3}]};
const path=packetPath(graph,['a','b','c'],['ab','bc']);
assert(path);assert.equal(path.lengthKm,5);
assert.deepEqual(packetPosition(path,0),[0,0]);assert.deepEqual(packetPosition(path,1),[0,5]);assert.deepEqual(packetPosition(path,2/5),[0,2]);
const reverse=packetPath(graph,['c','b','a'],['bc','ab']);assert(reverse);assert.deepEqual(packetPosition(reverse,0),[0,5]);assert.deepEqual(packetPosition(reverse,1),[0,0]);
assert.deepEqual(packetPosition(path,-1),[0,0]);assert.deepEqual(packetPosition(path,2),[0,5]);
assert.equal(packetPath(graph,[],[]),null);assert.equal(packetPath(graph,['a'],[]),null);assert.equal(packetPath(graph,['a','c'],['ab']),null);assert.equal(packetPath(graph,['a','b'],['missing']),null);
const colocated={nodes:[{id:'a',name:'A',lat:1,lon:1},{id:'b',name:'B',lat:1,lon:1}],edges:[{id:'ab',u:'a',v:'b',length_km:3}]};const still=packetPath(colocated,['a','b'],['ab']);assert(still);assert.equal(still.lengthKm,3);assert.deepEqual(packetPosition(still,.5),[1,1]);
for(const [elapsed,progress,status] of [[0,0,'outbound'],[1000,.5,'outbound'],[2000,1,'returning'],[3000,.5,'returning'],[4000,0,'complete'],[8000,0,'complete']])assert.deepEqual(roundTripPhase(elapsed,2000),{progress,status});
const seed=JSON.parse(fs.readFileSync(new URL('../frontend/public/demo/network.json',import.meta.url),'utf8'));const original=validateDataset({nodes:seed.nodes,edges:seed.routes});
for(const kind of ['mst','resilient','mesh']){
 const analysis=analyze(original,kind,'ulaanbaatar','khovd');
 for(const metrics of [analysis.current,analyze(original,kind,'ulaanbaatar','khovd',analysis.current.route_edges[0]).current]){
  const route=packetPath(original,metrics.route,metrics.route_edges);
  if(metrics.route_length_km===null){assert.equal(route,null);continue}
  assert(route);assert(Math.abs(route.lengthKm-metrics.route_length_km)<1e-7);
  const source=original.nodes.find(n=>n.id==='ulaanbaatar'),dest=original.nodes.find(n=>n.id==='khovd');
  assert.deepEqual(packetPosition(route,0),[source.lat,source.lon]);const end=packetPosition(route,1);assert(Math.abs(end[0]-dest.lat)<1e-9&&Math.abs(end[1]-dest.lon)<1e-9);
 }
}
console.log('PASS: round-trip timing, ordered/reversed geometry, edge-length weighting, route changes, no path and coincident coordinates');
