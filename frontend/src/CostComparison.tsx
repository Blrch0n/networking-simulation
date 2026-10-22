import {useState} from 'react';
import type {Analysis} from './graph';
import {COLORS} from './NetworkMap';
const labels={mst:'MST',resilient:'2-Edge',mesh:'Full Mesh'};
const money=(value:number)=>`$${value.toLocaleString('mn-MN',{maximumFractionDigits:0})}`;
export function CostComparison({comparison,defaultOpen=false}:Pick<Analysis,'comparison'>&{defaultOpen?:boolean}){
 const [input,setInput]=useState('20000'),[logarithmic,setLogarithmic]=useState(false);
 const rate=Number(input),valid=input.trim()!==''&&Number.isFinite(rate)&&rate>=0&&rate<=1e12;
 const mst=comparison.find(row=>row.kind==='mst')!.metrics.length_km;
 const protectedLength=comparison.find(row=>row.kind==='resilient')!.metrics.length_km;
 const mesh=comparison.find(row=>row.kind==='mesh')!.metrics.length_km;
 const scale=(length:number)=>logarithmic?Math.log1p(length):length;
 const maximum=Math.max(...comparison.map(row=>scale(row.metrics.length_km)),1);
 return <details className="panel cost-comparison" open={defaultOpen}><summary>Зардлын харьцуулалт</summary><div className="details-body">
  <div className="cost-controls"><label>Кабелийн өртөг (USD / км, таамаглал)<input type="number" min="0" max="1000000000000" step="any" value={input} aria-invalid={!valid} onChange={event=>setInput(event.target.value)}/></label><label className="check"><input type="checkbox" checked={logarithmic} onChange={event=>setLogarithmic(event.target.checked)}/>Логарифм масштаб (Full Mesh маш том тул)</label></div>
  <p className="note">Өртөг = урт × USD/км. Жишээ таамаглал; тоног төхөөрөмж, ашиглалт, татвар ороогүй.</p>
  {!valid&&<p role="alert" className="bad-text">0–1,000,000,000,000 хоорондох хүчинтэй үнэ оруулна уу.</p>}
  <div className="cost-bars" aria-label="Суурилуулсан уртын харьцуулалт">{comparison.map(row=><div key={row.kind}><div className="cost-bar-label"><b>{labels[row.kind]}</b><span>{row.metrics.length_km.toLocaleString('mn-MN',{maximumFractionDigits:2})} км</span></div><div className="cost-track"><div style={{width:`${scale(row.metrics.length_km)/maximum*100}%`,background:COLORS[row.kind]}}/></div></div>)}</div>
  <div className="table-scroll"><table><thead><tr><th>Загвар</th><th>Тооцоолсон өртөг, USD</th><th>MST-ээс нэмэгдсэн, USD</th><th>MST-ээс нэмэгдсэн, %</th><th>Гүүр</th></tr></thead><tbody>{comparison.map(row=><tr key={row.kind}><th style={{color:COLORS[row.kind]}}>{labels[row.kind]}</th><td>{valid?money(row.metrics.length_km*rate):'—'}</td><td>{valid?money((row.metrics.length_km-mst)*rate):'—'}</td><td>{mst>0?`${((row.metrics.length_km-mst)/mst*100).toLocaleString('mn-MN',{maximumFractionDigits:2})}%`:'—'}</td><td>{row.metrics.bridge_ids.length}</td></tr>)}</tbody></table></div>
  <p className="note">2-Edge нь MST-ээс {(protectedLength-mst).toLocaleString('mn-MN',{maximumFractionDigits:2})} км{valid?` (${money((protectedLength-mst)*rate)})`:''} нэмэлт кабельтай. Full Mesh-ээс {(mesh-protectedLength).toLocaleString('mn-MN',{maximumFractionDigits:2})} км{valid?` (${money((mesh-protectedLength)*rate)})`:''} бага кабель ашиглана.</p>
 </div></details>;
}
