# Codex implementation prompt — Mongolia Fiber Network Simulator

You are implementing a real local software project, not writing a proposal. Act as a senior full-stack engineer with GIS, graph optimization, Linux networking, and simulation experience. Build, run, debug, and verify the application in the current workspace. Read applicable AGENTS.md first. Preserve unrelated files and inspect existing code before changing it.

## 1. Context and objective

Project title: “Шилэн кабелийн сүлжээний загварчлал ба симуляцийн систем”.

The user is one cybersecurity student, working alone on Omarchy Linux (Arch-based), with about 16 GB RAM. The demonstration deadline is October 14, 2026, Asia/Ulaanbaatar. Internet is available at the demonstration. Prioritize a finished, reproducible demonstration over broad unfinished features. If executing after this deadline, retain the same demo-first priorities without pretending the deadline is still upcoming.

Create a Mongolian-language web application that:
- Plans a NEW national fiber network connecting Ulaanbaatar and the 21 aimag capitals.
- Uses geographically grounded candidate routes, road/rail corridors, river crossings and terrain.
- Compares MST, resilient topology, and a theoretical full mesh.
- Shows animated traffic and failure/recovery on the geographic map.
- Includes REAL OSPF neighbor state, routing tables and ping from local emulated routers.
- Offers a separate view of publicly documented existing fiber infrastructure, with provenance and honest coverage limitations.
- Distinguishes geographic/engineering simulation from actual local router emulation.

Do not stop after scaffolding, a plan, screenshots of a mockup, or code that has never run. Make a working vertical slice early, then expand it.

## 2. Execution rules and priorities

Inspect OS, CPU/RAM, Python, Node, Docker/Compose availability and existing project files. Choose currently supported, compatible dependencies and lock versions. Verify official documentation for FRRouting, MapLibre, FastAPI, solver interfaces and package installation rather than relying on stale commands.

Do not ask routine design questions. Make sensible assumptions and record them. Ask only when a missing privilege, credential, or essential requirement truly blocks work. Never claim a privileged operation ran when it did not.

Do not upgrade the entire host, disable the host firewall, modify physical network interfaces, delete unrelated Docker resources, or alter existing host routes. Scope all emulation to this project's containers and virtual networks. Bind web/API ports to localhost by default.

Implement in this order:
P0: Working map + all 22 nodes + persisted topology + route selection + cut/repair + animated rerouting + truthful metrics.
P0: Real 4–6-router OSPF lab integrated into the same UI, demonstrating neighbors, routes, ping, link failure and recovery.
P1: Road-based routes, terrain/river analysis, resilient optimization, shared-risk failures, exports.
P1: Expand emulation to the selected 22-node topology if resources and remaining time permit.
P2: Verified existing-network coverage, richer charts, additional scenarios and visual polish.

The 4–6-router lab is a clearly labeled subset of the national topology, not a claim that all 22 routers are emulated. Keep the 22-node planning mode functional regardless of lab availability. Do not conceal missing functionality.

Use optional Compose profiles for heavy services. Prefer simple persistence (SQLite + GeoPackage/GeoJSON) for the deadline; add PostGIS only if justified and it does not delay completion.

## 3. Recommended stack

Frontend: React, TypeScript, Vite, MapLibre GL JS, lightweight CSS/Tailwind if appropriate.
Backend: supported Python version, FastAPI, Pydantic, Uvicorn.
Graph engine: NetworkX.
GIS pipeline: GeoPandas, Shapely, pyproj, Rasterio; osmium or another suitable PBF reader if needed.
Optimization: SCIP/PySCIPOpt if straightforward to install; otherwise a documented suitable MILP solver or NetworkX augmentation fallback.
Discrete-event engineering simulation: SimPy.
Real router emulation: FRRouting Linux containers with OSPFv2, using project-scoped point-to-point virtual links. Select Compose or containerlab/veth orchestration according to local tooling and verified feasibility.
Testing: pytest and frontend type/build checks; browser end-to-end checks where tooling is available.

QGIS is useful for manual GIS verification but must not be required to run the demo. Do not require paid APIs, accounts, or cloud deployment for core features.

