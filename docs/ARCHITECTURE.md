# Архитектур

## Давхарга

1. Geographic inputs: `nodes.json`, GeoNames gazetteer city centers in WGS84. pyproj.Geod generates 12 intermediate points per geodesic and sums the full geometry. No Web Mercator length measurement. No surveyed equipment location, roads, river crossings or DEM data claimed.
2. Logical design: a theoretical complete graph has 231 pairs; feasible-corridor access is unverified. MST and resilient design use the undirected union of each city's four closest geographic neighbors. Each approximate link has one placeholder physical_segment_id and corridor_id. These do **not** establish real physical diversity. Radius incidents use sampled geometry proximity with an explicit all-exposed-assets rule; not flood probability or exact intersection analysis.
3. Real lab: four Docker FRR routers. Explicit per-link internal bridges, fixed interface names/subnets and OSPF point-to-point. No management transit. `lab/addressing.json` maps interfaces. Loopbacks 10.255.0.1–4/32; subnets 10.230.1–4.0/29 reserve .1 for Docker bridge and use .2/.3 for router endpoints. Cost 10 on first three links, cost 50 on UB–Bulgan alternative. Distinct router IDs. `lab/scripts/check.py` must confirm actual behavior before claiming success.

## Algorithms and guarantees

MST minimizes relative installation cost (1 unit/km) over the modeled nearest-neighbor candidate set. Connected 22-node tree: 21 edges, 21 bridges. Weighted NetworkX k_edge_augmentation adds candidates for k=2. It is a heuristic and keeps the MST; it is not direct minimum-cost survivable design or an exact MILP. Bridge detection is NetworkX chain decomposition. Infeasible inputs are rejected in tests; no silent partial augmentation. The mesh is purely theoretical.

Tests remove every selected logical link, and the one-to-one placeholder physical segment associated with that link. This proves the graph's single-link property only. No node-disjoint, multi-link, geographic SRLG or 50 ms all-failure guarantee is claimed.

## Simulation and persistence

Every run stores immutable nodes and selected baseline edges in SQLite with mutable scenario state. Mutations are locked, versioned, and returned as one complete snapshot, keeping map and metrics from the same version. Seeds are unnecessary: this version uses no random events. The saved IDs and topology survive a restart. Reset removes scenario incidents, not baseline assets.

Simulation time advances at one-second server ticks multiplied by selected speed, or one step at a time. Pause stops modeled time. An incident records its requested affected assets immediately, and route failure is applied after detection (1 s) + reconvergence (2 s). This is a simplified combined transition: no packet-level blackhole/detection state or independently measured failure detector. Repair immediately restores assets; repair-duration scheduling is not implemented. SSE sends changes with heartbeat; EventSource reconnects and receives a full current snapshot. Export JSON includes the whole baseline/run; GeoJSON and CSV export baseline link geometry/attributes.

Traffic: assumed 2 Gbps from each non-UB city to UB plus a selected 10 Gbps flow. Costs select paths. Aggregate link utilization is summed demand/capacity, overload is a flag, not invented packet loss. No queueing, serialization or traffic-class scheduler. A surge multiplies hub demands only. No SimPy packet or discrete-event fidelity is claimed.

Propagation RTT = 0.01 × symmetric route length in km. Unreachable RTT is null. Maximum RTT and 50 ms violations are over reachable unordered pairs, with unreachable pairs counted separately. Metrics update after incidents; `scripts/measure.py` additionally enumerates every single-link failure. Local ping RTT comes only from FRR/Linux execution, never geographic length. No netem injected delay.

## Security and privileges

Web binds 127.0.0.1. Host/origin checks restrict browser access to local hosts. No browser-supplied shell is executed. FRR operation and router/link IDs are allowlisted; subprocess uses argument lists and a 15 s timeout, ping is bounded. No socket is mounted in a web container. The host Python controller runs as the invoking user; if that user has Docker privileges, the API process inherits that powerful privilege. It is a local demo boundary, not a hardened multi-user service. Do not expose ports or run the API as root. FRR containers require NET_ADMIN/NET_RAW/SYS_ADMIN as scoped to their namespaces, never privileged host networking. Compose creates project-owned virtual bridges, not changes to physical NICs/firewall policy/host routing scripts.

## Dependencies / primary documentation

- https://maplibre.org/maplibre-gl-js/docs/ — MapLibre 6 worker URL is explicitly bundled by Vite.
- https://fastapi.tiangolo.com/deployment/manually/ — Uvicorn local ASGI server.
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.connectivity.edge_augmentation.k_edge_augmentation.html — heuristic guarantees/limitations.
- https://docs.frrouting.org/en/latest/ospfd.html — OSPF JSON commands, interface type/cost.
- https://frrouting.org/release/10.5.5/ — pinned FRR image release.
- https://docs.docker.com/reference/compose-file/services/ — interface_name >=2.36.
- https://docs.docker.com/reference/compose-file/networks/ — internal per-link networks.

Dependency versions are frozen in requirements.lock and frontend/package-lock.json. No full host update.

Optional restricted controller: `lab/controller.py` runs separately under sudo and owns a 0600 Unix socket chowned to SUDO_UID. Its JSON protocol only accepts status/read/ping/state and calls the same argument-list allowlists. The ordinary web process automatically uses that socket when present. It gets no Docker socket or arbitrary subprocess API. The controller must run trusted project code and should be stopped after the demo. It is single-request-at-a-time with bounded subprocess execution and 4096-byte request limit.
