#!/usr/bin/env python3
"""Optional narrowly scoped root helper. The web app stays unprivileged.
Start manually: sudo .venv/bin/python lab/controller.py
Only the invoking local user can connect to the Unix socket.
"""
import json,os,socketserver,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
os.environ['FIBER_LAB_ENABLED']='1';os.environ['FIBER_LAB_DIRECT']='1'
from backend.app import lab
SOCKET=ROOT/'.run/lab.sock'
class Handler(socketserver.StreamRequestHandler):
 def handle(self):
  try:
   line=self.rfile.readline(4097)
   if len(line)>4096:raise ValueError('Request too large')
   req=json.loads(line);op=req.get('op')
   if op=='status':result=lab.status()
   elif op=='read':result=lab.read(req['router'],req['operation'])
   elif op=='ping':result=lab.ping(req['source'],req['destination'])
   elif op=='state':
    if not isinstance(req.get('up'),bool):raise ValueError('up must be boolean')
    result=lab.state(req['link'],req['up'])
   else:raise ValueError('Operation is not allowlisted')
   response={'result':result}
  except Exception as e:response={'error':str(e)}
  self.wfile.write(json.dumps(response).encode()+b'\n')
if __name__=='__main__':
 SOCKET.parent.mkdir(exist_ok=True)
 if SOCKET.exists():raise SystemExit(f'{SOCKET} already exists. Stop the old helper before starting another.')
 with socketserver.UnixStreamServer(str(SOCKET),Handler) as server:
  os.chmod(SOCKET,0o600)
  if os.geteuid()==0:os.chown(SOCKET,int(os.getenv('SUDO_UID','0')),int(os.getenv('SUDO_GID','0')))
  print(f'Allowlisted FRR controller: {SOCKET}',flush=True)
  try:server.serve_forever()
  finally:SOCKET.unlink(missing_ok=True)
