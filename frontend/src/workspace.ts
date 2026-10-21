import {validateDataset} from './graph.ts';
import type {Dataset,Topology} from './graph.ts';
export type Workspace={schema_version:2;graph:Dataset;undo:Dataset|null;source:string;destination:string;topology:Topology};
export const STORAGE_KEY='fiber-planner-workspace-v2';
export const defaults=(graph:Dataset):Workspace=>({schema_version:2,graph,undo:null,source:graph.nodes.find(n=>n.id==='ulaanbaatar')?.id??graph.nodes[0]?.id??'',destination:graph.nodes.find(n=>n.id==='khovd')?.id??graph.nodes.at(-1)?.id??'',topology:'resilient'});
export function endpoints(w:Workspace):Workspace{const ids=new Set(w.graph.nodes.map(n=>n.id));return {...w,source:ids.has(w.source)?w.source:w.graph.nodes[0]?.id??'',destination:ids.has(w.destination)?w.destination:w.graph.nodes.at(-1)?.id??''};}
export function loadWorkspace(original:Dataset,storage:Pick<Storage,'getItem'>):{workspace:Workspace;notice:string}{try{const raw=storage.getItem(STORAGE_KEY);if(!raw)return {workspace:defaults(original),notice:''};const data=JSON.parse(raw);if(data.schema_version!==2||!['mst','resilient','mesh'].includes(data.topology)||typeof data.source!=='string'||typeof data.destination!=='string')throw Error();const graph=validateDataset(data.graph),undo=data.undo?validateDataset(data.undo):null;return {workspace:endpoints({...data,graph,undo}),notice:''};}catch{return {workspace:defaults(original),notice:'Хадгалсан өгөгдөл буруу эсвэл хадгалалт боломжгүй. Анхны өгөгдлөөр үргэлжилж байна.'};}}
export function persistWorkspace(w:Workspace,storage:Pick<Storage,'setItem'>){try{storage.setItem(STORAGE_KEY,JSON.stringify(w));return ''}catch{return 'Хөтөчийн хадгалалт боломжгүй. Өөрчлөлт одоо ажиллах боловч refresh хийхэд хадгалагдахгүй.';}}
export function changeGraph(w:Workspace,graph:Dataset):Workspace{return endpoints({...w,graph:validateDataset(graph),undo:w.graph});}
export function undoGraph(w:Workspace):Workspace{if(!w.undo)return w;return endpoints({...w,graph:w.undo,undo:w.graph});}
