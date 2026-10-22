/** Visual interpolation only. The planner's propagation RTT remains unchanged. */
import {estimateDistance} from './graph.ts';
import type {Dataset} from './graph.ts';
export type Point=[number,number]; // Leaflet latitude, longitude.
export type PacketStatus='idle'|'outbound'|'returning'|'complete'|'reduced';
type Segment={from:Point;to:Point;start:number;end:number;leg:number};
export type PacketPath={segments:Segment[];lengthKm:number};
function distance(a:Point,b:Point){return estimateDistance({id:'a',name:'a',lat:a[0],lon:a[1]},{id:'b',name:'b',lat:b[0],lon:b[1]})}
export function packetPath(graph:Dataset,routeNodes:string[],routeEdges:string[]):PacketPath|null{
 if(routeNodes.length<2||routeEdges.length!==routeNodes.length-1)return null;
 const segments:Segment[]=[];let lengthKm=0;
 for(let i=0;i<routeEdges.length;i++){
  const from=graph.nodes.find(n=>n.id===routeNodes[i]),to=graph.nodes.find(n=>n.id===routeNodes[i+1]),edge=graph.edges.find(e=>e.id===routeEdges[i]);
  if(!from||!to||!edge||!((edge.u===from.id&&edge.v===to.id)||(edge.v===from.id&&edge.u===to.id)))return null;
  const start:Point=[from.lat,from.lon],end:Point=[to.lat,to.lon];
  let points:Point[]=edge.geometry?.coordinates.map(c=>[c[1],c[0]])??[start,end];
  if(distance(start,points[0])>distance(start,points.at(-1)!))points=[...points].reverse();
  points=[start,...points,end];
  const lengths=points.slice(1).map((point,j)=>distance(points[j],point)),visualLength=lengths.reduce((a,b)=>a+b,0);
  for(let j=0;j<lengths.length;j++){
   if(visualLength>0&&lengths[j]===0)continue;
   const weight=visualLength>0?lengths[j]/visualLength:1/lengths.length;
   const next=lengthKm+edge.length_km*weight;
   segments.push({from:points[j],to:points[j+1],start:lengthKm,end:next,leg:i});lengthKm=next;
  }
 }
 return segments.length?{segments,lengthKm}:null;
}
export function packetPosition(path:PacketPath,progress:number):Point{
 const target=Math.max(0,Math.min(1,progress))*path.lengthKm;
 const segment=path.segments.find(s=>s.end>=target)??path.segments.at(-1)!;
 const t=segment.end>segment.start?Math.max(0,Math.min(1,(target-segment.start)/(segment.end-segment.start))):0;
 return [segment.from[0]+(segment.to[0]-segment.from[0])*t,segment.from[1]+(segment.to[1]-segment.from[1])*t];
}
export function roundTripPhase(elapsed:number,legDuration:number){
 const time=Math.max(0,elapsed)/legDuration;
 return {progress:time<=1?Math.min(1,time):Math.max(0,2-time),status:time>=2?'complete':time>=1?'returning':'outbound'} as const;
}

/** Next city index in the original outbound route; never invent extra hops. */
export function packetTargetHop(path:PacketPath,progress:number,returning=false):number{
 const target=Math.max(0,Math.min(1,progress))*path.lengthKm;
 const segment=returning?(path.segments.find(s=>s.end>=target)??path.segments.at(-1)!):(path.segments.find(s=>s.end>target)??path.segments.at(-1)!);
 return returning?segment.leg:segment.leg+1;
}
