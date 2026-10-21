from functools import cache
from contextlib import asynccontextmanager
from urllib.parse import urlparse
import asyncio, csv, io, json, sqlite3, time, uuid, threading, copy
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from . import engine, lab
@asynccontextmanager
async def lifespan(app):
    await startup()
    yield
    await shutdown()

app=FastAPI(lifespan=lifespan,title='Монголын шилэн сүлжээ',version='1.0.0')
DB=engine.ROOT/'data/state.sqlite'
lock=threading.RLock()
def db():
    c=sqlite3.connect(DB);c.execute('CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, value TEXT NOT NULL)');return c
def save(run):
    with db() as c:c.execute('INSERT OR REPLACE INTO snapshots VALUES (?,?)',(run['id'],json.dumps(run)))
def get_run(rid):
    with db() as c:row=c.execute('SELECT value FROM snapshots WHERE id=?',(rid,)).fetchone()
    if not row:raise HTTPException(404,'Симуляци олдсонгүй')
    return json.loads(row[0])
@cache
def assets():
    nodes=engine.load_nodes();return nodes,engine.candidates(nodes)
def event(r,msg):r['events'].append({'time':r['clock'],'message':msg})
def advance(r,dt):
    r['clock']+=dt
    for e in r['pending'][:]:
        if e['at']<=r['clock']:
            r['failed']=sorted(set(r['failed'])|set(e['edges']));r['down_nodes']=sorted(set(r['down_nodes'])|set(e['nodes']));r['pending'].remove(e)
            event(r,'Илрүүлэлт → маршрут дахин тооцоолов')
    return r
def snapshot(r):
    nodes,all_edges=assets()
    if 'design' in r:edges,status=r['design']['edges'],r['design']['status'];nodes=r['design']['nodes']
    else:edges,status=engine.design(nodes,all_edges,r['topology'])
    return dict(**r,nodes=nodes,edges=edges,metrics=engine.metrics(nodes,edges,r),solver_status=status)
class RunInput(BaseModel):
    topology:Literal['mst','resilient','mesh']='resilient'
    source:str='ulaanbaatar'
    destination:str='khovd'
    demand_gbps:float=Field(default=10,ge=0,le=10000)
    detection_delay:float=Field(default=1,ge=0,le=120)
    reconvergence_delay:float=Field(default=2,ge=0,le=120)
    capacity_gbps:float=Field(default=100,gt=0,le=100000)
    cost_per_km:float=Field(default=1,gt=0,le=1000000)
class Incident(BaseModel):
    kind:Literal['cut','corridor','node','radius','surge']='cut'
    asset_id:str|None=None
    lon:float=Field(default=106.9,ge=87,le=120)
    lat:float=Field(default=47.9,ge=41,le=53)
    radius_km:float=Field(default=100,gt=0,le=1000)
    multiplier:float=Field(default=3,ge=1,le=100)
class Control(BaseModel):
    action:Literal['play','pause','step','reset','speed']
    speed:float=Field(default=1,ge=.25,le=20)
class Repair(BaseModel):asset_id:str|None=None
class RiskGroup(BaseModel):
    name:str=Field(min_length=1,max_length=80)
    edge_ids:list[str]=Field(min_length=2,max_length=231)

@app.post('/api/simulation/runs/{rid}/risk-groups')
def risk_group(rid:str,body:RiskGroup):
    with lock:
        r=get_run(rid);valid={e['id'] for e in snapshot(r)['edges']}
        if not set(body.edge_ids)<=valid:raise HTTPException(404,'Кабель олдсонгүй')
        if len(set(body.edge_ids))<2:raise HTTPException(422,'Хоёр өөр кабель сонгоно уу')
        gid='assumed-'+uuid.uuid4().hex[:8]
        r.setdefault('risk_groups',{})[gid]={'name':body.name,'edge_ids':sorted(set(body.edge_ids)),'confidence':'user-assumed; not verified physical sharing'}
        event(r,'Таамагласан SRLG бүлэг үүсгэв: '+body.name)
        return commit(r)

@app.post('/api/simulation/runs/{rid}/incidents/preview')
def preview(rid:str,body:Incident):
    r=get_run(rid);edges=snapshot(r)['edges']
    affected=[e['id'] for e in edges if min(engine.GEOD.inv(body.lon,body.lat,*p)[2]/1000 for p in e['geometry']['coordinates'])<=body.radius_km]
    return {'edge_ids':affected,'rule':'All sampled approximate alignments within radius; no terrain/flood exposure probability','confidence':'approximate scenario selection'}
@app.middleware('http')
async def local_only(request,call_next):
    host=request.url.hostname
    origin=request.headers.get('origin')
    if host not in {'localhost','127.0.0.1','testserver'} or (origin and urlparse(origin).hostname not in {'localhost','127.0.0.1'}):
        return Response('Local access only',status_code=403)
    return await call_next(request)

