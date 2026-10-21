#!/usr/bin/env python3
"""Real smoke test; never passes if Docker/FRR are unavailable."""
import json,subprocess,time,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from backend.app import lab
import os
os.environ['FIBER_LAB_ENABLED']='1'
s=lab.status()
if not s['available']:
 print('SKIPPED: real OSPF lab unavailable:',s['error']);sys.exit(77)
def full():
 for r in lab.ROUTERS:
  d=lab.read(r,'neighbors')['data']
  entries=[e for values in d.values() for e in (values if isinstance(values,list) else [values])]
  if sum('Full' in e.get('nbrState','') for e in entries)!=2:return False
 return True
for _ in range(40):
 if full():break
 time.sleep(1)
else:raise AssertionError('Expected two FULL neighbors per router')
for r in lab.ROUTERS:
 assert not subprocess.check_output(['docker','exec','mnfiber-'+r,'ip','route','show','default'],text=True).strip(), 'Unexpected default shortcut'
before=lab.read('ulaanbaatar','routes')
ping=lab.ping('ulaanbaatar','bulgan');print(ping['raw']);assert ping['returncode']==0
try:
 ack=lab.state('ub-dar',False);print(json.dumps(ack))
 time.sleep(6)
 after=lab.read('ulaanbaatar','routes');assert before['data']!=after['data'],'Real route table did not change'
 ping=lab.ping('ulaanbaatar','bulgan');print(ping['raw']);assert ping['returncode']==0
finally:lab.state('ub-dar',True)
for _ in range(20):
 if full():break
 time.sleep(1)
else:raise AssertionError('Recovery FULL state failed')
print('PASS: neighbors, routing, loopback ping, bidirectional cut, reroute, recovery; no default routes')
