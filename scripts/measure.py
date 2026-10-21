"""Reproducible exhaustive graph checks + cached HTTP latency, no FRR claims."""
import json,time,statistics,platform,resource
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.app import engine
from backend.app.main import app
from fastapi.testclient import TestClient
n=engine.load_nodes();e=engine.candidates(n);report={'hardware':platform.platform(),'python':platform.python_version(),'topologies':{}}
for kind in ['mst','resilient','mesh']:
 edges,status=engine.design(n,e,kind);normal=engine.metrics(n,edges,{})
 failures=[engine.metrics(n,edges,{'failed':[x['id']]}) for x in edges]
 report['topologies'][kind]={'status':status,'edges':len(edges),'length_km':normal['installed_length_km'],'bridges':normal['bridges'],'normal_max_rtt_ms':normal['max_rtt_ms'],'single_link_failure_worst_reachable_rtt_ms':max(m['max_rtt_ms'] or 0 for m in failures),'single_link_disconnecting_scenarios':sum(m['components']>1 for m in failures),'failure_scenarios_over_50ms':sum(m['rtt_violations']>0 for m in failures),'normal_max_utilization':normal['max_utilization'],'failure_scenarios_over_capacity':sum(bool(m['overloaded_links']) for m in failures)}
with TestClient(app) as c:
 s=c.post('/api/simulation/runs',json={}).json();path=f"/api/simulation/runs/{s['id']}/metrics";samples=[]
 for _ in range(25):
  start=time.perf_counter();r=c.get(path);assert r.status_code==200;samples.append((time.perf_counter()-start)*1000)
 report['in_process_cached_api_ms']={'median':statistics.median(samples),'max':max(samples),'samples':len(samples),'method':'FastAPI TestClient includes serialization; no browser/network latency'}
report['peak_process_rss_kib']=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
Path('docs/measurements.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