@app.get('/api/health')
def health():return {'status':'ok','mode':'engineering-model','schema_version':1}
@app.get('/api/nodes')
def nodes():return engine.load_nodes()
@app.get('/api/routes')
def routes():return assets()[1]
@app.get('/api/topologies')
def topologies():
    n,e=assets();return {k:{'edges':engine.design(n,e,k)[0],'status':engine.design(n,e,k)[1]} for k in ['mst','resilient','mesh']}
@app.get('/api/data/status')
@app.get('/api/provenance')
def provenance():return json.loads((engine.ROOT/'data/provenance/manifest.json').read_text())
@app.get('/api/existing-network')
def existing():return {'type':'FeatureCollection','features':[],'coverage':'Нийтэд нээлттэй операторын тайлан байна; баталгаатай GIS трасс татагдаагүй тул газрын зурагт кабель зохиож харуулаагүй.','source':'https://www.icn.mn/about/greeting/','publication_date':None,'reported_length_km':19676,'classification':'operator self-report; not surveyed GIS'}
@app.post('/api/simulation/runs')
def create(body:RunInput):
    valid={n['id'] for n in engine.load_nodes()}
    if body.source not in valid or body.destination not in valid:raise HTTPException(422,'Хотын ID буруу')
    r=dict(id=uuid.uuid4().hex,schema_version=1,version=1,**body.model_dump(),clock=0,playing=False,speed=1,failed=[],down_nodes=[],pending=[],events=[],surge=1)
    n,e=assets();e=copy.deepcopy(e)
    for link in e:link.update(capacity_gbps=body.capacity_gbps,estimated_cost=link['length_km']*body.cost_per_km)
    chosen,status=engine.design(n,e,body.topology)
    r['design']={'nodes':n,'edges':chosen,'status':status}
    event(r,'Сценари үүсгэв · загварчилсан цаг');save(r);return snapshot(r)
@app.get('/api/simulation/runs/{rid}')
@app.get('/api/simulation/runs/{rid}/metrics')
def read_run(rid:str):return snapshot(get_run(rid))
def commit(r):r['version']+=1;save(r);return snapshot(r)
@app.post('/api/simulation/runs/{rid}/incidents')
def incident(rid:str,body:Incident):
    with lock:
        r=get_run(rid);s=snapshot(r);edges=s['edges'];ids={e['id'] for e in edges};affected=[];down=[]
        if body.kind=='corridor' and body.asset_id in r.get('risk_groups',{}):
            affected=r['risk_groups'][body.asset_id]['edge_ids']
        elif body.kind in ['cut','corridor']:
            if body.asset_id not in ids:raise HTTPException(404,'Кабель олдсонгүй')
            affected=[e['id'] for e in edges if body.asset_id in e['physical_segment_ids'] or body.asset_id in e['corridor_ids']]
        elif body.kind=='node':
            if body.asset_id not in {n['id'] for n in s['nodes']}:raise HTTPException(404,'Хот олдсонгүй')
            down=[body.asset_id];affected=[e['id'] for e in edges if body.asset_id in [e['u'],e['v']]]
        elif body.kind=='radius':
            # Explicit rule: every sampled approximate alignment within radius is affected.
            affected=[e['id'] for e in edges if min(engine.GEOD.inv(body.lon,body.lat,*p)[2]/1000 for p in e['geometry']['coordinates'])<=body.radius_km]
        else:r['surge']=body.multiplier
        event(r,f'Осол: {body.kind} · {len(affected)} холбоос · бүх сонгогдсон хөрөнгө өртөх дүрэм')
        if affected or down:r['pending'].append({'at':r['clock']+r['detection_delay']+r['reconvergence_delay'],'edges':affected,'nodes':down})
        return commit(r)
@app.post('/api/simulation/runs/{rid}/repair')
def repair(rid:str,body:Repair):
    with lock:
        r=get_run(rid)
        if body.asset_id:
            if body.asset_id not in {e['id'] for e in snapshot(r)['edges']}:raise HTTPException(404,'Кабель олдсонгүй')
            r['failed']=[x for x in r['failed'] if x!=body.asset_id]
            for p in r['pending']:p['edges']=[x for x in p['edges'] if x!=body.asset_id]
        else:r.update(failed=[],down_nodes=[],pending=[],surge=1)
        event(r,'Засвар → сэргэлт');return commit(r)
@app.post('/api/simulation/runs/{rid}/control')
def control(rid:str,body:Control):
    with lock:
        r=get_run(rid)
        if body.action=='reset':r.update(clock=0,failed=[],down_nodes=[],pending=[],events=[],surge=1,playing=False)
        elif body.action=='step':advance(r,1)
        elif body.action=='speed':r['speed']=body.speed
        else:r['playing']=body.action=='play'
        return commit(r)
