import {cmp,pair,shortest} from './graph.ts';
import type {Cable,Dataset} from './graph.ts';
export type TraceStep={edgeIds:string[];candidate:string|null;visited:string[];current:string|null;distances:Record<string,number>;message:string;accepted?:boolean};
const order=(a:Cable,b:Cable)=>a.length_km-b.length_km||cmp(pair(a.u,a.v),pair(b.u,b.v))||cmp(a.id,b.id);
export function kruskalTrace(graph:Dataset):TraceStep[]{
 const name=(id:string)=>graph.nodes.find(n=>n.id===id)?.name??id;
 const parent=new Map(graph.nodes.map(n=>[n.id,n.id]));
 const find=(id:string):string=>{const p=parent.get(id)!;return p===id?id:find(p)};
 const edgeIds:string[]=[];
 const steps:TraceStep[]=[{edgeIds:[],candidate:null,visited:[],current:null,distances:{},message:'Кабелиудыг уртаар нь эрэмбэлнэ. Хоёр өөр бүрэлдэхүүнийг холбох кабелийг нэмнэ.'}];
 for(const edge of [...graph.edges].sort(order)){
  const u=find(edge.u),v=find(edge.v),accepted=u!==v;
  if(accepted){parent.set(u,v);edgeIds.push(edge.id)}
  steps.push({edgeIds:[...edgeIds],candidate:edge.id,visited:[],current:null,distances:{},accepted,message:`${name(edge.u)} — ${name(edge.v)} · ${edge.length_km.toFixed(2)} км. ${accepted?'Нэмэв: хоёр өөр бүрэлдэхүүнийг холбоно.':'Алгасав: хоёр хот аль хэдийн холбогдсон тул цикл үүсгэнэ.'}`});
 }
 const connected=graph.nodes.length>0&&new Set(graph.nodes.map(n=>find(n.id))).size===1;
 steps.push({edgeIds:[...edgeIds],candidate:null,visited:[],current:null,distances:{},message:connected?`MST бэлэн: ${edgeIds.length} кабель. Нийт урт хамгийн бага.`:'Бүх хотыг холбох боломжгүй. Боломжит графын модны ойг харуулав.'});
 return steps;
}
export function dijkstraTrace(graph:Dataset,edges:Cable[],source:string,destination:string):TraceStep[]{
 const ids=graph.nodes.map(n=>n.id).sort(cmp),todo=new Set(ids),visited:string[]=[],previous=new Map<string,string>();
 const distances:Record<string,number>=Object.fromEntries(ids.map(id=>[id,Infinity]));
 if(todo.has(source))distances[source]=0;
 const name=(id:string)=>graph.nodes.find(n=>n.id===id)?.name??id;
 const snapshot=(message:string,current:string|null):TraceStep=>({edgeIds:[...previous.values()],candidate:null,visited:[...visited],current,distances:{...distances},message});
 const steps=[snapshot('Эхлэх хотын зай 0 км. Бусад хотын зай одоогоор тодорхойгүй (∞).',null)];
 while(todo.size){
  let current:string|undefined,best=Infinity;
  for(const id of todo)if(distances[id]<best){current=id;best=distances[id]}
  if(current===undefined)break;
  todo.delete(current);visited.push(current);let changes=0;
  const neighbours=edges.filter(e=>e.u===current||e.v===current).map(e=>({edge:e,to:e.u===current?e.v:e.u})).sort((a,b)=>cmp(a.to,b.to)||cmp(a.edge.id,b.edge.id));
  for(const {edge,to} of neighbours){const next=best+edge.length_km;if(next<distances[to]){distances[to]=next;previous.set(to,edge.id);changes++}}
  steps.push(snapshot(`${name(current)}: ${best.toFixed(2)} км зайг баталгаажуулав. ${changes} хөршийн боломжит зай шинэчлэгдэв.`,current));
  if(current===destination)break;
 }
 const result=shortest(graph.nodes,edges,source,destination);
 steps.push({...snapshot(result.length_km===null?'Хүрэх хот руу зам байхгүй. Боломжит хотуудыг шалгаж дууслаа.':`Хамгийн богино зам: ${result.length_km.toFixed(2)} км · ${(result.length_km*.01).toFixed(2)} ms тархалтын RTT.`,null),edgeIds:result.route_edges});
 return steps;
}
