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
