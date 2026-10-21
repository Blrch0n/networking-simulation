#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .run/server.pid ]]; then
 pid=$(cat .run/server.pid)
 if [[ -r /proc/$pid/cmdline ]] && tr '\0' ' ' </proc/$pid/cmdline | rg -q 'uvicorn backend.app.main:app'; then kill "$pid"; fi
 rm -f .run/server.pid
fi
