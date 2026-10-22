import {cmp} from './graph.ts';
import type {City} from './graph.ts';
/** Synthetic per-city identifiers, not real router or interface configuration. */
export function simulationIps(nodes:City[]):Map<string,string>{
 const result=new Map<string,string>(),used=new Set<number>();
 for(const node of [...nodes].sort((a,b)=>cmp(a.id,b.id))){
  let hash=2166136261;for(const char of node.id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  let slot=hash%(256*254);while(used.has(slot))slot=(slot+1)%(256*254);
  used.add(slot);result.set(node.id,`10.0.${Math.floor(slot/254)}.${slot%254+1}`);
 }
 return result;
}

/** Stable documentation IPs for simulated backbone router interfaces. */
export function publicSimulationIps(nodes:City[]):Map<string,string>{
 return new Map([...nodes].sort((a,b)=>cmp(a.id,b.id)).map((node,index)=>[node.id,`203.0.113.${index+1}`]));
}
/** TTL-style city hops, excluding the originating city. No fabricated jitter or loss. */
export function tracerouteRows(nodes:City[],edges:import('./graph.ts').Cable[],route:string[],ips:Map<string,string>){
 const publicIps=publicSimulationIps(nodes);let km=0;
 return route.slice(1).map((id,index)=>{
  const previous=route[index];const edge=edges.find(e=>(e.u===previous&&e.v===id)||(e.v===previous&&e.u===id));
  if(!edge)throw new Error('Trace route contains a missing cable');
  km+=edge.length_km;
  return {id,hop:index+1,name:nodes.find(n=>n.id===id)?.name??id,ip:index===0?ips.get(id)??'—':publicIps.get(id)??'—',kind:index===0?'Private':'Public жишээ',rtt:km/100};
 });
}