Suggested layout (adjust if existing repo structure warrants it):
backend/app/{api,models,graph,gis,optimization,simulation,emulation}
frontend/src/{components,map,pages,api,types}
data/{raw,processed,provenance}
lab/{configs,scripts}
scripts/
tests/
docs/
compose.yaml
README.md
.env.example

## 4. Geographic data and provenance

Research and acquire real geographic inputs. Never invent coordinates or route distances and describe them as measured.

Initial source leads:
- https://download.geofabrik.de/asia/mongolia.html — Mongolia OSM PBF/GeoPackage.
- Copernicus GLO-30 via official Copernicus/ESA or OpenTopography sources — surface elevation.
- Official/primary Mongolian sources for administrative centers and published fiber infrastructure.
- Official operator reports/maps where publicly available.

Record source URL, publisher, retrieval date, dataset/version date, license, SHA-256 for downloaded assets, transformations, units, confidence and limitations. Honor licenses and map attribution. Cache acquired data and support restart without redownloading. Do not bulk-scrape public OSM tile servers or misuse public routing services.

Node seed list to VERIFY against geographic sources:
Улаанбаатар; Цэцэрлэг (Архангай); Өлгий (Баян-Өлгий); Баянхонгор; Булган; Алтай (Говь-Алтай); Чойр (Говьсүмбэр); Дархан (Дархан-Уул); Сайншанд (Дорноговь); Чойбалсан (Дорнод); Мандалговь (Дундговь); Улиастай (Завхан); Арвайхээр (Өвөрхангай); Даланзадгад (Өмнөговь); Эрдэнэт (Орхон); Сүхбаатар (Сэлэнгэ); Баруун-Урт (Сүхбаатар); Улаангом (Увс); Ховд; Мөрөн (Хөвсгөл); Чингис (Хэнтий); Зуунмод (Төв).

Store stable ASCII IDs, Mongolian display names, aimag, verified latitude/longitude, sources and confidence. Resolve ambiguous place names, e.g. aimag capitals rather than similarly named settlements.

Coordinate rules:
- Geographic coordinates use WGS84.
- GeoJSON uses [longitude, latitude].
- Measure lengths geodesically or in a suitable metric projection, never in degrees or uncorrected Web Mercator.
- Record whether distance is road/rail geometry length, approximate geographic length, or authoritative published measurement.
- Center and bound the map on Mongolia.

If road or terrain data cannot be acquired in time, ship an explicitly marked approximate fallback. Keep realistic route geometry and straight-line approximations visually and semantically distinct. Maintain a data-quality panel.

## 5. Physical routing model

Separate at least three layers:
1. Geographic physical infrastructure: junctions, route segments, crossings and corridors.
2. Logical fiber network between city sites.
3. Router-emulation links, interfaces and routing state.

A city-to-city connection can traverse several physical segments. Multiple logical edges may share one physical segment. An incident affecting that segment must affect every dependent logical edge.

Generate feasible candidate corridors along road/rail infrastructure, without assuming permission to build along all roads or railways. Flag legal/access feasibility as unverified where appropriate. Check graph continuity, snapping, bridges/tunnels, grade-separated intersections and disconnected road components.

Do not keep only one shortest route per city pair. Preserve feasible alternatives using different corridors. Avoid routes that silently pass through another modeled city without representing that connection/junction.

For each candidate route store:
id, endpoints, GeoJSON geometry, length_km, physical_segment_ids, corridor_ids, elevation profile, slope summary, crossing count, capacity_gbps, estimated_cost, provenance and confidence.

Analyze:
- Elevation profile and steep-terrain exposure.
- River crossings, verifying crossings rather than counting every nearby river.
- Shared bridges, trenches and mountain corridors.
- Optional protected areas or explicit no-build zones if credible data is available.

Copernicus GLO-30 is a surface model, not a precise surveyed bare-earth trench model. Terrain and river proximity alone do not establish real flood/landslide probabilities. Label derived risk scores as proxies. Never manufacture historical failure rates.

Initially download/clip elevation near selected corridors rather than loading Mongolia's entire high-resolution raster into memory.

## 6. Cost and resilience optimization

