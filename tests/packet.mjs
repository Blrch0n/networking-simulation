import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packetPath,packetPosition,packetTargetHop,roundTripPhase} from '../frontend/src/packet.ts';
import {simulationIps,publicSimulationIps,tracerouteRows} from '../frontend/src/packetInfo.ts';
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

const ips=simulationIps(original.nodes);
assert.equal(ips.size,22);assert.equal(new Set(ips.values()).size,22);
assert.deepEqual(simulationIps([...original.nodes].reverse()),ips);
for(const ip of ips.values()){const bytes=ip.split('.').map(Number);assert.equal(bytes[0],10);assert.equal(bytes[1],0);assert(bytes[2]>=0&&bytes[2]<=255);assert(bytes[3]>=1&&bytes[3]<=254)}
assert.equal(simulationIps([]).size,0);
const hundred=simulationIps(Array.from({length:100},(_,i)=>({id:`city-${i}`,name:String(i),lat:47,lon:100})));
assert.equal(new Set(hundred.values()).size,100);
assert.equal(packetTargetHop(path,0),1);assert.equal(packetTargetHop(path,.2),1);assert.equal(packetTargetHop(path,.4),2);assert.equal(packetTargetHop(path,1),2);
assert.equal(packetTargetHop(path,1,true),1);assert.equal(packetTargetHop(path,.4,true),0);assert.equal(packetTargetHop(path,.2,true),0);
console.log('PASS: deterministic unique private simulation IPs, hop targets and return direction');

const trace=tracerouteRows(graph.nodes,graph.edges,['a','b','c'],simulationIps(graph.nodes));
assert.deepEqual(trace.map(row=>row.hop),[1,2]);
assert.deepEqual(trace.map(row=>row.rtt),[.02,.05]);
assert.equal(trace[0].kind,'Private');assert.equal(trace[1].kind,'Private');
assert.equal(trace[1].ip,simulationIps(graph.nodes).get('c'));
assert.deepEqual(publicSimulationIps([...graph.nodes].reverse()),publicSimulationIps(graph.nodes));
assert.deepEqual(tracerouteRows(graph.nodes,graph.edges,[],new Map()),[]);
assert.deepEqual(tracerouteRows(graph.nodes,graph.edges,['a'],new Map()),[]);
assert.throws(()=>tracerouteRows(graph.nodes,graph.edges,['a','c'],new Map()));
for(const kind of ['mst','resilient','mesh']){
 const metrics=analyze(original,kind,'ulaanbaatar','khovd').current;
 const rows=tracerouteRows(original.nodes,original.edges,metrics.route,ips);
 assert.equal(rows.length,metrics.route_edges.length);
 assert(Math.abs(rows.at(-1).rtt-metrics.route_rtt_ms)<1e-9);
}
console.log('PASS: TTL hop numbering, mixed example IP roles, cumulative RTT and destination parity');

const {packetTransport,packetHopPair,SATELLITE_ID,SATELLITE_IP}=await import('../frontend/src/transport.ts');
const snapshot=JSON.stringify(graph);
const satellite=packetTransport(graph,'resilient',['ab','bc'],'a','c',[],[],null);
assert.equal(satellite.satellite,true);assert.equal(satellite.rtt,60);
assert.deepEqual(satellite.route,['a',SATELLITE_ID,'c']);
assert.equal(satellite.routeEdges.length,2);
const satellitePath=packetPath(satellite.graph,satellite.route,satellite.routeEdges);
assert(satellitePath);assert.equal(packetTargetHop(satellitePath,.25),1);assert.equal(packetTargetHop(satellitePath,.75),2);
assert.equal(JSON.stringify(graph),snapshot);
const satelliteTrace=tracerouteRows(satellite.graph.nodes,satellite.graph.edges,satellite.route,simulationIps(graph.nodes),satellite.hopRtts);
assert.deepEqual(satelliteTrace.map(row=>row.rtt),[30,60]);assert.equal(satelliteTrace[0].ip,SATELLITE_IP);assert.equal(satelliteTrace[1].ip,simulationIps(graph.nodes).get('c'));
for(const kind of ['mst','mesh'])assert.equal(packetTransport(graph,kind,['ab','bc'],'a','c',[],[],null).satellite,false);
for(const failures of [[],['ab'],['ab','ab']])assert.equal(packetTransport(graph,'resilient',failures,'a','c',['a','b','c'],['ab','bc'],.05).satellite,false);
assert.equal(packetTransport(graph,'resilient',['ab','bc'],'a','a',['a'],[],0).satellite,false);
assert.equal(packetTransport(graph,'resilient',['ab','bc'],'missing','c',[],[],null).satellite,false);
assert.equal(packetTransport(graph,'resilient',['ab','bc'],'a','c',[],[],null,85).rtt,85);
// Policy activates even when a healthy cable path remains; restoration deactivates.
assert.equal(packetTransport(graph,'resilient',['ab','bc'],'a','c',['a','b','c'],['ab','bc'],.05).satellite,true);
assert.equal(packetTransport(graph,'resilient',['ab'],'a','c',['a','b','c'],['ab','bc'],.05).rtt,.05);
assert.deepEqual(packetHopPair(satellite.route,1),{current:'a',next:SATELLITE_ID});
assert.deepEqual(packetHopPair(satellite.route,2),{current:SATELLITE_ID,next:'c'});
assert.deepEqual(packetHopPair(satellite.route,1,true),{current:'c',next:SATELLITE_ID});
assert.deepEqual(packetHopPair(satellite.route,0,true),{current:SATELLITE_ID,next:'a'});
assert.equal(packetHopPair(satellite.route,null),null);
console.log('PASS: two-failure Starlink policy, restoration, assumed RTT, unchanged cable graph, satellite geometry and both hop directions');
