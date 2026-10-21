# Existing Vercel deployment

Production: https://networking-simulation-beta.vercel.app/

Existing project `networking-simulation`, scope `bolroos-projects`, project ID `prj_qIzQeolhMIYWIGuPTswXuKL2gn3w`. Reuse this project; do not create a second project or a new repository.

`vercel.json` is unchanged:

- Root directory: repository root (`./`).
- Framework: Vite; Node 24.x on the inspected project.
- Install: `npm ci --prefix frontend`.
- Build: `VITE_STATIC_DEMO=1 npm run build --prefix frontend`.
- Output: `frontend/dist`.

Authenticated one-time update:

```bash
npx vercel deploy --prod --yes --project prj_qIzQeolhMIYWIGuPTswXuKL2gn3w --scope bolroos-projects --verify
```

No `--create-if-missing`. If login is required, use `npx vercel login` in your terminal. Never paste a token/password into the repository. The CLI-only workflow does not establish an automatic GitHub integration. Do not claim pushes automatically deploy unless an actual connection is confirmed.

## Hosted behavior

All graph planning, node/cable editing, comparison and exhaustive verification run in the browser. Designs are recomputed from the **edited** graph, not exported as fixed topology IDs. The candidate seed is generated with `.venv/bin/python scripts/export_web_demo.py`. No Python runtime, secret or database is needed in Vercel. localStorage is per browser/origin; it is not shared cloud persistence. Invalid or unavailable storage has visible recovery. Current cable failure is reset on refresh.

Real FRR/OSPF is not available in the static deployment and its controls are hidden. No request from production reaches a localhost Docker controller. Source coordinates and approximate geometry limitations remain unchanged; methodology is collapsed in the UI.

## Static validation

```bash
make test
VITE_STATIC_DEMO=1 npm run build --prefix frontend
.venv/bin/python -m http.server 4173 --bind 127.0.0.1 --directory frontend/dist
```

Open http://127.0.0.1:4173 with no API running. The local full-stack version is built with `npm run build --prefix frontend`, then `make demo`.

Official references: https://vercel.com/docs/frameworks/frontend/vite and https://vercel.com/docs/cli/deploy.