Store cost parameters with units, configurable in the UI or scenario settings:
base installation cost/km, difficult-terrain surcharge/km, crossing surcharge, equipment/site cost if modeled.
Use clearly labeled relative cost units if real engineering quotes are unavailable. Do not display invented MNT quotations as facts.

Baseline:
- Compute MST on connected feasible candidates using cost.
- A simple connected 22-node MST must have 21 edges, all bridges.
- The theoretical complete simple city graph has 231 edges.
- Full mesh is a comparison baseline, not a declaration that all 231 physical routes are feasible or independent.

Resilient optimization:
- Prefer direct minimum-cost survivable network design over forcing every MST edge into the final network.
- Use binary candidate-selection variables and a valid 2-edge-connectivity MILP formulation.
- For every nontrivial node cut S, require at least two selected crossing links.
- Avoid enumerating all cuts upfront; iteratively solve, identify violated connectivity/min-cut constraints, add constraints and resolve, or use a properly supported solver separation method.
- Track solver time, status, incumbent, lower bound and relative optimality gap.
- Claim “optimal” only when the solver proves optimality within stated tolerances for the actual modeled candidate set and constraints.
- If time-limited, display “best feasible solution found” and gap.
- If no feasible solution exists, show unmet requirements instead of silently relaxing them.
- A fallback weighted NetworkX augmentation must be labeled heuristic/approximate.
- NetworkX bridges uses chain decomposition; do not falsely describe that function as Tarjan. Implement Tarjan separately only if necessary.

Geographic resilience:
Define shared-risk link groups (SRLG) for shared physical segments, bridges or corridors. Validate chosen incident scenarios by removing all affected segments/links. Two logical edges on one physical corridor are not independent protection paths.
Scope guarantees explicitly: single logical-link failure, single physical-segment failure, selected SRLG failure, or node failure. Do not conflate them.

Do not promise that 15–20% extra length always suffices. Report actual overhead relative to the MST and cost/length tradeoffs separately.

Capacity and RTT constraints:
Do not claim these are enforced in the optimizer unless the formulation actually includes them.
A practical initial version may optimize connectivity/cost, then validate traffic and RTT, flag violations and iterate. Explain this honestly.
Optimization is an asynchronous job with progress/status and cancellation. Cached graph queries should be fast, but exact optimization has no universal one-second guarantee.

## 7. Engineering simulation

Use independent immutable baseline topology and mutable per-run scenario state. Repeated incidents must not corrupt the saved design. Seed randomized simulations for reproducibility.

Scenario settings include:
- Source/destination cities.
- Traffic demand matrix or several clearly labeled assumed traffic classes.
- Capacity per link.
- Failure detection delay.
- Routing reconvergence delay for modeled mode.
- Repair duration.
- Incident geometry and affected asset list.

Model events:
normal operation → physical failure → detection → route withdrawal/recomputation → recovery of reachable flows → repair → restoration.

Implement:
- Single cable/segment cut.
- Flood/landslide incident polygon or radius affecting selected physically exposed assets.
- Shared corridor outage.
- Node/power outage.
- Traffic surge.
- Repair individual/all affected assets.
- Reset, play, pause, step and simulation-speed controls.

An incident area should not automatically destroy every asset unless that is the selected scenario rule; show the rule and affected-asset preview.

Rerouting:
Use appropriate weighted paths and a transparent routing policy. Distinguish physical shortest-distance routes from OSPF cost-based routes.
Recompute flow allocation after failures and compare total link load with capacity.
Define queue/drop behavior rather than inventing percentages. For the deadline, deterministic aggregate flows with overload flags are acceptable, labeled as a simplified model. Do not imply packet-accurate performance without implementing it.

RTT:
Propagation speed assumption: roughly 200,000 km/s in fiber.
For symmetric one-way route length L km, propagation RTT ≈ 0.01 L ms.
Add explicitly modeled processing, serialization and queueing only if implemented.
If forward/reverse paths differ, use their combined lengths.
Disconnected pairs return unreachable, never RTT=0.
Report max pairwise modeled RTT in normal state and each required failure scenario; flag 50 ms violations.

Real local ping RTT is a separate metric from geography-based estimated RTT. Do not substitute one for the other. Optional tc/netem delay should be explicitly identified as injected delay, applied consistently in both directions without double-counting.

