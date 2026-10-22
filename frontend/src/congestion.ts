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

export type BalancedPath={route:string[];routeEdges:string[];rtt:number;lengthKm:number;hopRtts:Map<string,number>};
/** Two distinct loop-free, lowest-latency routes for an educational round robin.
 * Removing each edge of the shortest path finds the cheapest distinct alternate.
 * Paths may share a trunk; splitting is not a capacity or queueing prediction.
 */
export function balancedPaths(nodes:City[],edges:Cable[],source:string,destination:string,delays:Congestion):BalancedPath[]{
 const weighted=latencyEdges(edges,delays),first=shortest(nodes,weighted,source,destination);
 if(first.length_km===null||!first.route_edges.length)return [];
 let second:ReturnType<typeof shortest>|null=null;
 for(const excluded of first.route_edges){const alternative=shortest(nodes,weighted.filter(edge=>edge.id!==excluded),source,destination);
  if(alternative.length_km===null)continue;
  if(!second||alternative.length_km<second.length_km!||(alternative.length_km===second.length_km&&alternative.route_edges.join('|')<second.route_edges.join('|')))second=alternative;
 }
 return [first,...(second?[second]:[])].map(path=>{let rtt=0,lengthKm=0;const hopRtts=new Map<string,number>();
  path.route_edges.forEach((id,index)=>{const edge=edges.find(edge=>edge.id===id)!;lengthKm+=edge.length_km;rtt+=weighted.find(edge=>edge.id===id)!.length_km;hopRtts.set(path.route[index+1],rtt)});
  return {route:path.route,routeEdges:path.route_edges,rtt,lengthKm,hopRtts};
 });
}
