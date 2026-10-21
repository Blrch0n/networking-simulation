"""Allowlisted project-only Docker operations. No browser-supplied commands."""
import subprocess, os, datetime, socket, json
from pathlib import Path
SOCKET=Path(__file__).resolve().parents[2]/'.run/lab.sock'
def remote(op,**kwargs):
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as client:
        client.settimeout(35);client.connect(str(SOCKET));client.sendall(json.dumps(dict(op=op,**kwargs)).encode()+b'\n')
        with client.makefile() as f:reply=json.loads(f.readline())
    if 'error' in reply:raise RuntimeError(reply['error'])
    return reply['result']
def use_remote():return SOCKET.exists() and os.getenv('FIBER_LAB_DIRECT')!='1'
ROUTERS={'ulaanbaatar':1,'darkhan':2,'erdenet':3,'bulgan':4}
LINKS={'ub-dar':('ulaanbaatar','darkhan','eth1','eth1'),'dar-erd':('darkhan','erdenet','eth2','eth1'),'erd-bul':('erdenet','bulgan','eth2','eth1'),'bul-ub':('bulgan','ulaanbaatar','eth2','eth2')}
COMMANDS={'neighbors':'show ip ospf neighbor json','routes':'show ip route json','ospf':'show ip ospf route json','interfaces':'show interface json'}
def execute(args,allow_failure=False):
    p=subprocess.run(args,capture_output=True,text=True,timeout=15)
    if p.returncode and not allow_failure:raise RuntimeError((p.stderr or p.stdout)[-2000:])
    try:data=__import__('json').loads(p.stdout)
    except ValueError:data=None
    return dict(data=data,raw=p.stdout,returncode=p.returncode,timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat())
def enabled():
    if not use_remote() and os.getenv('FIBER_LAB_ENABLED')!='1':raise RuntimeError('Бодит лаборатори идэвхгүй. make lab-up дараа FIBER_LAB_ENABLED=1 make demo ажиллуулна.')
def read(router,op):
    if use_remote():return remote('read',router=router,operation=op)
    enabled()
    if router not in ROUTERS or op not in COMMANDS:raise ValueError('Unknown router or operation')
    return execute(['docker','exec','mnfiber-'+router,'vtysh','-c',COMMANDS[op]])
def status():
    try:
        if use_remote():return remote('status')
        enabled(); result=execute(['docker','inspect',*[f'mnfiber-{r}' for r in ROUTERS]])
        return dict(available=all(x['State']['Running'] for x in result['data']),routers=ROUTERS,links=LINKS,timestamp=result['timestamp'])
    except (RuntimeError,subprocess.SubprocessError,OSError) as e:return dict(available=False,error=str(e),routers=ROUTERS,links=LINKS)
def ping(source,destination):
    if use_remote():return remote('ping',source=source,destination=destination)
    enabled()
    if source not in ROUTERS or destination not in ROUTERS:raise ValueError('Unknown router')
    return execute(['docker','exec','mnfiber-'+source,'ping','-n','-I',f'10.255.0.{ROUTERS[source]}','-c','3','-W','1',f'10.255.0.{ROUTERS[destination]}'],allow_failure=True)
def state(link,up):
    if use_remote():return remote('state',link=link,up=up)
    enabled()
    if link not in LINKS:raise ValueError('Unknown lab link')
    a,b,ia,ib=LINKS[link];acks=[]
    for router,interface in [(a,ia),(b,ib)]:
        acks.append(execute(['docker','exec','mnfiber-'+router,'ip','link','set','dev',interface,'up' if up else 'down']))
    return dict(link=link,up=up,acknowledgements=acks,observation='Interface acknowledgements only; refresh neighbors/routes and ping for real convergence evidence.')