## 8. REAL FRRouting/OSPF integration

This is a required integrated project feature, not fake console text.

First implement a reliable 4–6-router topology with a primary path and an alternative path, then expand if feasible.
Use distinct router IDs, point-to-point subnets and city loopback addresses. Enable forwarding and OSPF advertisements. Document addressing and OSPF costs.

Provision physical virtual links explicitly:
- Compose networks alone do not automatically represent the required fiber links.
- Use project-scoped bridges/veth or an appropriate containerlab setup.
- Maintain city/edge-to-container/interface mappings.
- Disable lab links at both endpoints when applicable.
- Keep management connectivity separate from simulated fiber interfaces.
- Prevent management/default-route shortcuts from carrying test traffic.
- Make ping originate at the proper router/loopback and target the destination loopback.

Expose read-only operations for:
OSPF neighbor state, IP routing table, OSPF routes, interface state, bounded ping and optionally traceroute.
Prefer structured FRR JSON outputs; retain raw output with timestamps for inspection.
Use validated allowlisted router IDs and operations, never arbitrary shell commands from the browser.
Use subprocess argument lists and strict timeouts.

On a real lab cut:
1. Show actual interface-down acknowledgement.
2. Poll real OSPF/route state.
3. Record route transition/reachability observations.
4. Display observed ping results and packet loss.
5. Animate the observed path where it can be derived, accounting for ECMP or unknown path evidence.
6. Restore interfaces and show recovery.

Do not turn backend graph recomputation into fabricated OSPF output.
Do not present assumed model reconvergence times as measured real FRR convergence.
Show lab unavailable/permission denied errors honestly and retain planning/simulation mode.

Avoid giving the web API unrestricted Docker-socket access. Prefer a restricted local controller or allowlisted host helper. Explain any remaining privilege boundary. NET_ADMIN/root requirements apply only to project-scoped emulation.

Keep real-time emulation clock separate from accelerated simulation time. UI pause/speed settings must not imply they pause FRR unless explicitly implemented.

## 9. Existing fiber network mode

Research primary operator/government reports for documented routes/nodes.
Every displayed existing-infrastructure feature requires a source and uncertainty classification:
verified geographic alignment; schematic published route; inferred/approximate alignment.

A schematic report line is not surveyed GIS geometry.
Do not infer deployed fiber simply from a road, internet availability, or a new planned route.
Show publication dates, potentially outdated information and coverage limitations.
If usable evidence is sparse, show the verified subset and an informative empty/partial state.
Preserve this mode as separate read-only reference data. Do not optimize or claim full national coverage of existing infrastructure unless supported.

## 10. UX and animation

All main user-facing text is Mongolian. Technical acronyms may remain with explanatory labels.

Build a polished, legible presentation interface:
- Main map with city labels, route selection, zoom and visible attribution.
- Topology switch: MST (red), resilient (blue), theoretical full mesh (green), documented existing network.
- Terrain/hillshade, rivers, road corridors and incident overlays.
- Side panel for selected city/cable, route length, capacity, cost basis and data confidence.
- Summary cards for installed length, cost, bridges, components, reachable cities, RTT violations and utilization.
- Event timeline with detection, route change, repair and recovery.
- Tabs for geographic simulation and real OSPF lab.
- Real neighbors/routes/ping panel with refresh timestamps and clear errors.

Animate traffic along ACTUAL route polylines using moving points/particles or an efficient overlay.
Animate broken cable, affected assets, route transition and restored flow.
Use requestAnimationFrame and avoid recreating map layers every frame.
Respect reduced-motion preferences and provide speed/pause controls.
Color is supplemented by icons, labels or line styles.

A working demo sequence:
1. Show 22 cities and MST bridge exposure.
2. Switch to resilient topology and show bridge count zero.
3. Select a pair and animate traffic.
4. Cut a segment on its path.
5. Show impact, detection and alternate route with changed metrics.
6. Trigger a shared-corridor incident and explain any isolation.
7. Repair and restore.
8. Open real OSPF lab: neighbors/routes/ping before and after cut.
9. Show documented existing-network sources and uncertainty.

