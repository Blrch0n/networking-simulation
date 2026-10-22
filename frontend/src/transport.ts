import {estimateDistance} from './graph.ts';
import type {Dataset,Topology} from './graph.ts';

export const SATELLITE_ID='__simulation_starlink__';
export const SATELLITE_IP='198.51.100.1';
/** Classroom failover policy, not a model of the operational Starlink constellation.
 * Two distinct installed cable failures in 2-Edge activate an assumed terminal
 * at each endpoint. The relay's map position is schematic. No NAT is implied.
 */
export function packetTransport(graph:Dataset,topology:Topology,failed:string[],source:string,destination:string,route:string[],routeEdges:string[],rtt:number|null,satelliteRtt=60){
 const base={graph,route,routeEdges,rtt,satellite:false,hopRtts:undefined as Map<string,number>|undefined,satelliteEdgeIds:[] as string[]};
 const from=graph.nodes.find(n=>n.id===source),to=graph.nodes.find(n=>n.id===destination);
 if(topology!=='resilient'||new Set(failed).size<2||!from||!to||source===destination)return base;
 const latency=Number.isFinite(satelliteRtt)?Math.max(1,Math.min(1000,satelliteRtt)):60;
 const north=Math.max(...graph.nodes.map(n=>n.lat));
 const relay={id:SATELLITE_ID,name:'Starlink · жишээ',lat:Math.min(north-.2,(from.lat+to.lat)/2+2),lon:(from.lon+to.lon)/2};
 const links=[{id:'simulation_uplink',u:from.id,v:relay.id,length_km:Math.max(.001,estimateDistance(from,relay))},{id:'simulation_downlink',u:relay.id,v:to.id,length_km:Math.max(.001,estimateDistance(relay,to))}];
 return {graph:{nodes:[...graph.nodes,relay],edges:[...graph.edges,...links]},route:[from.id,relay.id,to.id],routeEdges:links.map(e=>e.id),rtt:latency,satellite:true,hopRtts:new Map([[relay.id,latency/2],[to.id,latency]]),satelliteEdgeIds:links.map(e=>e.id)};
}
/** Target index uses the outbound route even during the reply animation. */
export function packetHopPair(route:string[],target:number|null,returning=false){
 if(target===null||route.length<2)return null;
 const next=Math.max(returning?0:1,Math.min(returning?route.length-2:route.length-1,target));
 const current=returning?next+1:next-1;
 return {current:route[current],next:route[next]};
}
