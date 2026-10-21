"""Measure the current planner, separately from archived legacy measurements."""
import json,statistics,time,sys,resource,platform
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from backend.app import engine,planning
from backend.app.main import app
from fastapi.testclient import TestClient
nodes=engine.load_nodes();data=planning.validate({'nodes':nodes,'edges':engine.candidates(nodes)})
design_samples=[]
for _ in range(15):
    t=time.perf_counter();planning.analyze(data,'resilient','ulaanbaatar','khovd');design_samples.append((time.perf_counter()-t)*1000)
api_samples=[]
with TestClient(app) as client:
    for _ in range(15):
        t=time.perf_counter();r=client.post('/api/planning/analyze',json={'graph':data,'topology':'resilient','source':'ulaanbaatar','destination':'khovd'});assert r.status_code==200;api_samples.append((time.perf_counter()-t)*1000)
report={'measured_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'python':platform.python_version(),'platform':platform.platform(),'samples':15,'planner_ms':{'median':statistics.median(design_samples),'max':max(design_samples)},'local_api_testclient_ms':{'median':statistics.median(api_samples),'max':max(api_samples)},'peak_process_rss_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'method':'Uncached edited-graph calculation; TestClient includes validation and JSON serialization, not internet/browser latency.'}
(ROOT/'docs/planning-performance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
