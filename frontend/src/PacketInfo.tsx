import type {City} from './graph';
import type {PacketStatus} from './packet';
import {packetAddresses,EXAMPLE_INTERNET_IP,EXAMPLE_GATEWAY_IP} from './packetInfo';
type Props={nodes:City[];ips:Map<string,string>;source:string;destination:string;route:string[];status:PacketStatus;targetHop:number|null};
export function PacketInfo({nodes,ips,source,destination,route,status,targetHop}:Props){
 const returning=status==='returning',active=status==='outbound'||returning;
 const ordered=returning?[...route].reverse():route;
 const addresses=packetAddresses(ips,destination,returning);
 const target=returning&&targetHop!==null?route.length-1-targetHop:targetHop;
 const name=(id:string)=>nodes.find(node=>node.id===id)?.name??'—';
 const publicSide=<div className="public-trace" aria-label="Гаднах public талын жишээ">{(returning?[['NAT gateway',EXAMPLE_GATEWAY_IP],['Internet',EXAMPLE_INTERNET_IP]]:[['Internet',EXAMPLE_INTERNET_IP],['NAT gateway',EXAMPLE_GATEWAY_IP]]).map(([label,ip])=><div key={ip}><b>{label}</b><code>{ip}</code><span className="ip-kind public-ip">Public жишээ</span></div>)}</div>;
 return <section className="packet-info" aria-label="Пакетын IP ба hop"><dl><div><dt>Source IP</dt><dd><code>{addresses.source}</code><span>{addresses.sourceType} · {returning?name(destination):'Internet'}</span></dd></div><div><dt>Destination IP</dt><dd><code>{addresses.destination}</code><span>{addresses.destinationType} · {returning?'Internet':name(destination)}</span></dd></div></dl><div className="nat-address"><span>NAT жишээ</span><code>{EXAMPLE_GATEWAY_IP} ⇄ {ips.get(destination)??'—'}</code></div><small>Симуляц · RTT зөвхөн хотын зам · бодит traceroute биш</small>
 <details className="hop-details"><summary>Public / Private trace <span>{ordered.length?ordered.length-1:'—'} хотын hop</span></summary>{!returning&&publicSide}<p className="trace-boundary">{returning?'Private → Public':'Public → Private'} · Орох хот: {name(source)}</p>{ordered.length?<ol className="hop-list" start={0}>{ordered.map((id,index)=><li key={id} aria-current={active&&index===target?'step':undefined}><span className="hop-index">{index}</span><div><b>{name(id)}</b><code>{ips.get(id)}</code></div><span className="ip-kind">Private</span>{active&&index===target&&<span className="hop-active">чиглэж буй</span>}</li>)}</ol>:<p className="note">Хүрэх зам байхгүй.</p>}{returning&&publicSide}</details></section>;
}
