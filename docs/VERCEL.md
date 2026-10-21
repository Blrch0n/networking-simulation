# Vercel deployment

Vercel hosts the **browser planning demo**. The existing localhost FastAPI + SQLite + FRR stack remains available via `make demo` and `make lab-up`.

## Import from GitHub

1. Open https://vercel.com/new and import `Blrch0n/networking-simulation`.
2. Keep **Root Directory** at the repository root (`./`), not `frontend`.
3. The committed `vercel.json` sets the build configuration:
   - Install: `npm ci --prefix frontend`
   - Build: `VITE_STATIC_DEMO=1 npm run build --prefix frontend`
   - Output: `frontend/dist`
4. Deploy. No database, paid service, secret environment variables or Python runtime is needed for the hosted demo.

## CLI

```bash
cd /home/aswer/Downloads/network_simulation
npx vercel login
npx vercel --prod
```

Select the repository root and use the committed configuration. Subsequent pushes deploy automatically if you imported/connected the GitHub repository in Vercel. CLI-only deployment does not by itself guarantee a GitHub integration is connected.

## Hosted behavior and limits

- Same verified 22 city coordinates, 231 geodesic candidate geometries, MST and heuristic resilient selections exported by the Python engine.
- Shortest paths, components, bridge counts, utilization, unreachable pairs and modeled propagation RTT are recomputed in the browser after failures.
- Only the latest scenario is saved to this browser's localStorage. It is private to that browser/origin and is not a shared cloud database. A closed page does not advance simulated time; while the page is open, timer throttling can slow the simulation clock.
- Play/pause/step/speed, individual and node failures, repair, assumed SRLG groups, traffic surge and JSON/GeoJSON/CSV export work in the hosted version.
- Radius scenario preview uses spherical-distance proximity to sampled alignment points. It is approximate and may differ slightly from the Python WGS84 geodesic-distance preview. Neither is a terrain/flood exposure analysis.
- Topology optimization is precomputed from the checked-in candidate dataset. Uniform cost/km and capacity settings do not change its selected edges; they change reported cost/load/capacity. This is not a cloud MILP service.
- The real Docker/FRRouting lab **cannot run in this static deployment**. The lab tab explicitly reports that it requires the local version. No local router/control socket is exposed to the hosted page.
- No public FastAPI endpoints, Python background ticker, SSE stream or persistent SQLite file are required by this mode.

## Rebuild data and test

```bash
.venv/bin/python scripts/export_web_demo.py
node --experimental-strip-types tests/web_demo.mjs
VITE_STATIC_DEMO=1 npm run build --prefix frontend
.venv/bin/python -m http.server 4173 --bind 127.0.0.1 --directory frontend/dist
```

Open http://127.0.0.1:4173 to test with no API running. The web graph test checks all 28 single-link failures of the resilient design, baseline metrics for all three designs, repair, browser persistence, node outage, unreachable RTT, invalid assets and unavailable real lab.

For the ordinary local full-stack mode rebuild with `npm run build --prefix frontend`, then run `make demo`.

Official references:
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/runtimes — functions have ephemeral writable scratch storage; don't use local SQLite as a shared persistent cloud database.
