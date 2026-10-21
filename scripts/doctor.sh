#!/usr/bin/env bash
set -u
uname -a
python --version
node --version
npm --version
free -h
docker compose version
docker info --format '{{.ServerVersion}}' || printf '%s\n' 'OSPF lab unavailable: Docker permission or daemon required. Planning mode remains usable.'
