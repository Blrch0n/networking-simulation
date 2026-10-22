/** Static-site counterpart of backend/app/algorithms/round_robin.py. */
export function roundRobin(pathIds:string[],packetCount:number,startIndex=0){
 if(pathIds.some(id=>typeof id!=='string'||!id)||new Set(pathIds).size!==pathIds.length)throw Error('Invalid path IDs');
 if(!Number.isInteger(packetCount)||packetCount<0||packetCount>1000)throw Error('Invalid packet count');
 if(!Number.isInteger(startIndex)||startIndex<0||startIndex>1_000_000_000)throw Error('Invalid start index');
 const packets:{packet:number;path_id:string;path_index:number}[]=[],counts:Record<string,number>=Object.fromEntries(pathIds.map(id=>[id,0]));
 if(!pathIds.length)return {packets,counts,next_index:0};
 let index=startIndex%pathIds.length;
 for(let number=1;number<=packetCount;number++){const path=pathIds[index];packets.push({packet:number,path_id:path,path_index:index});counts[path]++;index=(index+1)%pathIds.length}
 return {packets,counts,next_index:index};
}
export type BackendBalance=ReturnType<typeof roundRobin>&{policy:'round_robin';available:boolean;paths:{id:string;route:string[];route_edges:string[];rtt_ms:number;length_km:number;hop_rtts:Record<string,number>}[]};
