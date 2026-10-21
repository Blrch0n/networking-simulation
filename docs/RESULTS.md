# Шинэ академик хувилбарын үр дүн — 2026-10-21

Энэ файл нь одоогийн length / eliminated-bridges heuristic-ийн **шинэ** туршилт. Өмнөх NetworkX augmentation-ийн 28 кабель, 6505.98 км гэсэн тоо нь энэ хувилбарын үр дүн биш. Хуучин тайлан `RESULTS_LEGACY_ARCHIVE.md`, хуучин raw хэмжилт `measurements.json`-д тусад нь үлдсэн.

## Анхны 22 хотын бодит тооцоо

| Загвар | Кабель | Урт км | Гүүр | Normal max RTT ms | Холбоотой single-cut / нийт | Worst connected-cut RTT ms |
|---|---:|---:|---:|---:|---:|---:|
| MST | 21 | 3952.2864 | 21 | 27.2355 | 0/21 | — |
| 2-Edge heuristic | 29 | 6338.1666 | 0 | 20.7801 | 29/29 | 24.6367 |
| Full Mesh | 231 | 152750.5824 | 0 | 18.0983 | 231/231 | 18.0990 |

2-Edge нэмэлт урт: **60.3671%**. Бүх 29 single-cut үед холбоотой ба max RTT ≤50 ms. Worst case: **Алтай–Баянхонгор** тасрахад 24.6367 ms. MST-ийн 21 cut бүгд графыг салгадаг; түүний reachable хэсгийн latency-г бүх сүлжээний latency гэж дүгнээгүй. Healthy MST/2-Edge хамгийн хол хос: Чойбалсан–Улаангом. Full Mesh хамгийн хол хос: Чойбалсан–Өлгий.

Эдгээр нь verified road trench length эсвэл бодит ping биш. Coordinates: existing sourced GeoNames dataset. Геодезийн ойролцоо урт ×0.01 нь зөвхөн тархалтын RTT. Физик corridor independence, node failure, processing/queueing/serialization ороогүй. 2-Edge нь heuristic, global optimum биш.

## Тест ба хэмжилт

- `make test`: **21 Python tests passed, 1 real-FRR test skipped**; browser graph/editor/storage tests болон **51 Python/browser parity cases passed**. Known triangle on-path cut 3 км → 4 км alternate path, hand-checkable MST, Tarjan/Dijkstra vs seeded NetworkX reference graphs, impossible/disconnected/empty graphs, malformed graph inputs, 23rd city, city removal, length editing, undo/reset, invalid/blocked storage, all original 29 protected and 231 mesh single failures багтсан.
- Clean `npm ci` passed; lockfile matches exact direct dependencies. TypeScript болон local/`VITE_STATIC_DEMO=1` builds passed. Leaflet 1.9.4 SVG, no MapLibre dependency or worker. npm audit reported 0 vulnerabilities for installed packages.
- Node v26.8.2: all three original designs plus exhaustive checks нийт **230.32 ms**. Энэ нь Node-д browser core-ийг ажиллуулсан хэмжилт, browser paint/network latency биш.
- Python 3.14.7, Linux-7.2.5-3-omarchy-x86_64-with-glibc2.44; 15 uncached runs. Planner median **40.92 ms**, max **58.79 ms**. Validated API TestClient median **70.80 ms**, max **134.76 ms** (JSON serialization орсон; интернет latency биш). Peak process RSS **89.5 MiB**.
- Raw current results: `planning-results.json`, `planning-performance.json`. Reproduce: `make test-graph`, `make measure-planning`. Timing changes between runs are expected.

## Browser QA performed

- Desktop 1440×1000 and 390×844 narrow layout inspected. Mobile document client/scroll widths both 375 px (390 px viewport includes scrollbar); no page-wide horizontal overflow. Comparison table scrolls inside its own container. No WebGL canvases; SVG overlays present.
- OSM tiles loaded; city/cable labels, direct city/cable selection, selected route, bridge toggle, topology switching, MST disconnection, 2-Edge reroute, restore and exhaustive Full Mesh 231/231 checked.
- Editor: add 23rd city with optional estimated candidates; rename/coordinate edit; deleting the selected source chooses a valid replacement; undo; original-data reset; candidate length edit recomputes all three designs; delete candidate changes Full Mesh to 230-candidate graph and saving restores it to 231; persistence after refresh checked.
- Static build tested through an ordinary HTTP file server without Python API; no real-OSPF controls rendered. Clean browser error log was empty. New screenshots: `academic-desktop.png`, `academic-mobile.png`; older cozy/dark screenshots are archive artifacts.
- Tile failure fallback is implemented (SVG vectors do not depend on tile load), but a full offline tile outage was **not fault-injected** in the browser. Blocked/quota/malformed storage recovery was tested with controlled storage doubles, not by changing the user's browser preferences.

## Real OSPF — SKIPPED

`make lab-check` returned permission denied on `/var/run/docker.sock`, then SKIPPED (exit 77). No new FULL-neighbor, real routing-table, ping or convergence experiment was claimed. Existing 4-router configurations/controller remain local. Main 22-city graph assessment and Vercel do not depend on this lab.

## Deployment and scope

Existing production target: https://networking-simulation-beta.vercel.app/, project `networking-simulation`, scope `bolroos-projects`. Existing config/build commands are preserved. Actual deployment status and commit are recorded in the final task response after the authenticated CLI deployment and live browser check; a local successful build alone is not evidence of an updated live site.

Main workflow no longer contains hero slogans, pastel marketing cards, animation clocks, play/pause/speed, detection/reconvergence delay settings, traffic surge/capacity controls, power/radius/SRLG scenarios or publicly nonfunctional real-router controls. Legacy backend APIs are retained for compatibility, separate from the academic planner.
