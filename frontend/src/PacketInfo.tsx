import type {City,Cable} from './graph';
import type {PacketStatus} from './packet';
import {packetHopPair} from './transport';
import {tracerouteRows} from './packetInfo';
type Props={hopRtts?:Map<string,number>;satellite?:boolean;nodes:City[];edges:Cable[];ips:Map<string,string>;source:string;destination:string;route:string[];status:PacketStatus;targetHop:number|null};
export function PacketInfo({nodes,edges,ips,source,destination,route,status,targetHop,hopRtts,satellite}:Props){
 const rows=tracerouteRows(nodes,edges,route,ips,hopRtts);
 const name=(id:string)=>nodes.find(node=>node.id===id)?.name??id;
 const active=status==='outbound'||status==='returning';
 const destinationIp=ips.get(destination)??'—';
 const sourceId=status==='returning'?destination:source,destinationId=status==='returning'?source:destination;
 const pair=active?packetHopPair(route,targetHop,status==='returning'):null;
 const hopIp=(id:string)=>id===source?ips.get(id):rows.find(row=>row.id===id)?.ip;
 return <section className="packet-info" aria-label="Пакетын IP ба hop">
 <dl><div><dt>Source IP · {name(sourceId)}</dt><dd><code>{ips.get(sourceId)}</code></dd></div><div><dt>Destination IP · {name(destinationId)}</dt><dd><code>{ips.get(destinationId)}</code></dd></div></dl>
 {pair&&<div className="live-hop" aria-live="polite"><span>{status==='returning'?'Буцах пакет':'Очих пакет'} · Одоогийн → Дараагийн hop</span><b>{name(pair.current)} → {name(pair.next)}</b><code>{hopIp(pair.current)} → {hopIp(pair.next)}</code></div>}
 <details className="hop-details" open><summary>Traceroute <span>{rows.length} hops</span></summary>
 <div className="trace-terminal" tabIndex={0} aria-label="Симуляцийн traceroute үр дүн">
 <div className="trace-command">$ traceroute {destination}</div>
 <div className="trace-caption">traceroute to {destination} ({destinationIp}), {Math.max(30,rows.length)} hops max, 60 byte packets</div>
 {rows.length?<table><thead><tr><th>Hop</th><th>Router / IP</th><th>1 · ms</th><th>2 · ms</th><th>3 · ms</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} aria-current={active&&route.indexOf(row.id)===targetHop?'step':undefined}><td>{row.hop}</td><td><b>{row.name}</b><code>{row.ip}</code><small>{row.kind}</small></td>{[1,2,3].map(probe=><td key={probe}>{row.rtt.toFixed(3)}</td>)}</tr>)}</tbody></table>:<p>Хүрэх зам байхгүй.</p>}
 </div><small className="trace-note">Симуляц · IP нь жишээ.{satellite?' Starlink RTT нь өгсөн таамаг; бодит сүлжээний хэмжилт биш.':''} 3 probe-ийн RTT нь ижил загварын тооцоо; бодит хэмжилт биш.</small>
 </details></section>;
}
