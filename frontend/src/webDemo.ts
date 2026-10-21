/** Static-host simulation. Uses the exported Python design and computes scenario metrics locally.
 * No server, ephemeral SQLite, Docker connection or fabricated OSPF telemetry.
 */
export const STATIC_DEMO = import.meta.env?.VITE_STATIC_DEMO === '1';
type Site={id:string;lat:number;lon:number;[key:string]:any};
type Link={id:string;u:string;v:string;length_km:number;estimated_cost:number;capacity_gbps:number;geometry:{coordinates:number[][]};[key:string]:any};
type Seed={nodes:Site[];routes:Link[];topologies:Record<string,{edge_ids:string[];status:string}>;provenance:any};
type State={id:string;version:number;schema_version:number;source:string;destination:string;topology:string;clock:number;playing:boolean;speed:number;demand_gbps:number;capacity_gbps:number;cost_per_km:number;detection_delay:number;reconvergence_delay:number;failed:string[];down_nodes:string[];pending:{at:number;edges:string[];nodes:string[]}[];events:{time:number;message:string}[];surge:number;risk_groups:Record<string,{name:string;edge_ids:string[];confidence:string}>};
let seedPromise:Promise<Seed>|undefined;
const storage='fiber-web-demo-v1';
function seed():Promise<Seed>{return seedPromise??=fetch('/demo/network.json').then(async r=>{if(!r.ok)throw Error('Газрын зургийн өгөгдөл ачаалсангүй.');return r.json()})}
function read(id:string):State{const raw=localStorage.getItem(storage);if(!raw)throw Error('Сценари олдсонгүй. Шинэ чиглэл сонгоно уу.');const s=JSON.parse(raw);if(s.id!==id)throw Error('Сценари олдсонгүй.');return s}
function write(s:State){localStorage.setItem(storage,JSON.stringify(s))}
function log(s:State,message:string){s.events.push({time:s.clock,message})}
function edges(s:State,d:Seed):Link[]{const ids=new Set(d.topologies[s.topology].edge_ids);return d.routes.filter(e=>ids.has(e.id)).map(e=>({...e,estimated_cost:e.length_km*s.cost_per_km,capacity_gbps:s.capacity_gbps}))}
function metrics(s:State,d:Seed,links:Link[]){
 const ids=d.nodes.map(n=>n.id);
 const active=links.filter(e=>!s.failed.includes(e.id)&&!s.down_nodes.includes(e.u)&&!s.down_nodes.includes(e.v));
 const adj=new Map(ids.map(id=>[id,[] as {to:string;edge:Link}[]]));
 for(const e of active){adj.get(e.u)!.push({to:e.v,edge:e});adj.get(e.v)!.push({to:e.u,edge:e})}
 function shortest(src:string){
  const dist=new Map(ids.map(id=>[id,Infinity]));const prev=new Map<string,{from:string;edge:Link}>();const todo=new Set(ids);dist.set(src,0);
  while(todo.size){let u:string|undefined;let best=Infinity;for(const id of todo)if(dist.get(id)!<best){best=dist.get(id)!;u=id}if(!u)break;todo.delete(u);
   for(const {to,edge} of adj.get(u)!){const length=best+edge.length_km;if(length<dist.get(to)!){dist.set(to,length);prev.set(to,{from:u,edge})}}
  }
  return {dist,path:(dst:string)=>{if(!Number.isFinite(dist.get(dst)))return {nodes:[] as string[],edges:[] as string[]};const ns=[dst],es:string[]=[];let cur=dst;while(cur!==src){const p=prev.get(cur)!;es.unshift(p.edge.id);ns.unshift(p.from);cur=p.from}return {nodes:ns,edges:es}}};
 }
 const all=new Map(ids.map(id=>[id,shortest(id)]));let pairs=0,maxRtt:number|null=null,violations=0;
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const length=all.get(ids[i])!.dist.get(ids[j])!;if(Number.isFinite(length)){pairs++;const rtt=length*.01;maxRtt=Math.max(maxRtt??0,rtt);if(rtt>50)violations++}}
 function components(skip?:string){const seen=new Set<string>();let count=0;for(const id of ids)if(!seen.has(id)){count++;const todo=[id];seen.add(id);while(todo.length){const u=todo.pop()!;for(const {to,edge} of adj.get(u)!)if(edge.id!==skip&&!seen.has(to)){seen.add(to);todo.push(to)}}}return count}
 const count=components();const route=all.get(s.source)!.path(s.destination);const length=all.get(s.source)!.dist.get(s.destination)!;
 const loads:Record<string,number>=Object.fromEntries(active.map(e=>[e.id,0]));
 for(const id of ids)if(id!=='ulaanbaatar')for(const e of all.get(id)!.path('ulaanbaatar').edges)loads[e]+=2*s.surge;
 for(const e of route.edges)loads[e]+=s.demand_gbps;
 const utilization=Object.fromEntries(active.map(e=>[e.id,loads[e.id]/e.capacity_gbps]));
 return {edge_count:links.length,installed_length_km:links.reduce((a,e)=>a+e.length_km,0),relative_cost:links.reduce((a,e)=>a+e.estimated_cost,0),bridges:active.filter(e=>components(e.id)>count).length,components:count,reachable_cities:[...all.get(s.source)!.dist.values()].filter(Number.isFinite).length,unreachable_pairs:ids.length*(ids.length-1)/2-pairs,max_rtt_ms:maxRtt,rtt_violations:violations,route:route.nodes,route_edges:route.edges,route_length_km:Number.isFinite(length)?length:null,rtt_ms:Number.isFinite(length)?length*.01:null,max_utilization:Math.max(0,...Object.values(utilization)),overloaded_links:Object.keys(utilization).filter(id=>utilization[id]>1),utilization,active_edges:active.map(e=>e.id)};
}
function snapshot(s:State,d:Seed){const links=edges(s,d);return {...s,nodes:d.nodes,edges:links,metrics:metrics(s,d,links),solver_status:d.topologies[s.topology].status,execution_mode:'browser-static-demo'}}
function advance(s:State,dt:number){s.clock+=dt;for(const p of [...s.pending])if(p.at<=s.clock){s.failed=[...new Set([...s.failed,...p.edges])];s.down_nodes=[...new Set([...s.down_nodes,...p.nodes])];s.pending=s.pending.filter(x=>x!==p);log(s,'Илрүүлэлт → маршрут дахин тооцоолов')}}
function positive(n:any,min:number,max:number,label:string){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: ${min}–${max} утга оруулна уу.`);return n}
function nearby(e:Link,body:any){return e.geometry.coordinates.some(([lon,lat])=>{const r=Math.PI/180,dl=(lon-body.lon)*r,dp=(lat-body.lat)*r;const a=Math.sin(dp/2)**2+Math.cos(lat*r)*Math.cos(body.lat*r)*Math.sin(dl/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(a)))<=body.radius_km})}
export async function browserApi(path:string,body?:any):Promise<any>{
 const d=await seed();
 if(path==='/data/status'||path==='/provenance')return d.provenance;
 if(path==='/lab/status')return {available:false,error:'Вэб демо нь бодит чиглүүлэгч ажиллуулахгүй. OSPF лабораторийг компьютер дээрээ локал ажиллуулна.'};
 if(path.startsWith('/lab/'))throw Error('Бодит OSPF зөвхөн локал хувилбарт ажиллана.');
 if(path==='/simulation/runs'){
  const defaults={topology:'resilient',source:'ulaanbaatar',destination:'khovd',demand_gbps:10,capacity_gbps:100,cost_per_km:1,detection_delay:1,reconvergence_delay:2};const b={...defaults,...body};
  if(!d.topologies[b.topology]||![b.source,b.destination].every(id=>d.nodes.some(n=>n.id===id)))throw Error('Хот эсвэл сүлжээний сонголт буруу.');
  for(const [key,min,max] of [['demand_gbps',0,10000],['capacity_gbps',.000001,100000],['cost_per_km',.000001,1000000],['detection_delay',0,120],['reconvergence_delay',0,120]] as const)positive(b[key],min,max,key);
  const s:State={...b,id:crypto.randomUUID(),schema_version:1,version:1,clock:0,playing:false,speed:1,failed:[],down_nodes:[],pending:[],events:[],surge:1,risk_groups:{}};log(s,'Сценари үүсгэв · хөтөчийн симуляци');write(s);return snapshot(s,d);
 }
 const match=path.match(/^\/simulation\/runs\/([^/]+)(?:\/(.*))?$/);if(!match)throw Error('Үйлдэл олдсонгүй.');
 const s=read(match[1]),op=match[2];if(!op||op==='metrics')return snapshot(s,d);
 const links=edges(s,d),valid=new Set(links.map(e=>e.id));
 if(op==='control'){
  if(body.action==='reset')Object.assign(s,{clock:0,failed:[],down_nodes:[],pending:[],events:[],surge:1,playing:false});
  else if(body.action==='step')advance(s,1);
  else if(body.action==='speed')s.speed=positive(body.speed,.25,20,'Хурд');
  else if(['play','pause'].includes(body.action))s.playing=body.action==='play';else throw Error('Үйлдэл буруу.');
 }else if(op==='repair'){
  if(body.asset_id){if(!valid.has(body.asset_id))throw Error('Кабель олдсонгүй.');s.failed=s.failed.filter(x=>x!==body.asset_id);for(const p of s.pending)p.edges=p.edges.filter(x=>x!==body.asset_id)}
  else Object.assign(s,{failed:[],down_nodes:[],pending:[],surge:1});log(s,'Засвар → сэргэлт');
 }else if(op==='risk-groups'){
  if(!Array.isArray(body.edge_ids)||new Set(body.edge_ids).size<2||!body.edge_ids.every((id:string)=>valid.has(id)))throw Error('Хоёр өөр кабель сонгоно уу.');s.risk_groups[crypto.randomUUID()]={name:String(body.name).slice(0,80),edge_ids:[...new Set<string>(body.edge_ids)],confidence:'user-assumed; not verified physical sharing'};log(s,'Таамагласан SRLG бүлэг үүсгэв');
 }else if(op==='incidents'||op==='incidents/preview'){
  let affected:string[]=[],down:string[]=[];
  if(body.kind==='radius'){
   positive(body.lon,87,120,'Уртраг');positive(body.lat,41,53,'Өргөрөг');positive(body.radius_km,.0001,1000,'Радиус');affected=links.filter(e=>nearby(e,body)).map(e=>e.id);
  }else if(body.kind==='corridor'&&s.risk_groups[body.asset_id])affected=s.risk_groups[body.asset_id].edge_ids;
  else if(['cut','corridor'].includes(body.kind)){if(!valid.has(body.asset_id))throw Error('Кабель олдсонгүй.');affected=[body.asset_id]}
  else if(body.kind==='node'){if(!d.nodes.some(n=>n.id===body.asset_id))throw Error('Хот олдсонгүй.');down=[body.asset_id];affected=links.filter(e=>[e.u,e.v].includes(body.asset_id)).map(e=>e.id)}
  else if(body.kind==='surge')s.surge=positive(body.multiplier,1,100,'Өсөлт');else throw Error('Ослын төрөл буруу.');
  if(op.endsWith('preview'))return {edge_ids:affected,rule:'Sampled approximate alignment within radius; spherical distance approximation'};
  log(s,`Осол: ${body.kind} · ${affected.length} холбоос`);if(affected.length||down.length)s.pending.push({at:s.clock+s.detection_delay+s.reconvergence_delay,edges:affected,nodes:down});
 }else throw Error('Үйлдэл олдсонгүй.');
 s.version++;write(s);return snapshot(s,d);
}
export function subscribeBrowser(id:string,onUpdate:(s:any)=>void,onError:(e:unknown)=>void){
 const timer=setInterval(async()=>{try{const s=read(id);if(s.playing){advance(s,s.speed);s.version++;write(s)}onUpdate(snapshot(s,await seed()))}catch(e){onError(e)}},1000);return()=>clearInterval(timer);
}
export async function downloadBrowser(id:string,format:string){
 const s=read(id),snap=snapshot(s,await seed());let data:any=snap,type='application/json';
 if(format==='geojson')data={type:'FeatureCollection',features:snap.edges.map(e=>({type:'Feature',geometry:e.geometry,properties:Object.fromEntries(Object.entries(e).filter(([k])=>k!=='geometry'))}))};
 if(format==='csv'){type='text/csv';data=['id,length_km,capacity_gbps,relative_cost',...snap.edges.map(e=>[e.id,e.length_km,e.capacity_gbps,e.estimated_cost].join(','))].join('\n')}
 const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=`network.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
