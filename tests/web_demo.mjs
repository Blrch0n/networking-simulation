import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {validateDataset,analyze,mst,tarjan,metrics,designs,verifyFailures,saveCity,saveCable,deleteCity,pair} from '../frontend/src/graph.ts';
import {defaults,changeGraph,undoGraph,loadWorkspace,persistWorkspace,STORAGE_KEY} from '../frontend/src/workspace.ts';
const root=new URL('../',import.meta.url).pathname;
const seed=JSON.parse(fs.readFileSync(root+'frontend/public/demo/network.json','utf8'));
const original=validateDataset({nodes:seed.nodes,edges:seed.routes});
const n=id=>({id,name:id,lat:47,lon:100+id.charCodeAt(0)/100});
const edge=(u,v,length)=>({id:pair(u,v),u,v,length_km:length});
const triangle=validateDataset({nodes:['a','b','c'].map(n),edges:[edge('a','b',1),edge('b','c',2),edge('a','c',4)]});
assert.equal(mst(triangle.nodes,triangle.edges).reduce((s,e)=>s+e.length_km,0),3);
assert.deepEqual(tarjan(triangle.nodes,triangle.edges).bridges,[]);
const normalTriangle=metrics(triangle.nodes,triangle.edges,'a','c');assert.deepEqual(normalTriangle.route,['a','b','c']);assert.equal(normalTriangle.route_length_km,3);let m=metrics(triangle.nodes,triangle.edges.filter(e=>e.id!=='a--b'),'a','c');assert.deepEqual(m.route,['a','c']);assert.equal(m.route_length_km,4);assert.equal(m.bridge_ids.length,2);
const impossible={...triangle,edges:triangle.edges.slice(0,2)};assert.equal(analyze(impossible,'resilient','a','c').baseline.protected,false);
const disconnected={nodes:[...triangle.nodes,n('d')],edges:triangle.edges};assert.equal(analyze(disconnected,'resilient','a','d').current.max_rtt_ms,null);assert.equal(verifyFailures(disconnected.nodes,disconnected.edges).all_passed,false);
assert.throws(()=>analyze(triangle,'mst','a','c','not-an-edge'));assert.equal(verifyFailures([],[]).all_passed,false);assert.equal(verifyFailures([n('a')],[]).all_passed,false);
assert.equal(metrics([n('a'),n('b')],[],'a','b').protected,false);assert.equal(metrics([n('a'),n('b')],[],'a','b').max_rtt_ms,null);
for(const bad of [
 {...triangle,nodes:[...triangle.nodes,triangle.nodes[0]]},
 {...triangle,nodes:[{...n('x'),lat:91}]},
 {...triangle,edges:[edge('a','a',1)]},
 {...triangle,edges:[edge('a','z',1)]},
 {...triangle,edges:[edge('a','b',0)]},
 {...triangle,edges:[edge('a','b',NaN)]},
 {...triangle,edges:[edge('a','b',Infinity)]},
 {...triangle,edges:[edge('a','b',1),{...edge('b','a',2),id:'duplicate'}]},
])assert.throws(()=>validateDataset(bad));
const added=saveCity(original,{id:'test-city',name:'Туршилтын хот',lat:48.1,lon:106.1},null,true);assert.equal(added.nodes.length,23);assert.equal(added.edges.length,253);
assert.throws(()=>saveCity(original,original.nodes[0],null));const isolated=saveCity(original,{id:'isolated',name:'Тусгаар хот',lat:48,lon:106},null,false);assert.equal(analyze(isolated,'resilient','ulaanbaatar','isolated').current.max_rtt_ms,null);
const removed=deleteCity(added,'ulaanbaatar');assert.equal(removed.nodes.length,22);assert(!removed.edges.some(e=>e.u==='ulaanbaatar'||e.v==='ulaanbaatar'));
const old=triangle.edges[0];const edited=saveCable(triangle,old.u,old.v,7);assert.equal(edited.edges.find(e=>e.id===old.id).length_km,7);assert.equal(edited.edges.length,3);assert.equal(mst(edited.nodes,edited.edges).reduce((sum,e)=>sum+e.length_km,0),6);
const moved=saveCity(edited,{...edited.nodes[0],lat:48},edited.nodes[0].id);assert.equal(moved.edges.find(e=>e.id===old.id).length_km,7);assert.equal(moved.edges.find(e=>e.id===old.id).geometry.coordinates[0][1],48);
const deletedCable={...triangle,edges:triangle.edges.filter(e=>e.id!==old.id)};assert.equal(saveCable(deletedCable,old.u,old.v,5).edges.length,3);
const storageMap=new Map(),store={getItem:k=>storageMap.get(k)??null,setItem:(k,v)=>storageMap.set(k,v)};
let w=defaults(original);w=changeGraph(w,added);assert.equal(undoGraph(w).graph.nodes.length,22);assert.equal(persistWorkspace(w,store),'');assert.equal(loadWorkspace(original,store).workspace.graph.nodes.length,23);
w={...w,source:'ulaanbaatar'};w=changeGraph(w,removed);assert(w.graph.nodes.some(n=>n.id===w.source));
storageMap.set(STORAGE_KEY,'broken');assert(loadWorkspace(original,store).notice);assert.equal(loadWorkspace(original,store).workspace.graph.nodes.length,22);
assert(loadWorkspace(original,{getItem:()=>{throw Error('denied')}}).notice);assert(persistWorkspace(w,{setItem:()=>{throw Error('quota')}}));
const start=performance.now();const all=designs(original);const results={};
for(const kind of ['mst','resilient','mesh']){const base=metrics(original.nodes,all[kind],'ulaanbaatar','khovd'),v=verifyFailures(original.nodes,all[kind]);assert.equal(base.edge_count,kind==='mst'?21:kind==='mesh'?231:all.resilient.length);if(kind==='mst')assert.equal(v.disconnected,21);else{assert.equal(base.bridge_ids.length,0);assert.equal(v.connected,v.tests);assert(v.tests>0)}results[kind]={baseline:base,verification:v};}
const elapsed=performance.now()-start;
const fixtures=[];for(const graph of [triangle,impossible,disconnected,original,added,removed,edited,moved,{nodes:[],edges:[]}])for(const topology of ['mst','resilient','mesh']){const source=graph.nodes[0]?.id??'',destination=graph.nodes.at(-1)?.id??'';fixtures.push({graph,topology,source,destination});const design=analyze(graph,topology,source,destination).designs[topology];if(design.length)fixtures.push({graph,topology,source,destination,failed_id:design[0].id});}
const multi=analyze(triangle,'mesh','a','c',['a--b','a--c','a--b'],true);
assert.equal(multi.current.connected,false);assert.equal(multi.current.max_rtt_ms,null);assert.equal(multi.current.route_length_km,null);assert.deepEqual(multi.failed_ids,['a--b','a--c']);assert.equal(multi.verification.connected,3);assert.equal(multi.baseline.edge_count,3);
assert.equal(analyze(triangle,'mesh','a','c',['a--b']).current.connected,true);
assert.throws(()=>analyze(triangle,'mesh','a','c',['missing']));
for(const topology of ['mst','resilient','mesh']){const edges=analyze(original,topology,'ulaanbaatar','khovd').designs[topology];fixtures.push({graph:original,topology,source:'ulaanbaatar',destination:'khovd',failed_id:edges.slice(0,3).map(e=>e.id)});}
fixtures.push({graph:triangle,topology:'mesh',source:'a',destination:'c',failed_id:['a--b','a--c','a--b']});
const py=spawnSync(root+'.venv/bin/python',[root+'tests/planning_runner.py'],{input:fixtures.map(q=>JSON.stringify(q)).join('\n')+'\n',encoding:'utf8',maxBuffer:30*1024*1024});assert.equal(py.status,0,py.stderr);const answers=py.stdout.trim().split('\n').map(x=>JSON.parse(x));assert.equal(answers.length,fixtures.length);
function equal(a,b,path='root'){if(typeof a==='number'&&typeof b==='number'){assert(Math.abs(a-b)<1e-7,`${path}: ${a} vs ${b}`);return}if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){assert.deepEqual(a,b,path);return}assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path);for(const k of Object.keys(a))equal(a[k],b[k],path+'.'+k)}
for(let i=0;i<fixtures.length;i++){const q=fixtures[i];equal(analyze(q.graph,q.topology,q.source,q.destination,q.failed_id),answers[i],`fixture ${i}`)}
const summary={measured_at:new Date().toISOString(),node_version:process.version,browser_graph_total_ms:elapsed,parity_cases:fixtures.length,topologies:Object.fromEntries(Object.entries(results).map(([k,r])=>[k,{cables:r.baseline.edge_count,length_km:r.baseline.length_km,bridges:r.baseline.bridge_ids.length,normal_max_rtt_ms:r.baseline.max_rtt_ms,max_pair:r.baseline.max_pair,tests:r.verification.tests,connected:r.verification.connected,disconnected:r.verification.disconnected,worst_rtt_ms:r.verification.worst_rtt_ms,worst_edge:r.verification.worst_edge,all_passed:r.verification.all_passed}]))};
fs.writeFileSync(root+'docs/planning-results.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));console.log('PASS: small graphs, validation, editing, undo, storage failures, original exhaustive cuts, Python/browser parity');