@app.get('/api/simulation/runs/{rid}/events')
async def stream(rid:str):
    get_run(rid)
    async def generate():
        version=-1
        for _ in range(600):
            r=get_run(rid)
            if r['version']!=version:
                version=r['version'];yield f'id: {version}\ndata: {json.dumps(snapshot(r))}\n\n'
            else:yield ': heartbeat\n\n'
            await asyncio.sleep(1)
    return StreamingResponse(generate(),media_type='text/event-stream')
async def startup():
    async def tick():
        while True:
            await asyncio.sleep(1)
            with lock:
                with db() as c:rows=c.execute('SELECT value FROM snapshots').fetchall()
                for row in rows:
                    r=json.loads(row[0])
                    if r['playing']:advance(r,r['speed']);r['version']+=1;save(r)
    app.state.ticker=asyncio.create_task(tick())
async def shutdown():app.state.ticker.cancel()
@app.get('/api/simulation/runs/{rid}/export')
def export(rid:str,format:Literal['json','geojson','csv']='json'):
    s=snapshot(get_run(rid))
    if format=='geojson':return {'type':'FeatureCollection','features':[{'type':'Feature','geometry':e['geometry'],'properties':{k:v for k,v in e.items() if k!='geometry'}} for e in s['edges']]}
    if format=='csv':
        out=io.StringIO();w=csv.writer(out);w.writerow(['id','length_km','capacity_gbps','relative_cost']);w.writerows([e['id'],e['length_km'],e['capacity_gbps'],e['estimated_cost']] for e in s['edges']);return Response(out.getvalue(),media_type='text/csv')
    return s
jobs={}
@app.post('/api/optimization/jobs')
def optimize():
    jid=uuid.uuid4().hex;jobs[jid]={'id':jid,'status':'queued','algorithm':'weighted NetworkX augmentation heuristic','gap':None,'lower_bound':None}
    def work():
        start=time.perf_counter();jobs[jid]['status']='running'
        try:
            n,e=assets();chosen,status=engine.design(n,e,'resilient')
            if jobs[jid]['status']!='cancelled':jobs[jid].update(status='complete',solver_status=status,edge_ids=[x['id'] for x in chosen],incumbent=sum(x['estimated_cost'] for x in chosen))
        except Exception as ex:jobs[jid].update(status='infeasible',error=str(ex))
        jobs[jid]['elapsed_seconds']=time.perf_counter()-start
    threading.Thread(target=work,daemon=True).start();return jobs[jid]
@app.get('/api/optimization/jobs/{jid}')
def job(jid:str):
    if jid not in jobs:raise HTTPException(404,'Job not found')
    return jobs[jid]
@app.delete('/api/optimization/jobs/{jid}')
def cancel(jid:str):
    j=job(jid)
    if j['status'] in ['queued','running']:j['status']='cancelled'
    return j
@app.get('/api/lab/status')
def lab_status():return lab.status()
@app.get('/api/lab/routers/{router}/{operation}')
def lab_read(router:str,operation:Literal['neighbors','routes','interfaces','ospf']):
    try:return lab.read(router,operation)
    except (RuntimeError,OSError,ValueError,lab.subprocess.SubprocessError) as e:raise HTTPException(503,str(e))
class Ping(BaseModel):source:str;destination:str
@app.post('/api/lab/ping')
def lab_ping(body:Ping):
    try:return lab.ping(body.source,body.destination)
    except (RuntimeError,OSError,ValueError,lab.subprocess.SubprocessError) as e:raise HTTPException(503,str(e))
class LinkState(BaseModel):up:bool
@app.post('/api/lab/links/{link}/state')
def lab_link(link:str,body:LinkState):
    try:return lab.state(link,body.up)
    except (RuntimeError,OSError,ValueError,lab.subprocess.SubprocessError) as e:raise HTTPException(503,str(e))
# Edited-graph planner for the minimal academic UI; legacy scenario/lab APIs remain.
from . import planning
class PlanningInput(BaseModel):
    graph:dict
    topology:Literal['mst','resilient','mesh']='resilient'
    source:str=''
    destination:str=''
    failed_id:str|list[str]|None=None
    verify:bool=False
@app.post('/api/planning/analyze')
def analyze_planning(body:PlanningInput):
    try:return planning.analyze(body.graph,body.topology,body.source,body.destination,body.failed_id,body.verify)
    except (ValueError,KeyError,TypeError) as ex:raise HTTPException(422,str(ex))

if (engine.ROOT/'frontend/dist').exists():app.mount('/',StaticFiles(directory=engine.ROOT/'frontend/dist',html=True),name='frontend')
