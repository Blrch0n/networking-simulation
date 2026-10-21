import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import type {LineString} from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {STATIC_DEMO,browserApi,subscribeBrowser,downloadBrowser} from './webDemo';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(workerUrl);
type Node={id:string;name:string;aimag:string;lat:number;lon:number};
type Edge={id:string;u:string;v:string;length_km:number;capacity_gbps:number;geometry:LineString};
type Run={id:string;topology:string;clock:number;version:number;source:string;destination:string;playing:boolean;speed:number;failed:string[];pending:{edges:string[]}[];nodes:Node[];edges:Edge[];events:{time:number;message:string}[];metrics:{[key:string]:any};solver_status:string};
async function api(path:string,body?:unknown,method?:string){if(STATIC_DEMO)return browserApi(path,body);const r=await fetch('/api'+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(typeof d.detail==='string'?d.detail:JSON.stringify(d.detail));return d}
const fmt=(n:number|null,d=0)=>n==null?'—':n.toLocaleString('mn-MN',{maximumFractionDigits:d});
function MapView({run,selected,onSelect,existing}:{run:Run;selected:string;onSelect:(id:string)=>void;existing:boolean}){
 const el=useRef<HTMLDivElement>(null),map=useRef<maplibregl.Map|null>(null),live=useRef(run),sel=useRef(onSelect),isExisting=useRef(existing);isExisting.current=existing; const [fallback,setFallback]=useState(false);live.current=run;sel.current=onSelect;
 const geo=(r:Run)=>({type:'FeatureCollection' as const,features:r.edges.map(e=>({type:'Feature' as const,geometry:e.geometry,properties:{id:e.id,failed:r.failed.includes(e.id),route:r.metrics.route_edges.includes(e.id),selected:e.id===selected}}))});
 useEffect(()=>{if(!el.current)return;let m:maplibregl.Map;try{m=new maplibregl.Map({container:el.current,style:{version:8,sources:{basemap:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'base',type:'raster',source:'basemap',paint:{'raster-saturation':-.65,'raster-opacity':.75}}]},center:[103.6,46.9],zoom:4.5,minZoom:3,maxZoom:12});map.current=m;m.addControl(new maplibregl.NavigationControl(),'bottom-right');const fit=()=>m.fitBounds([[88,42],[117,52]],{padding:30,duration:0});fit();m.on('resize',fit);m.on('load',()=>{
 m.addSource('edges',{type:'geojson',data:geo(live.current)});m.addLayer({id:'cables',type:'line',source:'edges',paint:{'line-color':['case',['get','failed'],'#ce7e83',['get','route'],'#719c8e','#a68ec7'],'line-width':['case',['get','route'],4,1.7],'line-opacity':.8,'line-dasharray':[3,1]}});
 m.addSource('particles',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'moving',type:'circle',source:'particles',paint:{'circle-color':'#f8fff9','circle-radius':4,'circle-blur':.3}});
 m.addLayer({id:'cable-hit',type:'line',source:'edges',paint:{'line-width':16,'line-opacity':0}});m.on('click','cable-hit',e=>{if(e.features?.[0])sel.current(String(e.features[0].properties.id))});m.on('mouseenter','cable-hit',()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave','cable-hit',()=>m.getCanvas().style.cursor='');
 live.current.nodes.forEach(n=>{const b=document.createElement('button');b.className='city-marker';b.textContent=n.name;b.onclick=e=>{e.stopPropagation();sel.current(n.id)};b.style.visibility=isExisting.current?'hidden':'visible';new maplibregl.Marker({element:b}).setLngLat([n.lon,n.lat]).addTo(m)});
 });m.on('error',e=>{console.debug('Map resource unavailable',e.error?.message)});
 }catch{setFallback(true);return}let raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const draw=(t:number)=>{const r=live.current;const src=m.getSource('particles') as maplibregl.GeoJSONSource|undefined;if(src){const f=r.edges.filter(e=>r.metrics.route_edges.includes(e.id)&&!r.failed.includes(e.id));src.setData({type:'FeatureCollection',features:(!r.playing||reduced||isExisting.current?[]:f).map((e,i)=>{const c=r.metrics.route.indexOf(e.u)<r.metrics.route.indexOf(e.v)?e.geometry.coordinates:[...e.geometry.coordinates].reverse();const p=((t*.00012*r.speed+i*.17)%1)*(c.length-1);const a=Math.floor(p),q=p-a;return {type:'Feature',properties:{},geometry:{type:'Point',coordinates:[c[a][0]*(1-q)+c[a+1][0]*q,c[a][1]*(1-q)+c[a+1][1]*q]}}})})}raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);m.remove();map.current=null}},[]);
 useEffect(()=>{el.current?.querySelectorAll<HTMLElement>('.city-marker').forEach(b=>b.style.visibility=existing?'hidden':'visible');const m=map.current;const update=()=>{const src=m?.getSource('edges') as maplibregl.GeoJSONSource|undefined;if(src)src.setData(existing?{type:'FeatureCollection',features:[]}:geo(run));if(m?.getLayer('cables'))m.setPaintProperty('cables','line-color',['case',['get','failed'],'#ce7e83',['get','selected'],'#69508e',['get','route'],'#719c8e',run.topology==='mst'?'#ce9893':run.topology==='mesh'?'#91ad92':'#a68ec7'])};update();m?.once('load',update)},[run,selected,existing]);
 if(fallback)return <svg className="fallback" viewBox="0 0 1000 620">{run.edges.map(e=><polyline key={e.id} points={e.geometry.coordinates.map(p=>`${(p[0]-87)*30},${(53-p[1])*48}`).join(' ')} fill="none" stroke={run.failed.includes(e.id)?'#ce7e83':'#a68ec7'} onClick={()=>onSelect(e.id)}/>)}{run.nodes.map(n=><g key={n.id} onClick={()=>onSelect(n.id)}><circle cx={(n.lon-87)*30} cy={(53-n.lat)*48} r="4" fill="#fff"/><text x={(n.lon-87)*30+6} y={(53-n.lat)*48} fill="#fff" fontSize="12">{n.name}</text></g>)}</svg>;
 return <div ref={el} className="map"/>;
}
function Lab(){const [status,setStatus]=useState<any>(null),[router,setRouter]=useState('ulaanbaatar'),[output,setOutput]=useState('Бодит өгөгдлийг унших үйлдэл сонгоно уу.'),[busy,setBusy]=useState(false);
 const action=async(path:string,body?:any)=>{setBusy(true);try{const d=await api(path,body);setOutput(JSON.stringify(d,null,2))}catch(e){setOutput(String(e))}finally{setBusy(false)}};
 useEffect(()=>{api('/lab/status').then(setStatus).catch(e=>setStatus({available:false,error:String(e)}))},[]);
 return <div className="lab"><div className="eyebrow">FRROUTING / OSPFV2 • БОДИТ ЦАГ</div><h2>Дөрвөн чиглүүлэгчийн лаборатори</h2><p>Улаанбаатар → Дархан → Эрдэнэт → Булган → Улаанбаатар. Үндэсний 22 хотын дэд хэсэг. Симуляцийн хурд, түр зогсолт FRR-д нөлөөлөхгүй.</p><div className={'notice '+(status?.available?'good':'')}>{status?.available?'● Контейнерууд ажиллаж байна':`○ Лаборатори боломжгүй: ${status?.error||'Шалгаж байна…'}`}</div><div className="lab-controls"><select value={router} onChange={e=>setRouter(e.target.value)}>{['ulaanbaatar','darkhan','erdenet','bulgan'].map(r=><option key={r}>{r}</option>)}</select>{['neighbors','routes','ospf','interfaces'].map((op,i)=><button disabled={busy} key={op} onClick={()=>action(`/lab/routers/${router}/${op}`)}>{['OSPF хөрш','IP маршрут','OSPF маршрут','Интерфейс'][i]}</button>)}<button disabled={busy} onClick={()=>action('/lab/ping',{source:router,destination:router==='bulgan'?'ulaanbaatar':'bulgan'})}>Бодит ping</button></div><div className="lab-controls">{['ub-dar','dar-erd','erd-bul','bul-ub'].map(l=><span key={l}>{l} <button disabled={busy} onClick={()=>action(`/lab/links/${l}/state`,{up:false})}>Таслах</button><button disabled={busy} onClick={()=>action(`/lab/links/${l}/state`,{up:true})}>Сэргээх</button></span>)}</div><pre>{output}</pre><p className="muted">Интерфейсийн acknowledgement нь OSPF convergence хэмжилт биш. Хөрш, маршрут, ping-ийг дахин уншиж үр дүн ба timestamp-ийг харьцуулна. Ажигласан зам батлагдаагүй бол газрын зурагт бодит зам хэмээн дүрслэхгүй.</p></div>
}
function App() {
 const [run,setRun]=useState<Run|null>(null);
 const [error,setError]=useState('');
 const [tab,setTab]=useState('map');
 const [selected,setSelected]=useState('');
 const [hazard,setHazard]=useState<string[]>([]);
 const [riskEdges,setRiskEdges]=useState<string[]>([]);
 const [existing,setExisting]=useState(false);
 const [quality,setQuality]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [source,setSource]=useState('ulaanbaatar');
 const [destination,setDestination]=useState('khovd');
 const [settings,setSettings]=useState({demand_gbps:10,capacity_gbps:100,cost_per_km:1,detection_delay:1,reconvergence_delay:2});
 const generation=useRef(0);
 const create=async(topology='resilient',from=source,to=destination)=>{
  const request=++generation.current;setBusy(true);
  try {
   const d=await api('/simulation/runs',{topology,source:from,destination:to,...settings});
   if(request!==generation.current)return;
   setRun(d);setSelected('');setHazard([]);setRiskEdges([]);localStorage.setItem('fiber-run',d.id);setExisting(false);setError('');
  } catch(e){setError(String(e))} finally {if(request===generation.current)setBusy(false)}
 };
 useEffect(()=>{
  const id=localStorage.getItem('fiber-run');
  if(id)api(`/simulation/runs/${id}`).then(d=>{setRun(d);setSource(d.source);setDestination(d.destination);setSettings({demand_gbps:d.demand_gbps,capacity_gbps:d.capacity_gbps??100,cost_per_km:d.cost_per_km??1,detection_delay:d.detection_delay,reconvergence_delay:d.reconvergence_delay})}).catch(()=>create());else create();
  api('/data/status').then(setQuality).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(!run)return;
  if(STATIC_DEMO)return subscribeBrowser(run.id,next=>setRun(prev=>prev&&prev.id===next.id&&next.version>=prev.version?next:prev),e=>setError(String(e)));
  const es=new EventSource(`/api/simulation/runs/${run.id}/events`);
  es.onopen=()=>setError('');
  es.onmessage=e=>{const next=JSON.parse(e.data) as Run;setRun(prev=>prev&&prev.id===next.id&&next.version>=prev.version?next:prev)};
  es.onerror=()=>setError('Холболт түр тасарлаа. Дахин холбогдож байна…');
  return()=>es.close();
 },[run?.id]);
 const act=async(endpoint:string,body:any)=>{
  if(!run)return;
  try {const next=await api(`/simulation/runs/${run.id}/${endpoint}`,body) as Run;setRun(prev=>prev&&prev.id===next.id&&next.version>=prev.version?next:prev);setError('');return next}
  catch(e){setError(String(e))}
 };
 const demoCut=async()=>{
  if(!run?.metrics.route_edges.length)return;
  setBusy(true);
  try {const id=run.metrics.route_edges[0];setSelected(id);const result=await act('incidents',{kind:'cut',asset_id:id});if(result)await act('control',{action:'play'})}
  finally{setBusy(false)}
 };
 const edge=run?.edges.find(e=>e.id===selected);
 const node=run?.nodes.find(n=>n.id===selected);
 const m=run?.metrics||{};
 const name=(id:string)=>run?.nodes.find(n=>n.id===id)?.name||id;
 const pending=!!run?.pending.length;
 const damaged=!!run?.failed.length;
 const reachable=!!m.route?.length;
 const protectedNetwork=m.components===1&&m.bridges===0;
 const routeLabel=run?`${name(run.source)} → ${name(run.destination)}`:'';
 return <>
  <header>
   <a className="brand" href="#" onClick={e=>{e.preventDefault();setTab('map')}}><span className="brand-icon">✳︎</span><span>холбоос<span className="brand-sub">Монголын сүлжээний симулятор</span></span></a>
   <nav aria-label="Үндсэн цэс">
    <button className={tab==='map'?'active':''} onClick={()=>setTab('map')}>Газрын зураг</button>
    <button className={tab==='lab'?'active':''} onClick={()=>setTab('lab')}>OSPF лаборатори</button>
    <button className={tab==='data'?'active':''} onClick={()=>setTab('data')}>Эх сурвалж</button>
   </nav>
   <span className="local"><i/> {STATIC_DEMO?'Вэб демо':'Локал орчин'}</span>
  </header>
  {error&&<div className="error" role="alert">{error}<button onClick={()=>create()}>Дахин оролдох</button></div>}
  {tab==='lab'?<Lab/>:tab==='data'?<article>
   <div className="eyebrow">ИЛ ТОД ӨГӨГДӨЛ</div><h1>Тооцооны цаана юу бий вэ?</h1>
   <div className="source-grid"><section><span className="source-icon">◎</span><h2>Хотын байршил</h2><p>22 хотын цэгийг GeoNames-оос авч, WGS84 координатаар харуулав. Кабель нь геодезийн ойролцоо шугам; авто замын бодит трасс биш.</p></section><section><span className="source-icon peach">≈</span><h2>Загварчилсан хэмжилт</h2><p>RTT нь зөвхөн гэрлийн тархалтын тооцоо. Өртөг нь харьцангуй нэгж. Өндөршил, голын гарц болон зөвшөөрөл баталгаажаагүй.</p></section><section><span className="source-icon mint">↗</span><h2>Хамгаалалтын хүрээ</h2><p>Heuristic алгоритм нэг логик холбоосын тасралтад тэсвэртэй сүлжээ олно. Глобал оновчтой болон физик трассын бие даасан байдлын баталгаа байхгүй.</p></section></div>
   <h2>Одоо байгаа дэд бүтэц</h2><p><a href="https://www.icn.mn/about/greeting/" target="_blank" rel="noreferrer">Мэдээлэл холбооны сүлжээ ХХК ↗</a> нийт 19,676 км үндсэн сүлжээ гэж мэдээлсэн. Нийтэлсэн огноо тодорхойгүй. Баталгаатай GIS трасс байхгүй тул газрын зурагт шугам зохиож оруулаагүй.</p>
   <details><summary>Өгөгдлийн дэлгэрэнгүй бүртгэл</summary><pre>{JSON.stringify(quality,null,2)}</pre></details>
  </article>:run?<div className="workspace">{STATIC_DEMO&&<div className="hosted-note">Вэб симуляци · Сценари зөвхөн энэ хөтөчид хадгалагдана. Бодит OSPF лаборатори локал хувилбарт ажиллана.</div>}
   <section className="title-row"><div><div className="eyebrow">22 ХОТ · НЭГ СҮЛЖЭЭ</div><h1>Холбоотой байхын <em>учир.</em><span className="title-spark">✧</span></h1><p>Хоёр хот сонгоод, сүлжээ тасралтыг хэрхэн даван туулахыг үзээрэй.</p></div><div className="intro-note"><span>✦</span> Сонго. Турш. Нээ.<small>Таны жижиг сүлжээний лаборатори</small></div></section>
   {existing?<section className="reference"><b>Одоо байгаа сүлжээний эх сурвалж</b><p>Операторын мэдээлэл бий. Баталгаатай газрын зургийн трасс байхгүй тул кабель харуулаагүй.</p><a href="https://www.icn.mn/about/greeting/" target="_blank" rel="noreferrer">Операторын тайлан үзэх ↗</a></section>:<section className="metrics" aria-label="Сүлжээний гол үзүүлэлт">
    <div className="metric lavender"><span className="metric-icon">◎</span><div><strong>{m.reachable_cities}<small>/ 22</small></strong><span>Холбогдсон хот</span></div></div>
    <div className="metric peach"><span className="metric-icon">↗</span><div><strong>{fmt(m.installed_length_km)}<small>км</small></strong><span>Сүлжээний нийт урт</span></div></div>
    <div className="metric butter"><span className="metric-icon">◷</span><div><strong>{fmt(m.rtt_ms,2)}<small>ms</small></strong><span>Тооцоолсон RTT</span></div></div>
    <div className={`metric ${protectedNetwork?'mint':'peach'}`}><span className="metric-icon">♧</span><div><strong className="protection-value">{protectedNetwork?'Хамгаалалттай':m.components>1?'Сүлжээ салсан':`${m.bridges} эмзэг холбоос`}</strong><span>{protectedNetwork?'Нэг логик холбоосын тасралтыг давна':'Тасарвал сүлжээ салгах холбоос'}</span></div></div>
   </section>}
   <main className={existing?'reference-main':''}>
    {!existing&&<aside>
     <div className="panel-step"><span>01</span><h2>Чиглэлээ сонгоё</h2><i>↗</i></div>
     <div className="route-picker"><label><span className="endpoint-dot"/>Эхлэх хот<select aria-label="Эхлэх хот" value={source} onChange={e=>setSource(e.target.value)}>{run.nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label><div className="route-connector"><span/><button aria-label="Хотын чиглэл солих" title="Чиглэл солих" onClick={()=>{setSource(destination);setDestination(source)}}>⇅</button></div><label><span className="endpoint-dot arrival"/>Хүрэх хот<select aria-label="Хүрэх хот" value={destination} onChange={e=>setDestination(e.target.value)}>{run.nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label></div>
     <button className="primary wide" disabled={busy} onClick={()=>create(run.topology)}>{busy?'Тооцоолж байна…':'Замаа харах'} <span>→</span></button>
     <div className="route-info"><span className="mini-label">{routeLabel}</span><strong>{reachable?`${fmt(m.route_length_km,1)} км`:'Хүрэх боломжгүй'} <span>{reachable?'аялах зам':''}</span></strong><details><summary>Дамжин өнгөрөх хотууд</summary><p>{reachable?m.route.map(name).join(' → '):'Сүлжээ тасарсан байна.'}</p></details></div>
     <div className="panel-step second"><span>02</span><h2>Тасралт туршаад үзье</h2></div><p className="helper">Нэг кабель тасрахад өөр зам олдох болов уу?</p>
     <button className="experiment" disabled={busy||!reachable||pending||damaged} onClick={demoCut}><span className="experiment-icon">✂︎</span><span>Тасралт турших<small>Сонгосон замын нэг кабелийг тасална</small></span><b>↗</b></button>
     {(pending||damaged)&&<button className="repair-button" disabled={busy} onClick={()=>act('repair',{})}>↺ Бүх холбоосыг сэргээх</button>}
     <details className="advanced"><summary>Нэмэлт тохиргоо <span>＋</span></summary>
      <h3>Сценарийн параметр</h3>{([['demand_gbps','Урсгал · Gbps'],['capacity_gbps','Багтаамж · Gbps'],['cost_per_km','Өртөг · нэгж/км'],['detection_delay','Илрүүлэх хугацаа · s'],['reconvergence_delay','Маршрут шинэчлэх · s']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min={key.includes('delay')?0:0.1} step="0.1" value={settings[key]} onChange={e=>setSettings({...settings,[key]:Number(e.target.value)})}/></label>)}<p className="tiny">Дараагийн «Замаа харах» үйлдэлд хэрэглэнэ.</p>
      <h3>Тусдаа кабель эсвэл хот</h3><label>Кабель сонгох<select aria-label="Кабель сонгох" value={edge?selected:''} onChange={e=>setSelected(e.target.value)}><option value="">Газрын зураг / жагсаалт</option>{run.edges.map(e=><option key={e.id} value={e.id}>{name(e.u)} ↔ {name(e.v)}</option>)}</select></label>
      <p>{node?.name||(edge?`${name(edge.u)} ↔ ${name(edge.v)}`:'Газрын зураг дээр хот сонгож болно.')}</p>{edge&&<p>{fmt(edge.length_km,1)} км · {edge.capacity_gbps} Gbps</p>}
      <div className="action-grid"><button disabled={!edge} onClick={()=>act('incidents',{kind:'cut',asset_id:selected})}>Кабель таслах</button><button disabled={!edge} onClick={()=>act('repair',{asset_id:selected})}>Кабель засах</button><button disabled={!node} onClick={()=>act('incidents',{kind:'node',asset_id:selected})}>Хотын тэжээл таслах</button><button onClick={()=>act('incidents',{kind:'surge',multiplier:5})}>Урсгал ×5</button><button onClick={()=>act('repair',{})}>Бүгдийг сэргээх</button></div>
      <details><summary>Ослын бүс / хамтын эрсдэл</summary><p className="tiny">Сонгосон хотын 100 км доторх ойролцоо трассын түүвэр цэгтэй бүх холбоос өртөнө. Үерийн магадлал биш.</p><button disabled={!node} onClick={async()=>{if(node)try{setHazard((await api(`/simulation/runs/${run.id}/incidents/preview`,{kind:'radius',lon:node.lon,lat:node.lat,radius_km:100})).edge_ids)}catch(e){setError(String(e))}}}>Өртөх холбоос харах</button><p>{hazard.length} холбоос</p><button disabled={!node||!hazard.length} onClick={()=>node&&act('incidents',{kind:'radius',lon:node.lon,lat:node.lat,radius_km:100})}>Бүсийн осол үүсгэх</button><p className="tiny">Хоёр буюу түүнээс олон кабелийг таамагласан SRLG бүлэг болгоно. Физик хамтын трасс баталгаажаагүй.</p><select aria-label="SRLG кабель" multiple value={riskEdges} onChange={e=>setRiskEdges(Array.from(e.target.selectedOptions,x=>x.value))}>{run.edges.map(e=><option key={e.id} value={e.id}>{name(e.u)} ↔ {name(e.v)}</option>)}</select><button disabled={riskEdges.length<2} onClick={()=>act('risk-groups',{name:'Таамагласан бүлэг',edge_ids:riskEdges})}>Бүлэг хадгалах</button>{Object.entries((run as any).risk_groups||{}).map(([id,group]:[string,any])=><button key={id} onClick={()=>act('incidents',{kind:'corridor',asset_id:id})}>Бүлэг таслах · {group.edge_ids.length} кабель</button>)}</details>
     </details>
    </aside>}
    <section className="map-panel">
     <div className="map-toolbar"><div className="map-heading"><span className="map-heading-dot"/><strong>Таны сүлжээ</strong><span>Монгол улс</span></div><span className="map-live">22 хот</span></div>
     <div className="topology-row"><span>Сүлжээний загвар</span><div className="segments">{[['mst','Хэмнэлттэй','21 холбоос'],['resilient','Хамгаалалттай','Нөөц замтай'],['mesh','Бүрэн mesh','231 холбоос']].map(([id,label,desc])=><button disabled={busy} key={id} title={desc} className={!existing&&run.topology===id?'active '+id:''} onClick={()=>create(id)}><i/>{label}</button>)}<button className={existing?'active':''} onClick={()=>setExisting(true)}>Одоо байгаа ↗</button></div></div>
     <div className="map-wrap"><MapView run={run} selected={selected} onSelect={setSelected} existing={existing}/><div className="map-tag">{existing?'Баталгаатай GIS трасс байхгүй':'Газарзүйн ойролцоо загвар'}<span title="Бодит кабелийн байрлал биш">ⓘ</span></div>{!existing&&(node||edge)&&<div className="selection-card"><button className="selection-close" aria-label="Сонголт хаах" onClick={()=>setSelected('')}>×</button><span className="mini-label">{node?'СОНГОСОН ХОТ':'СОНГОСОН КАБЕЛЬ'}</span><strong>{node?.name||(edge&&`${name(edge.u)} ↔ ${name(edge.v)}`)}</strong><small>{node?node.aimag:edge?`${fmt(edge.length_km,1)} км · ${edge.capacity_gbps} Gbps`:''}</small><div>{node?<><button onClick={()=>{setSource(node.id);create(run.topology,node.id,destination)}}>Эндээс эхлэх</button><button onClick={()=>{setDestination(node.id);create(run.topology,source,node.id)}}>Энд хүрэх</button></>:edge&&<><button disabled={pending} onClick={async()=>{const result=await act('incidents',{kind:'cut',asset_id:edge.id});if(result)await act('control',{action:'play'})}}>Тасалж үзэх</button><button onClick={()=>act('repair',{asset_id:edge.id})}>Сэргээх</button></>}</div></div>}<div className="legend"><span><i className="dot green"/>Сонгосон зам</span><span><i className="dot blue"/>Кабель</span><span><i className="dot red"/>Тасралт</span></div></div>
     {!existing&&<><div className={`flow-status ${pending?'waiting':damaged?'rerouted':'normal'}`} role="status"><span className="status-orb">{pending?'◌':damaged?'↪':'✓'}</span><div><strong>{pending?'Тасралтыг илрүүлж байна…':damaged?(reachable?'Нөөц замаар холбогдлоо':'Энэ чиглэлд хүрэх боломжгүй'):'Сүлжээ хэвийн байна'}</strong><span>{pending?`${(run as any).detection_delay} s илрүүлэлт + ${(run as any).reconvergence_delay} s маршрут шинэчлэлт`:damaged?`${run.failed.length} кабель тасарсан · ${m.reachable_cities} хот хүрэх боломжтой`:'Тоглуулж урсгалыг ажиглаарай. Эсвэл тасралт туршаад үзээрэй.'}</span></div><span className="status-chip">{pending?'Шалгаж байна':damaged?'Туршилт':'Хэвийн'}</span></div><div className="playbar"><button className="play-button" onClick={()=>act('control',{action:run.playing?'pause':'play'})}>{run.playing?'Ⅱ Түр зогсоох':'▶ Тоглуулах'}</button><button className="icon-button" title="Нэг секунд алхуулах" onClick={()=>act('control',{action:'step'})}>+1 s</button><button className="icon-button" title="Сценари шинээр эхлэх" onClick={()=>act('control',{action:'reset'})}>↺</button><div className="playbar-divider"/><label className="speed-label">Хурд<select aria-label="Симуляцийн хурд" value={run.speed} onChange={e=>act('control',{action:'speed',speed:Number(e.target.value)})}>{[.25,1,2,5,10,20].map(s=><option key={s} value={s}>{s}×</option>)}</select></label><span className="time">Симуляцийн цаг <b>{fmt(run.clock)} s</b></span></div></>}
    </section>
   </main>
   {!existing&&<section className="bottom"><div><div className="section-heading"><h3><span>◷</span> Юу өөрчлөгдөв?</h3><span>ҮЙЛ ЯВДАЛ</span></div><div className="timeline">{run.events.length===0&&<p className="timeline-empty">Туршилтын өөрчлөлтүүд энд харагдана.</p>}{run.events.slice(-3).reverse().map((e,i)=><div key={i}><time>{fmt(e.time)} s</time><span>{e.message}</span></div>)}</div></div><div className="export"><h3>Үр дүнгээ авч үлдээгээрэй <span>↗</span></h3><p>Өөрийн сүлжээ, сценариа татах</p>{['json','geojson','csv'].map(f=><a key={f} download={`network.${f}`} onClick={STATIC_DEMO?e=>{e.preventDefault();downloadBrowser(run.id,f).catch(error=>setError(String(error)))}:undefined} href={STATIC_DEMO?'#':`/api/simulation/runs/${run.id}/export?format=${f}`}>{f.toUpperCase()} ↓</a>)}</div></section>}
   {!existing&&<details className="technical"><summary>Тооцооны дэлгэрэнгүй</summary><div className="technical-grid">{[['Бүрэлдэхүүн',m.components],['Хамгийн их RTT',`${fmt(m.max_rtt_ms,2)} ms`],['50 ms давсан хос',m.rtt_violations],['Тасарсан хос',m.unreachable_pairs],['Хамгийн их ашиглалт',`${fmt(m.max_utilization*100)}%`],['Багтаамж давсан',m.overloaded_links.length],['Харьцангуй өртөг',fmt(m.relative_cost)],['Алгоритм',run.solver_status]].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div><p>RTT нь тархалтын тооцоо. Хамгаалалттай загвар нь heuristic; бодит физик трассын бие даасан байдал баталгаажаагүй.</p></details>}
   <footer><span><i/> Тайван туршаарай. Өөрчлөлтүүд зөвхөн энэ симуляцид үйлчилнэ.</span><button onClick={()=>setTab('data')}>Өгөгдөл ба хязгаарлалт ↗</button></footer>
  </div>:<div className="loading"><span>✳︎</span><h2>Холбоосуудыг бэлтгэж байна…</h2><p>Таны сүлжээ удахгүй бэлэн болно.</p></div>}
 </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
