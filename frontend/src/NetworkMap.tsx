import {useEffect,useMemo,useRef,useState} from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {Dataset,Cable,Topology} from './graph';
import type {TraceStep} from './walkthrough';
import {packetPath,packetPosition,roundTripPhase} from './packet';
import type {PacketStatus} from './packet';
export const COLORS={mst:'#c44242',resilient:'#2563b0',mesh:'#27804a'};
type Props={packetStatus?:PacketStatus;packetRtt?:number|null;onPacketStop?:()=>void;packetRun?:number|null;packetNodes?:string[];onPacketStatus?:(status:PacketStatus)=>void;trace?:TraceStep|null;baselineRoute?:string[];graph:Dataset;edges:Cable[];topology:Topology;route:string[];failed:string[];bridgeIds:string[];highlight:boolean;selectedCity:string;selectedCable:string;onCity:(id:string)=>void;onCable:(id:string)=>void};
export function NetworkMap(p:Props){
 const container=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),lines=useRef<L.LayerGroup|null>(null),cities=useRef<L.LayerGroup|null>(null),latest=useRef(p),fitted=useRef(false);latest.current=p;
 const [tileError,setTileError]=useState(false);
 useEffect(()=>{if(!container.current)return;const m=L.map(container.current,{preferCanvas:false,zoomSnap:.25,zoomDelta:.5,zoomControl:true,center:[46.8,103],zoom:5,minZoom:2,maxZoom:15});map.current=m;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>setTileError(true)).addTo(m);
  m.createPane('packetPane');m.getPane('packetPane')!.style.zIndex='680';m.getPane('packetPane')!.style.pointerEvents='none';
  m.createPane('cityPane');m.getPane('cityPane')!.style.zIndex='650';lines.current=L.layerGroup().addTo(m);cities.current=L.layerGroup().addTo(m);
  const observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);
  return()=>{observer.disconnect();m.remove();map.current=null;fitted.current=false};
 },[]);
 useEffect(()=>{const m=map.current,layer=cities.current;if(!m||!layer)return;layer.clearLayers();
  for(const n of p.graph.nodes){const marker=L.circleMarker([n.lat,n.lon],{pane:'cityPane',radius:n.id===p.trace?.current?8:n.id===p.selectedCity?6:4,color:n.id===p.trace?.current?'#d39b19':'#344458',fillColor:p.trace?.visited.includes(n.id)?'#2563b0':'#fff',fillOpacity:1,weight:1.7,bubblingMouseEvents:false});const text=document.createElement('span');text.textContent=n.name;const labelPositions:Record<string,{direction:L.Direction;offset:[number,number]}>= {choibalsan:{direction:'left',offset:[-7,0]},ulaanbaatar:{direction:'top',offset:[0,-7]},zuunmod:{direction:'bottom',offset:[0,7]},erdenet:{direction:'top',offset:[0,-7]},bulgan:{direction:'bottom',offset:[0,7]},bayankhongor:{direction:'left',offset:[-7,0]}};marker.bindTooltip(text,{permanent:true,className:'city-label',...(labelPositions[n.id]??{direction:'right' as L.Direction,offset:[6,0] as [number,number]})});marker.on('click',()=>latest.current.onCity(n.id));marker.addTo(layer);const element=marker.getElement();if(element){element.setAttribute('role','button');element.setAttribute('aria-label','Хот: '+n.name);element.setAttribute('tabindex','0');element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();event.stopPropagation();latest.current.onCity(n.id)}})}}
  if(!fitted.current&&p.graph.nodes.length){m.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false});fitted.current=true;}
 },[p.graph.nodes,p.selectedCity,p.trace]);
 useEffect(()=>{const layer=lines.current;if(!layer)return;layer.clearLayers();const route=new Set(p.route),bridges=new Set(p.bridgeIds);const sorted=[...p.edges].sort((a,b)=>Number(route.has(a.id))-Number(route.has(b.id))||Number(a.id===p.selectedCable)-Number(b.id===p.selectedCable)||Number(p.failed.includes(a.id))-Number(p.failed.includes(b.id)));
  if(!p.trace)for(const e of p.edges.filter(e=>p.baselineRoute?.includes(e.id))){const a=p.graph.nodes.find(n=>n.id===e.u)!,b=p.graph.nodes.find(n=>n.id===e.v)!;const points=e.geometry?.coordinates?.map(c=>[c[1],c[0]] as [number,number])??[[a.lat,a.lon],[b.lat,b.lon]] as [number,number][];L.polyline(points,{color:'#7c648e',weight:7,opacity:.6,dashArray:'3 8',interactive:false}).addTo(layer)}
  for(const e of sorted){if(p.trace&&!p.trace.edgeIds.includes(e.id)&&p.trace.candidate!==e.id)continue;const a=p.graph.nodes.find(n=>n.id===e.u)!,b=p.graph.nodes.find(n=>n.id===e.v)!;const points=e.geometry?.coordinates?.map(c=>[c[1],c[0]] as [number,number])??[[a.lat,a.lon],[b.lat,b.lon]] as [number,number][];const failed=p.failed.includes(e.id),selected=e.id===p.selectedCable,onRoute=route.has(e.id),bridge=p.highlight&&bridges.has(e.id);const color=p.trace?(p.trace.candidate===e.id?'#d39b19':'#2563b0'):failed?'#27303e':onRoute?'#d87b12':bridge?'#d39b19':COLORS[p.topology];
   const line=L.polyline(points,{color,weight:p.trace?4:selected?5:onRoute?4:bridge?3:1.6,opacity:p.trace?1:failed||onRoute||selected?1:p.topology==='mesh'?.34:.75,dashArray:failed?'8 6':undefined,bubblingMouseEvents:false}).on('click',()=>latest.current.onCable(e.id));line.addTo(layer);const element=line.getElement();if(element){element.setAttribute('role','button');element.setAttribute('aria-label',`Кабель: ${a.name} — ${b.name}`);element.setAttribute('tabindex','-1')}
   L.polyline(points,{color:'#000',weight:15,opacity:0,bubblingMouseEvents:false}).on('click',()=>latest.current.onCable(e.id)).addTo(layer);
  }
 },[p.graph,p.edges,p.topology,p.route,p.failed,p.bridgeIds,p.highlight,p.selectedCable,p.trace,p.baselineRoute]);
 const nodeKey=(p.packetNodes??[]).join('|'),edgeKey=p.route.join('|'),failedKey=p.failed.join('|');
 const path=useMemo(()=>packetPath(p.graph,p.packetNodes??[],p.route),[p.graph,nodeKey,edgeKey]);
 useEffect(()=>{
  const m=map.current;if(!m||p.packetRun==null||!path)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches){p.onPacketStatus?.('reduced');return}
  const icon=L.divIcon({className:'packet-marker',iconSize:[24,20],iconAnchor:[12,10],html:'<span class="packet-envelope" aria-hidden="true"><svg viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="3"/><path d="m2 3 10 7 10-7"/></svg></span>'});
  const marker=L.marker(packetPosition(path,0),{icon,pane:'packetPane',interactive:false,keyboard:false,zIndexOffset:1000}).addTo(m);
  let frame=0,start:number|undefined,stage:PacketStatus='outbound',cancelled=false;
  const legDuration=Math.min(6000,Math.max(2000,1500+p.route.length*350));
  p.onPacketStatus?.('outbound');
  function animate(now:number){
   if(cancelled)return;
   start??=now;const phase=roundTripPhase(now-start,legDuration);
   marker.setLatLng(packetPosition(path!,phase.progress));
   if(phase.status!==stage){stage=phase.status;marker.getElement()?.classList.toggle('packet-reply',stage==='returning');p.onPacketStatus?.(stage)}
   if(phase.status==='complete'){marker.remove();return}
   frame=requestAnimationFrame(animate);
  }
  const reduce=()=>{if(preference.matches){cancelled=true;cancelAnimationFrame(frame);marker.remove();p.onPacketStatus?.('reduced')}};
  preference.addEventListener('change',reduce);frame=requestAnimationFrame(animate);
  return()=>{cancelled=true;cancelAnimationFrame(frame);preference.removeEventListener('change',reduce);marker.remove()};
 },[p.packetRun,path,failedKey,p.onPacketStatus]);
 const fit=()=>{if(map.current&&p.graph.nodes.length)map.current.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false})};
 return <div className="map-frame"><div ref={container} className="network-map" aria-label="Монголын хот ба кабелийн газрын зураг"/>{(p.packetStatus==='outbound'||p.packetStatus==='returning')&&<div className="packet-map-status"><span>{p.packetStatus==='outbound'?'Очих →':'← Буцах'} · RTT {p.packetRtt?.toLocaleString('mn-MN',{maximumFractionDigits:2})} ms</span><button onClick={p.onPacketStop}>Зогсоох</button></div>}<button className="map-fit" onClick={fit}>Бүх хотыг харах</button>{tileError&&<div className="tile-error" role="status">Суурь зураг татагдсангүй. Хот, кабелийн зураглал ажиллаж байна.</div>}<div className="map-legend"><span><i style={{background:p.trace?'#2563b0':COLORS[p.topology]}}/>{p.trace?'Алгоритмын алхам':'Кабель'}</span><span><i style={{background:'#d87b12'}}/>Маршрут</span><span><i className="dashed"/>Тасарсан</span>{!!p.baselineRoute?.length&&!p.trace&&<span><i style={{background:'#7c648e'}}/>Өмнөх зам</span>}{p.highlight&&<span><i style={{background:'#d39b19'}}/>Гүүр</span>}</div></div>;
}
