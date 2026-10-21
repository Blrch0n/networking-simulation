import {useEffect,useRef,useState} from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {Dataset,Cable,Topology} from './graph';
export const COLORS={mst:'#c44242',resilient:'#2563b0',mesh:'#27804a'};
type Props={graph:Dataset;edges:Cable[];topology:Topology;route:string[];failed:string|null;bridgeIds:string[];highlight:boolean;selectedCity:string;selectedCable:string;onCity:(id:string)=>void;onCable:(id:string)=>void};
export function NetworkMap(p:Props){
 const container=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),lines=useRef<L.LayerGroup|null>(null),cities=useRef<L.LayerGroup|null>(null),latest=useRef(p),fitted=useRef(false);latest.current=p;
 const [tileError,setTileError]=useState(false);
 useEffect(()=>{if(!container.current)return;const m=L.map(container.current,{preferCanvas:false,zoomSnap:.25,zoomDelta:.5,zoomControl:true,center:[46.8,103],zoom:5,minZoom:2,maxZoom:15});map.current=m;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>setTileError(true)).addTo(m);
  m.createPane('cityPane');m.getPane('cityPane')!.style.zIndex='650';lines.current=L.layerGroup().addTo(m);cities.current=L.layerGroup().addTo(m);
  const observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);
  return()=>{observer.disconnect();m.remove();map.current=null;fitted.current=false};
 },[]);
 useEffect(()=>{const m=map.current,layer=cities.current;if(!m||!layer)return;layer.clearLayers();
  for(const n of p.graph.nodes){const marker=L.circleMarker([n.lat,n.lon],{pane:'cityPane',radius:n.id===p.selectedCity?6:4,color:'#344458',fillColor:'#fff',fillOpacity:1,weight:1.7,bubblingMouseEvents:false});const text=document.createElement('span');text.textContent=n.name;const labelPositions:Record<string,{direction:L.Direction;offset:[number,number]}>= {choibalsan:{direction:'left',offset:[-7,0]},ulaanbaatar:{direction:'top',offset:[0,-7]},zuunmod:{direction:'bottom',offset:[0,7]},erdenet:{direction:'top',offset:[0,-7]},bulgan:{direction:'bottom',offset:[0,7]},bayankhongor:{direction:'left',offset:[-7,0]}};marker.bindTooltip(text,{permanent:true,className:'city-label',...(labelPositions[n.id]??{direction:'right' as L.Direction,offset:[6,0] as [number,number]})});marker.on('click',()=>latest.current.onCity(n.id));marker.addTo(layer);const element=marker.getElement();if(element){element.setAttribute('role','button');element.setAttribute('aria-label','Хот: '+n.name);element.setAttribute('tabindex','0');element.addEventListener('keydown',event=>{const key=(event as KeyboardEvent).key;if(key==='Enter'||key===' '){event.preventDefault();event.stopPropagation();latest.current.onCity(n.id)}})}}
  if(!fitted.current&&p.graph.nodes.length){m.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false});fitted.current=true;}
 },[p.graph.nodes,p.selectedCity]);
 useEffect(()=>{const layer=lines.current;if(!layer)return;layer.clearLayers();const route=new Set(p.route),bridges=new Set(p.bridgeIds);const sorted=[...p.edges].sort((a,b)=>Number(route.has(a.id))-Number(route.has(b.id))||Number(a.id===p.selectedCable)-Number(b.id===p.selectedCable)||Number(a.id===p.failed)-Number(b.id===p.failed));
  for(const e of sorted){const a=p.graph.nodes.find(n=>n.id===e.u)!,b=p.graph.nodes.find(n=>n.id===e.v)!;const points=e.geometry?.coordinates?.map(c=>[c[1],c[0]] as [number,number])??[[a.lat,a.lon],[b.lat,b.lon]] as [number,number][];const failed=e.id===p.failed,selected=e.id===p.selectedCable,onRoute=route.has(e.id),bridge=p.highlight&&bridges.has(e.id);const color=failed?'#27303e':onRoute?'#d87b12':bridge?'#d39b19':COLORS[p.topology];
   const line=L.polyline(points,{color,weight:selected?5:onRoute?4:bridge?3:1.6,opacity:failed||onRoute||selected?1:p.topology==='mesh'?.34:.75,dashArray:failed?'8 6':undefined,bubblingMouseEvents:false}).on('click',()=>latest.current.onCable(e.id));line.addTo(layer);const element=line.getElement();if(element){element.setAttribute('role','button');element.setAttribute('aria-label',`Кабель: ${a.name} — ${b.name}`);element.setAttribute('tabindex','-1')}
   L.polyline(points,{color:'#000',weight:15,opacity:0,bubblingMouseEvents:false}).on('click',()=>latest.current.onCable(e.id)).addTo(layer);
  }
 },[p.graph,p.edges,p.topology,p.route,p.failed,p.bridgeIds,p.highlight,p.selectedCable]);
 const fit=()=>{if(map.current&&p.graph.nodes.length)map.current.fitBounds(L.latLngBounds(p.graph.nodes.map(n=>[n.lat,n.lon] as [number,number])),{padding:[24,26],maxZoom:7,animate:false})};
 return <div className="map-frame"><div ref={container} className="network-map" aria-label="Монголын хот ба кабелийн газрын зураг"/><button className="map-fit" onClick={fit}>Бүх хотыг харах</button>{tileError&&<div className="tile-error" role="status">Суурь зураг татагдсангүй. Хот, кабелийн зураглал ажиллаж байна.</div>}<div className="map-legend"><span><i style={{background:COLORS[p.topology]}}/>Кабель</span><span><i style={{background:'#d87b12'}}/>Маршрут</span><span><i className="dashed"/>Тасарсан</span>{p.highlight&&<span><i style={{background:'#d39b19'}}/>Гүүр</span>}</div></div>;
}
