import {shortest} from './graph.ts';
import type {City,Cable} from './graph.ts';
export type Congestion=Record<string,number>; // Additional round-trip delay in ms.
/** A fresh, uniform sample of 1–3 healthy installed cables, not packet capture. */
export function randomCongestion(edges:Cable[],random= Math.random):Congestion{
 const pool=[...edges],result:Congestion={};
 const count=Math.min(pool.length,1+Math.floor(random()*3));
 for(let i=0;i<count;i++){const index=Math.min(pool.length-1,Math.floor(random()*pool.length));const [edge]=pool.splice(index,1);result[edge.id]=10+Math.floor(random()*31)}
 return result;
}
export function latencyEdges(edges:Cable[],delays:Congestion):Cable[]{
 return edges.map(edge=>({...edge,length_km:edge.length_km*.01+(Number.isFinite(delays[edge.id])?Math.max(0,delays[edge.id]):0)}));
}
/** Dijkstra's weights are modeled RTT, while original cable lengths stay intact. */
export function congestedRoute(nodes:City[],edges:Cable[],source:string,destination:string,delays:Congestion){
 const delay=(edge:Cable)=>Number.isFinite(delays[edge.id])?Math.max(0,delays[edge.id]):0;
 const weighted=latencyEdges(edges,delays);
 const fastest=shortest(nodes,weighted,source,destination),original=shortest(nodes,edges,source,destination);
 const selected=fastest.route_edges.map(id=>edges.find(edge=>edge.id===id)!);
 let cumulative=0;const hopRtts=new Map<string,number>();
 selected.forEach((edge,index)=>{cumulative+=edge.length_km*.01+delay(edge);hopRtts.set(fastest.route[index+1],cumulative)});
 const originalRtt=original.route_edges.reduce((total,id)=>{const edge=edges.find(e=>e.id===id)!;return total+edge.length_km*.01+delay(edge)},0);
 return {route:fastest.route,routeEdges:fastest.route_edges,rtt:fastest.length_km,lengthKm:fastest.length_km===null?null:selected.reduce((total,edge)=>total+edge.length_km,0),hopRtts,originalRtt:original.length_km===null?null:originalRtt,savedMs:fastest.length_km===null?0:Math.max(0,originalRtt-fastest.length_km),rerouted:original.route_edges.join('|')!==fastest.route_edges.join('|')};
}
