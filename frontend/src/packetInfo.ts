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

// RFC 5737 documentation blocks: never actual globally reachable public IPs.
export const EXAMPLE_INTERNET_IP='198.51.100.10';
export const EXAMPLE_GATEWAY_IP='203.0.113.1';
/** Educational inbound DNAT / reply SNAT at the city network boundary.
 * The external segment has no geographic cable or measured latency in this model.
 */
export function packetAddresses(ips:Map<string,string>,destination:string,returning=false){
 const privateDestination=ips.get(destination)??'—';
 return returning?{
  source:privateDestination,destination:EXAMPLE_INTERNET_IP,
  sourceType:'Private',destinationType:'Public жишээ',
  outsideSource:EXAMPLE_GATEWAY_IP,outsideDestination:EXAMPLE_INTERNET_IP,
 }:{
  source:EXAMPLE_INTERNET_IP,destination:privateDestination,
  sourceType:'Public жишээ',destinationType:'Private',
  outsideSource:EXAMPLE_INTERNET_IP,outsideDestination:EXAMPLE_GATEWAY_IP,
 };
}
