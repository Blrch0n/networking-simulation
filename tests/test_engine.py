import copy, itertools, math
import networkx as nx
import pytest
from backend.app import engine
from backend.app.main import app
from fastapi.testclient import TestClient
@pytest.fixture
def data():
 n=engine.load_nodes();return n,engine.candidates(n)
def test_capitals(data):
 n,e=data
 assert len(n)==len({x['id'] for x in n})==22
 assert all(41<x['lat']<53 and 87<x['lon']<120 for x in n)
 assert all(x['feature_code'] in ['PPLA','PPLC'] for x in n)
 assert len(e)==231
 for edge in e:
  coords=edge['geometry']['coordinates']
  assert math.isclose(engine.GEOD.line_length(*zip(*coords))/1000,edge['length_km'])
  assert edge['crossing_count'] is None and edge['elevation_profile'] is None
  assert 'geodesic' in edge['distance_basis']
def test_mst_and_resilience(data):
 n,e=data
 mst,_=engine.design(n,e,'mst');res,status=engine.design(n,e,'resilient')
 assert len(mst)==21 and len(list(nx.bridges(engine.graph(n,mst))))==21
 assert status=='heuristic'
 for removed in res:
  g=engine.graph(n,[x for x in res if x['id']!=removed['id']])
  assert nx.is_connected(g)
 for physical in res:
  remaining=[x for x in res if physical['id'] not in x['physical_segment_ids']]
  assert nx.is_connected(engine.graph(n,remaining))
def test_known_triangle():
 n=[{'id':s} for s in 'abc'];e=[{'id':a+b,'u':a,'v':b,'estimated_cost':w,'length_km':w,'capacity_gbps':100} for a,b,w in [('a','b',1),('b','c',2),('a','c',4)]]
 t,_=engine.design(n,e,'mst');assert sum(x['estimated_cost'] for x in t)==3
 r,_=engine.design(n,e,'resilient');assert len(r)==3
 with pytest.raises(nx.NetworkXUnfeasible):engine.design(n,e[:2],'resilient')
def test_unreachable_not_zero(data):
 n,e=data;t,_=engine.design(n,e,'mst');baseline=copy.deepcopy(t)
 r={'source':'ulaanbaatar','destination':'khovd','failed':[x['id'] for x in t]}
 m=engine.metrics(n,t,r);assert m['rtt_ms'] is None and m['unreachable_pairs']==231
 assert baseline==t
def test_incident_lifecycle_and_validation(tmp_path,monkeypatch):
 from backend.app import main
 monkeypatch.setattr(main,'DB',tmp_path/'state.sqlite')
 with TestClient(app) as c:
  s=c.post('/api/simulation/runs',json={}).json();rid=s['id'];eid=s['metrics']['route_edges'][0]
  assert c.post(f'/api/simulation/runs/{rid}/incidents',json={'asset_id':'bogus'}).status_code==404
  for _ in range(2):
   c.post(f'/api/simulation/runs/{rid}/incidents',json={'asset_id':eid})
   for _ in range(3):s=c.post(f'/api/simulation/runs/{rid}/control',json={'action':'step'}).json()
   assert eid in s['failed'] and s['metrics']['route'] and eid not in s['metrics']['route_edges']
   s=c.post(f'/api/simulation/runs/{rid}/repair',json={}).json();assert not s['failed'] and not s['pending']
  s=c.post(f'/api/simulation/runs/{rid}/control',json={'action':'reset'}).json();assert s['clock']==0
  assert c.get(f'/api/simulation/runs/{rid}/export?format=geojson').json()['type']=='FeatureCollection'
  assert c.post('/api/simulation/runs',json={'source':'nope'}).status_code==422
  assert c.post('/api/simulation/runs',json={'demand_gbps':-1}).status_code==422
  assert not c.get('/api/lab/status').json()['available']
def test_overload_and_node_failure(data):
 n,e=data;es,_=engine.design(n,e,'resilient')
 overload=engine.metrics(n,es,{'surge':100})
 assert overload['overloaded_links'] and overload['max_utilization']>1
 down=engine.metrics(n,es,{'down_nodes':['khovd']})
 assert down['rtt_ms'] is None and down['components']>1

def test_local_origin_guard():
 with TestClient(app) as c:
  assert c.post('/api/simulation/runs',json={},headers={'origin':'https://untrusted.example'}).status_code==403

def test_lab_allowlist(monkeypatch):
 from backend.app import lab
 monkeypatch.setenv('FIBER_LAB_ENABLED','1');monkeypatch.setattr(lab,'use_remote',lambda:False)
 def reject(args):raise AssertionError('Invalid input reached subprocess')
 monkeypatch.setattr(lab,'execute',reject)
 for fn,args in [(lab.read,('evil','routes')),(lab.read,('ulaanbaatar','shell')),(lab.ping,('evil','bulgan')),(lab.state,('host-nic',False))]:
  with pytest.raises(ValueError):fn(*args)

def test_real_lab_smoke():
 import os,subprocess
 if os.getenv('RUN_REAL_LAB_TESTS')!='1':pytest.skip('Real FRR lab needs Docker privilege; set RUN_REAL_LAB_TESTS=1 after make lab-up')
 result=subprocess.run(['.venv/bin/python','lab/scripts/check.py'],capture_output=True,text=True)
 if result.returncode==77:pytest.skip(result.stdout)
 assert result.returncode==0,result.stdout+result.stderr
def test_user_assumed_srlg(tmp_path,monkeypatch):
 from backend.app import main
 monkeypatch.setattr(main,'DB',tmp_path/'srlg.sqlite')
 with TestClient(app) as c:
  r=c.post('/api/simulation/runs',json={}).json();rid=r['id'];ids=[e['id'] for e in r['edges'][:2]]
  r=c.post(f'/api/simulation/runs/{rid}/risk-groups',json={'name':'assumed test group','edge_ids':ids}).json()
  gid=next(iter(r['risk_groups']));assert r['risk_groups'][gid]['confidence'].startswith('user-assumed')
  c.post(f'/api/simulation/runs/{rid}/incidents',json={'kind':'corridor','asset_id':gid})
  for _ in range(3):r=c.post(f'/api/simulation/runs/{rid}/control',json={'action':'step'}).json()
  assert set(ids)<=set(r['failed'])
  r=c.post(f'/api/simulation/runs/{rid}/repair',json={}).json();assert not r['failed']
