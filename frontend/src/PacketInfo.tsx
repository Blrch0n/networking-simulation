import type {City} from './graph';
import type {PacketStatus} from './packet';
type Props={nodes:City[];ips:Map<string,string>;source:string;destination:string;route:string[];status:PacketStatus;targetHop:number|null};
export function PacketInfo({nodes,ips,source,destination,route,status,targetHop}:Props){
 const returning=status==='returning',active=status==='outbound'||returning;
 const ordered=returning?[...route].reverse():route;
 const from=returning?destination:source,to=returning?source:destination;
 const target=returning&&targetHop!==null?route.length-1-targetHop:targetHop;
 const name=(id:string)=>nodes.find(node=>node.id===id)?.name??'—';
 return <section className="packet-info" aria-label="Пакетын IP ба hop"><dl><div><dt>Source IP</dt><dd><code>{ips.get(from)??'—'}</code><span>{name(from)}</span></dd></div><div><dt>Destination IP</dt><dd><code>{ips.get(to)??'—'}</code><span>{name(to)}</span></dd></div></dl><small>Симуляцийн IP · бодит traceroute биш</small>
 <details className="hop-details"><summary>Hop жагсаалт <span>{ordered.length?ordered.length-1:'—'} hop</span></summary>{ordered.length?<ol className="hop-list" start={0}>{ordered.map((id,index)=><li key={id} aria-current={active&&index===target?'step':undefined}><span className="hop-index">{index}</span><div><b>{name(id)}</b><code>{ips.get(id)}</code></div>{active&&index===target&&<span className="hop-active">чиглэж буй</span>}</li>)}</ol>:<p className="note">Хүрэх зам байхгүй.</p>}</details></section>;
}
