import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateDataset,designs} from '../frontend/src/graph.ts';
import {balancedPaths} from '../frontend/src/congestion.ts';
import {roundRobin} from '../frontend/src/roundRobin.ts';
const root=new URL('../',import.meta.url).pathname;
const graph=validateDataset({nodes:['a','b','c','d'].map((id,i)=>({id,name:id,lat:47,lon:100+i})),edges:[{id:'ab',u:'a',v:'b',length_km:2},{id:'bc',u:'b',v:'c',length_km:3},{id:'ac',u:'a',v:'c',length_km:4},{id:'cd',u:'c',v:'d',length_km:1},{id:'bd',u:'b',v:'d',length_km:2}]});
const fixtures=[];
for(const topology of ['mst','resilient','mesh'])for(const congested of [false,true])for(const packet_count of [0,1,5]){
 const installed=designs(graph)[topology];fixtures.push({graph,topology,source:'a',destination:'d',congestion:congested?{[installed[0].id]:20}:{},packet_count,start_index:1});
}
fixtures.push({graph:{...graph,edges:[]},topology:'mesh',source:'a',destination:'d'});
fixtures.push({graph,topology:'mesh',source:'a',destination:'a'});
fixtures.push({graph,topology:'mesh',source:'a',destination:'c',failed_id:['ac','bc'],congestion:{ac:30},packet_count:7});
const seed=JSON.parse(fs.readFileSync(root+'frontend/public/demo/network.json','utf8'));
const original=validateDataset({nodes:seed.nodes,edges:seed.routes});
for(const topology of ['mst','resilient','mesh']){
 const installed=designs(original)[topology];fixtures.push({graph:original,topology,source:'ulaanbaatar',destination:'khovd',failed_id:[installed[1].id],congestion:{[installed[0].id]:13},packet_count:5,start_index:3});
}
for(const path_ids of [[],['one'],['one','two'],['one','two','three']])for(const packet_count of [0,1,5,6])fixtures.push({operation:'schedule',path_ids,packet_count,start_index:3});
const expected=fixtures.map(request=>{
 if(request.operation==='schedule')return roundRobin(request.path_ids,request.packet_count,request.start_index);
 const failures=new Set(request.failed_id??[]),edges=designs(request.graph)[request.topology].filter(edge=>!failures.has(edge.id));
 const paths=balancedPaths(request.graph.nodes,edges,request.source,request.destination,request.congestion??{}).map((path,index)=>({id:`path-${index+1}`,route:path.route,route_edges:path.routeEdges,rtt_ms:path.rtt,length_km:path.lengthKm,hop_rtts:Object.fromEntries(path.hopRtts)}));
 return {policy:'round_robin',available:paths.length>0,paths,...roundRobin(paths.map(path=>path.id),request.packet_count??2,request.start_index??0)};
});
const python=spawnSync(root+'.venv/bin/python',[root+'tests/load_balance_runner.py'],{cwd:root,input:fixtures.map(fixture=>JSON.stringify(fixture)).join('\n')+'\n',encoding:'utf8'});
assert.equal(python.status,0,python.stderr);
const results=python.stdout.trim().split('\n').map(line=>JSON.parse(line));assert.equal(results.length,expected.length);
function equivalent(actual,expected){if(typeof expected==='number'){assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);return}if(Array.isArray(expected)){assert.equal(actual.length,expected.length);expected.forEach((value,index)=>equivalent(actual[index],value));return}if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort());for(const key of Object.keys(expected))equivalent(actual[key],expected[key]);return}assert.equal(actual,expected)}
results.forEach((result,index)=>equivalent(result,expected[index]));
console.log(`PASS: ${fixtures.length} Python/browser Round Robin and latency-path parity cases`);