Terrain 3D is optional visual polish, not a prerequisite for correct geospatial analysis. Provide a usable 2D fallback if WebGL/terrain tiles fail.

## 11. API and state

Define shared frontend/backend schemas and stable IDs.
Suggested routes:
GET /api/health
GET /api/data/status
GET /api/nodes
GET /api/routes
POST/PATCH/DELETE node and route operations
GET /api/topologies
POST /api/optimization/jobs
GET /api/optimization/jobs/{id}
POST /api/simulation/runs
POST /api/simulation/runs/{id}/incidents
POST /api/simulation/runs/{id}/repair
POST /api/simulation/runs/{id}/control
GET /api/simulation/runs/{id}/metrics
GET /api/existing-network
GET /api/provenance
GET /api/lab/status
GET /api/lab/routers/{id}/neighbors
GET /api/lab/routers/{id}/routes
POST /api/lab/ping
POST /api/lab/links/{id}/state

Use SSE or WebSocket for event updates, with reconnect handling.
Version state snapshots; avoid racing metrics and map data from different simulation states.
Validate coordinates, costs, lengths, capacities and malformed requests.
Reject nonexistent edges; do not pretend a cut succeeded.
Persist designs/scenarios and support JSON/GeoJSON/CSV exports.

## 12. Verification and acceptance criteria

Actually run the application and fix errors.

Graph tests:
- All 22 verified node IDs are distinct.
- Connected MST has n-1 edges and each is a bridge.
- Resilient result is connected and bridge-free.
- Remove each selected logical link individually and verify stated guarantee.
- Remove physical segments/SRLGs and verify scope-specific results.
- Infeasible candidate set reports infeasible.
- Repeated incidents, repair and reset are consistent.
- Costs, units, route geometry and unknown values are handled correctly.
- Unreachable city pairs are never treated as zero-latency.
- Tests include known small graphs with analytically checkable answers.

GIS checks:
- Nodes are within expected Mongolia bounds and correspond to intended cities.
- Distances are computed correctly from full route geometry.
- Candidate routes are not falsely labeled road-based.
- Duplicate river crossings and shared segments are handled.
- Elevation/source failures produce explicit quality flags.

Real lab smoke tests:
- Router containers start and expected neighbors reach FULL state.
- Loopback-to-loopback ping works.
- Routing table shows expected learned routes.
- Disabling primary link changes real route state while an alternative exists.
- Restore works.
- Management network is not a transit shortcut.
- Tests are skipped with a stated reason when required privileges are unavailable; never report them as passed.

Frontend:
- Typecheck and production build pass.
- Run browser checks if possible.
- Map renders, toggles, selects, animates and handles cut/repair.
- Errors, empty data, lost backend and unavailable lab are usable states.
- Check common desktop presentation sizes.
- No unhandled console errors.

Measure actual response times; separate cached interactive API latency from preprocessing, optimization and router convergence.

## 13. Deliverables and completion report

Produce:
- Complete runnable source.
- Locked dependencies and .env.example without secrets.
- Local startup/stop/reset scripts and Makefile commands.
- Data acquisition/preprocessing scripts and cached processed demo assets.
- Sources/provenance manifest and limitations document.
- Reproducible lab configuration.
- Meaningful tests and test results.
- README in Mongolian with exact startup commands and URLs.
- docs/DEMO_GUIDE_MN.md: a 5–7-minute demonstration script.
- docs/ARCHITECTURE.md: data layers, algorithms and real-vs-modeled metrics.
- docs/RESULTS.md: measured outcomes, solver status, unresolved requirements.
- Exportable network/scenario results.

Suggested commands to implement:
make doctor
make setup
make demo
make lab-up
make lab-check
make test
make reset-demo
make stop

Record actual hardware/software used, approximate RAM usage, downloaded asset sizes and preparation time. Keep large raw data out of git and document acquisition.

Final response must state:
1. What runs and how to start it.
2. Which features were verified.
3. Whether real OSPF lab was actually tested.
4. Geographic data quality and existing-network coverage.
5. Solver optimality status and any unmet RTT/capacity/resilience constraints.
6. Remaining limitations.

Start by inspecting the environment and repository, then immediately build the first working end-to-end slice. Continue through implementation and verification. Do not end with only a plan.

