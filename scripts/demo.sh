#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .run
if curl -fsS --max-time 2 http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
  echo 'Demo already running: http://127.0.0.1:8000'; exit 0
fi
[[ -d frontend/dist ]] || npm run build --prefix frontend
nohup setsid .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --timeout-graceful-shutdown 2 >.run/server.log 2>&1 </dev/null &
echo $! > .run/server.pid
for attempt in {1..30}; do
 if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then echo 'Demo: http://127.0.0.1:8000'; exit 0; fi
 sleep .2
done
cat .run/server.log
exit 1
