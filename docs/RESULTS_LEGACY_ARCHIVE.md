# Баталгаажуулалтын үр дүн — 2026-10-14, Asia/Ulaanbaatar

Энэ нь ажилладаг локал demonstration slice; бүх brief-ийн бүрэн гүйцэтгэл биш. `make demo` → http://127.0.0.1:8000.

## Бодитоор ажиллуулсан

- Python 3.14.7, Node 26.8.2, npm 11.19.1, Docker CLI 29.7.2, Compose 5.5.1, Linux 7.2.5 Omarchy, Intel i5-1240P 16 logical CPU, 15 GiB RAM. Эхэнд available RAM 8.9 GiB.
- GeoNames Mongolia extract 306,744 bytes (яг хэмжээ ба SHA manifest-д). 22 PPLA/PPLC capital records, ID + administrative code verification. Cached processed JSON хамт ирнэ.
- TypeScript болон Vite production build passed. MapLibre 6 explicit worker URL bundling. Эхний browser шалгалтын worker 404 болон marker CSS алдаа засагдсан.
- 9 automated tests passed, 1 real-lab test skipped. Graph геодезийн урт, 22 distinct node, MST, every selected link removal, physical placeholder removal, infeasible triangle/path, unreachable RTT=null, repeat cut/repair/reset, overload/node failure, exports, malformed input, local-origin guard, lab allowlist.
- Desktop browser: MST switching, 21 bridges; resilient switching, 0 bridges; UB–Darkhan cut + three one-second steps → alternate UB–Zuunmod–Choir–Mandalgovi–Dalanzadgad–Bayankhongor–Altai–Uliastai–Khovd route. Actual modeled RTT changed from 15.65 to 19.72 ms. 22 sites remain reachable. Full mesh/existing/lab/error UI also available.
- JSON/GeoJSON/CSV exports. Persisted immutable per-run baseline + scenario. SSE current version snapshots and reconnect handling.

## Хэмжсэн graph үр дүн

`scripts/measure.py`, `docs/measurements.json`-ийг дахин ажиллуулж болно. Хэмжилт нь geodesic lower-bound geometry дээр, road trench length биш.

| Загвар | Холбоос | Урт км | Гүүр | Normal max RTT ms | 1-link failure worst reachable RTT ms | Салгах 1-link scenario |
|---|---:|---:|---:|---:|---:|---:|
| MST | 21 | 3952.29 | 21 | 27.24 | 27.24 | 21/21 |
| Heuristic resilient | 28 | 6505.98 | 0 | 24.34 | 29.24 | 0/28 |
| Theoretical mesh | 231 | 152750.58 | 0 | 18.10 | 18.10 | 0/231 |

Resilient length overhead is about **64.6%** above MST; no 15–20% promise. For the assumed 2 Gbps hub demand + 10 Gbps selected flow, 100 Gbps links: normal maximum utilization 36% in MST/resilient; no overload or reachable-pair RTT >50 ms in enumerated single-link cases. MST disconnected pairs are counted separately; its latency number does not imply every pair is reachable.

Cached in-process API including JSON serialization: 25 samples, median 14.21 ms, max 21.67 ms. This is TestClient, not browser/network latency. Peak measurement process RSS ~533 MiB while enumerating all scenarios. Live Uvicorn RSS measured at 37,580 KiB (~36.7 MiB) after browser tests. Clean final browser tab logged zero console errors; map, cut/repair, pause/play, full mesh and existing-network empty state were inspected. Desktop 1440×1000 and the default narrow panel were checked; labels in dense central cities can overlap until zoomed. Initial dependency/data preparation took approximately 4 minutes over the available connection; implementation and verification longer. Raw country extract is ~300 KiB; Python environment and frontend dependencies are local setup assets, not GIS memory claims.

## Бодит FRR laboratory статус

**Бодитоор баталгаажаагүй / SKIPPED.** Ordinary and escalated Docker socket access both returned permission denied. `sudo -n` required a password. No credentials were used or stored by the application. Compose configuration validates without daemon access. Four router configurations and a real smoke test are provided, but FULL neighbors, actual routes, ping, cut/recovery cannot be reported as passed. Optional Unix-socket allowlisted controller lets the web process stay unprivileged when a user starts it separately with sudo.

## Solver статус ба хүрээгүй шаардлага

MST is optimal for the modeled nearest-neighbor candidate set and configured cost. Resilient is **weighted augmentation heuristic**, no proven optimality, lower bound or gap; keeps the MST. No exact 2-edge-connectivity MILP/separation solver installed. Async optimization endpoint exists; jobs are in memory and cancellation suppresses returned work, not native solver interruption. Capacity/RTT constraints are post-validated, not optimized.

Missing GIS/engineering requirements: road/rail corridor acquisition/preprocessing, alternative real corridors, snapping/continuity/bridge/tunnel handling, DEM elevation/slope, river-crossing verification, terrain exposure, legal access, true shared physical segments/SRLG, incident polygons/exact geospatial intersections, protected/no-build areas. Radius API uses sampled approximate lines, not a flood model. The single-cable corridor action is one-to-one placeholder. The UI also supports explicit user-assumed multi-cable SRLG groups and a 100 km radius preview/cut at a selected city; neither establishes real shared-trench exposure. Real existing-infrastructure map remains empty; operator self-report is linked with publication date unknown, no surveyed alignment fabricated.

Simulation limitations: deterministic aggregate flow model, no SimPy or packet simulation, combined detection+reconvergence transition, no queue/drop percentages or auto repair-duration scheduler. Node editing/routing asset CRUD, scenario import, richer charts, full 22-router emulation and observed-path animation are not implemented. FRR cut acknowledgement is separate from measured route/ping evidence; no invented convergence time.

Offline basemap fallback: network tiles are optional; WebGL initialization failure produces a vector SVG diagram, with 22 geographically positioned cities and clickable cables. It is schematic and lacks basemap boundaries. DEM/3D terrain/hillshade overlays are not shipped.

Scenario parameters are configurable before creating a new run: selected demand, per-link capacity, relative cost/km, detection delay and reconvergence delay. Radius preview uses the same sampled geometry rule as applying the incident. User-assumed SRLG groups persist and a test verifies multi-link cut and restoration.

## Client interface refresh

The interface now uses warm cream, lavender, peach, sage and pale yellow with rounded panels. The primary flow is two steps: select a city pair, then try one cable failure. The experiment starts the modeled clock automatically and shows detection/recovery status. Map city cards offer source/destination actions, and cable cards offer cut/repair. Parameters, advanced incidents and detailed metrics are behind disclosures. TypeScript and the production build pass; the redesigned one-click failure and repair were checked in the browser with all 22 sites remaining reachable in resilient mode. No backend or geographic guarantees changed.
