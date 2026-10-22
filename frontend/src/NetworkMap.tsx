import type {Congestion} from './congestion';
import {SATELLITE_ID} from './transport';
import type {ReactNode} from 'react';
import {useEffect,useMemo,useRef,useState} from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {Dataset,Cable,Topology} from './graph';
import type {TraceStep} from './walkthrough';
import {packetPath,packetPosition,packetTargetHop,roundTripPhase} from './packet';
import type {PacketStatus} from './packet';
export const COLORS={mst:'#c44242',resilient:'#2563b0',mesh:'#27804a'};
type Props={congestion?:Congestion;satelliteEdgeIds?:string[];packetControls?:ReactNode;cableTools?:ReactNode;onSourceCity?:(id:string)=>void;onDestinationCity?:(id:string)=>void;packetHopLabel?:string;packetAddressLabel?:string;onPacketHop?:(index:number)=>void;packetStatus?:PacketStatus;packetRtt?:number|null;onPacketStop?:()=>void;packetRun?:number|null;packetNodes?:string[];onPacketStatus?:(status:PacketStatus)=>void;trace?:TraceStep|null;baselineRoute?:string[];graph:Dataset;edges:Cable[];topology:Topology;route:string[];failed:string[];bridgeIds:string[];highlight:boolean;selectedCity:string;selectedCable:string;onCity:(id:string)=>void;onCable:(id:string)=>void};
export function NetworkMap(p:Props){
 const container=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),lines=useRef<L.LayerGroup|null>(null),cities=useRef<L.LayerGroup|null>(null),latest=useRef(p),fitted=useRef(false);latest.current=p;
 const [tileError,setTileError]=useState(false);
 const canSelectRoute=Boolean(p.onSourceCity&&p.onDestinationCity);
 useEffect(()=>{if(!container.current)return;const m=L.map(container.current,{preferCanvas:false,zoomSnap:.25,zoomDelta:.5,zoomControl:true,center:[46.8,103],zoom:5,minZoom:2,maxZoom:15});map.current=m;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>setTileError(true)).addTo(m);
  m.createPane('packetPane');m.getPane('packetPane')!.style.zIndex='680';m.getPane('packetPane')!.style.pointerEvents='none';
  m.createPane('cityPane');m.getPane('cityPane')!.style.zIndex='650';lines.current=L.layerGroup().addTo(m);cities.current=L.layerGroup().addTo(m);
  const observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);
  return()=>{observer.disconnect();m.remove();map.current=null;fitted.current=false};
 },[]);
 useEffect(()=>{const m=map.current,layer=cities.current;if(!m||!layer)return;layer.clearLayers();
  for(const n of p.graph.nodes){const marker=L.circleMarker([n.lat,n.lon],{pane:'cityPane',radius:n.id===SATELLITE_ID?9:n.id===p.trace?.current?8:n.id===p.selectedCity?6:4,color:n.id===SATELLITE_ID?'#8558b6':n.id===p.trace?.current?'#d39b19':'#344458',fillColor:p.trace?.visited.includes(n.id)?'#2563b0':'#fff',fillOpacity:1,weight:1.7,bubblingMouseEvents:false});const text=document.createElement('span');text.textContent=n.name;const labelPositions:Record<string,{direction:L.Direction;offset:[number,number]}>= {choibalsan:{direction:'left',offset:[-7,0]},ulaanbaatar:{direction:'top',offset:[0,-7]},zuunmod:{direction:'bottom',offset:[0,7]},erdenet:{direction:'top',offset:[0,-7]},bulgan:{direction:'bottom',offset:[0,7]},bayankhongor:{direction:'left',offset:[-7,0]}};marker.bindTooltip(text,{permanent:true,className:'city-label',...(labelPositions[n.id]??{direction:'right' as L.Direction,offset:[6,0] as [number,number]})});const popup=document.createElement('div');popup.className='city-map-popup';
   const title=document.createElement('h3');title.textContent=n.name;popup.append(title);
   const coordinates=document.createElement('p');coordinates.textContent=n.id===SATELLITE_ID?'Зураглалын байрлал · бодит тойрог зам биш':`${n.lat.toLocaleString('mn-MN',{maximumFractionDigits:5})}° N, ${n.lon.toLocaleString('mn-MN',{maximumFractionDigits:5})}° E`;popup.append(coordinates);
   if(canSelectRoute&&n.id!==SATELLITE_ID){const actions=document.createElement('div');actions.className='city-popup-actions';
    for(const [label,action] of [['Эхлэх хот болгох','source'],['Хүрэх хот болгох','destination']] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{if(action==='source')latest.current.onSourceCity?.(n.id);else latest.current.onDestinationCity?.(n.id);marker.closePopup()});actions.append(button)}popup.append(actions)}
   marker.bindPopup(popup,{className:'city-popup',maxWidth:260,minWidth:210,autoPanPaddingTopLeft:L.point(12,70)});
   marker.on('click',()=>{if(n.id!==SATELLITE_ID)latest.current.onCity(n.id)});marker.addTo(layer);if(n.id===p.selectedCity)marker.openPopup();const element=marker.getElement();if(element){element.setAttribute('role','button');element.setAttribute('aria-label','Хот: '+n.name);element.setAttribute('tabindex','0');element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();event.stopPropagation();marker.openPopup();if(n.id!==SATELLITE_ID)latest.current.onCity(n.id)}})}}
  if(!fitted.current&&p.graph.nodes.length){m.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false});fitted.current=true;}
 },[p.graph.nodes,p.selectedCity,p.trace,canSelectRoute]);
 useEffect(()=>{const layer=lines.current;if(!layer)return;layer.clearLayers();const route=new Set(p.route),bridges=new Set(p.bridgeIds);const sorted=[...p.edges].sort((a,b)=>Number(route.has(a.id))-Number(route.has(b.id))||Number(a.id===p.selectedCable)-Number(b.id===p.selectedCable)||Number(p.failed.includes(a.id))-Number(p.failed.includes(b.id)));
  if(!p.trace)for(const e of p.edges.filter(e=>p.baselineRoute?.includes(e.id))){const a=p.graph.nodes.find(n=>n.id===e.u)!,b=p.graph.nodes.find(n=>n.id===e.v)!;const points=e.geometry?.coordinates?.map(c=>[c[1],c[0]] as [number,number])??[[a.lat,a.lon],[b.lat,b.lon]] as [number,number][];L.polyline(points,{color:'#7c648e',weight:7,opacity:.6,dashArray:'3 8',interactive:false}).addTo(layer)}
  for(const e of sorted){if(p.trace&&!p.trace.edgeIds.includes(e.id)&&p.trace.candidate!==e.id)continue;const a=p.graph.nodes.find(n=>n.id===e.u)!,b=p.graph.nodes.find(n=>n.id===e.v)!;const points=e.geometry?.coordinates?.map(c=>[c[1],c[0]] as [number,number])??[[a.lat,a.lon],[b.lat,b.lon]] as [number,number][];const satellite=p.satelliteEdgeIds?.includes(e.id),failed=p.failed.includes(e.id),selected=e.id===p.selectedCable,onRoute=route.has(e.id),bridge=p.highlight&&bridges.has(e.id);const congested=!failed&&(p.congestion?.[e.id]??0)>0;const color=satellite?'#8558b6':p.trace?(p.trace.candidate===e.id?'#d39b19':'#2563b0'):failed?'#27303e':congested?'#c76b08':onRoute?'#d87b12':bridge?'#d39b19':COLORS[p.topology];
   const line=L.polyline(points,{color,weight:p.trace?4:selected?5:congested?5:onRoute?4:bridge?3:1.6,opacity:p.trace?1:failed||onRoute||selected?1:p.topology==='mesh'?.34:.75,dashArray:satellite?'6 5':failed?'8 6':congested?'2 5':undefined,interactive:!satellite,bubblingMouseEvents:false}).on('click',()=>{if(!satellite)latest.current.onCable(e.id)});line.addTo(layer);const element=line.getElement();if(element&&!satellite){element.setAttribute('role','button');element.setAttribute('aria-label',`Кабель: ${a.name} — ${b.name}`);element.setAttribute('tabindex','-1')}
   if(congested){const label=document.createElement('span');label.textContent=`${a.name} — ${b.name} · +${p.congestion?.[e.id]} ms RTT`;line.bindTooltip(label)}
   if(!satellite)L.polyline(points,{color:'#000',weight:15,opacity:0,bubblingMouseEvents:false}).on('click',()=>latest.current.onCable(e.id)).addTo(layer);
  }
 },[p.graph,p.edges,p.topology,p.route,p.failed,p.bridgeIds,p.highlight,p.selectedCable,p.trace,p.baselineRoute,p.congestion]);
 const nodeKey=(p.packetNodes??[]).join('|'),edgeKey=p.route.join('|'),failedKey=p.failed.join('|');
 useEffect(()=>{const m=map.current;if(!m||!p.satelliteEdgeIds?.length)return;const routePoints=(p.packetNodes??[]).map(id=>p.graph.nodes.find(node=>node.id===id)).filter(node=>node!==undefined).map(node=>[node.lat,node.lon] as [number,number]);if(routePoints.length>1)m.fitBounds(L.latLngBounds(routePoints),{paddingTopLeft:[48,110],paddingBottomRight:[35,65],maxZoom:7,animate:false})},[nodeKey,!!p.satelliteEdgeIds?.length]);
 const path=useMemo(()=>packetPath(p.graph,p.packetNodes??[],p.route),[p.graph,nodeKey,edgeKey]);
 useEffect(()=>{
  const m=map.current;if(!m||p.packetRun==null||!path)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches){p.onPacketStatus?.('reduced');return}
  const icon=L.divIcon({className:'packet-marker',iconSize:[24,20],iconAnchor:[12,10],html:'<span class="packet-envelope" aria-hidden="true"><svg viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="3"/><path d="m2 3 10 7 10-7"/></svg></span>'});
  const marker=L.marker(packetPosition(path,0),{icon,pane:'packetPane',interactive:false,keyboard:false,zIndexOffset:1000}).addTo(m);
  let frame=0,start:number|undefined,stage:PacketStatus='outbound',cancelled=false;
  const legDuration=Math.min(6000,Math.max(2000,1500+p.route.length*350));
  p.onPacketStatus?.('outbound');p.onPacketHop?.(0);let targetHop=0;
  function animate(now:number){
   if(cancelled)return;
   start??=now;const phase=roundTripPhase(now-start,legDuration);
   marker.setLatLng(packetPosition(path!,phase.progress));
   if(phase.status!==stage){stage=phase.status;marker.getElement()?.classList.toggle('packet-reply',stage==='returning');p.onPacketStatus?.(stage)}
   if(phase.status==='complete'){marker.remove();return}
   const nextHop=packetTargetHop(path!,phase.progress,phase.status==='returning');if(nextHop!==targetHop){targetHop=nextHop;p.onPacketHop?.(nextHop)}
   frame=requestAnimationFrame(animate);
  }
  const reduce=()=>{if(preference.matches){cancelled=true;cancelAnimationFrame(frame);marker.remove();p.onPacketStatus?.('reduced')}};
  preference.addEventListener('change',reduce);frame=requestAnimationFrame(animate);
  return()=>{cancelled=true;cancelAnimationFrame(frame);preference.removeEventListener('change',reduce);marker.remove()};
 },[p.packetRun,path,failedKey,p.onPacketStatus,p.onPacketHop]);
 const fit=()=>{if(map.current&&p.graph.nodes.length)map.current.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false})};
 return <div className="map-frame"><div ref={container} className="network-map" aria-label="Монголын хот ба кабелийн газрын зураг"/>{(p.packetStatus==='outbound'||p.packetStatus==='returning')&&<div className="packet-map-status"><span>{p.packetStatus==='outbound'?'Очих →':'← Буцах'} · RTT {p.packetRtt?.toLocaleString('mn-MN',{maximumFractionDigits:2})} ms</span><button onClick={p.onPacketStop}>Зогсоох</button>{p.packetAddressLabel&&<small>{p.packetAddressLabel}</small>}{p.packetHopLabel&&<small className="packet-hop-label">{p.packetHopLabel}</small>}</div>}<div className="map-cable-overlay">{p.cableTools}</div><div className="map-packet-controls">{p.packetControls}</div><button className="map-fit" onClick={fit}>Бүх хотыг харах</button>{tileError&&<div className="tile-error" role="status">Суурь зураг татагдсангүй. Хот, кабелийн зураглал ажиллаж байна.</div>}<div className="map-legend"><span><i style={{background:p.trace?'#2563b0':COLORS[p.topology]}}/>{p.trace?'Алгоритмын алхам':'Кабель'}</span><span><i style={{background:'#d87b12'}}/>Маршрут</span><span><i className="dashed"/>Тасарсан</span>{!!p.baselineRoute?.length&&!p.trace&&<span><i style={{background:'#7c648e'}}/>Өмнөх зам</span>}{!!p.satelliteEdgeIds?.length&&<span><i style={{background:'#8558b6'}}/>Starlink · жишээ</span>}{!!Object.keys(p.congestion??{}).length&&<span><i style={{background:'#c76b08'}}/>Ачаалал</span>}{p.highlight&&<span><i style={{background:'#d39b19'}}/>Гүүр</span>}</div></div>;
}
