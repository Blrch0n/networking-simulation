# Current academic planner architecture

## UI and state

React/TypeScript renders one compact graph-planning workflow. Leaflet 1.9.4 uses SVG paths and OSM raster tiles; no WebGL renderer or map worker. One map instance is retained across selections, routes, edits and cable failures. Overlay groups update; only initial load or the explicit fit button fits bounds. Tile errors leave vectors visible. City names are inserted as text, never interpreted as HTML.

`workspace.ts` owns validated schema-version-2 browser persistence and immutable one-step undo. Graph data, source/destination and topology are persisted. A city deletion repairs invalid route endpoints. Failed cable state is intentionally transient; one failure replaces the preceding one, restoring simply clears it. No simulation clock or packet-traffic claim.

Storage errors recover to original seed or in-memory changes with a visible notice. The old v1 scenario keys are not overwritten. On-disk seed is `frontend/public/demo/network.json`, exported from the original GeoNames/WGS84 data. It contains **candidates**, not preselected designs. Graphs may have 0–100 cities and at most 4950 simple undirected candidates.

## Algorithms and deterministic parity

`frontend/src/graph.ts` and `backend/app/planning.py` implement the same definitions:

- Kruskal on **all currently available** candidates, sorted by `(length, canonical endpoint pair, edge ID)`. Disconnected candidates produce a forest, explicitly not a connected design.
- Tarjan DFS handles every component. `discovery[u]` is first visit index; `low[u]` is earliest ancestor reachable using descendant tree edges and one back edge. Tree edge u–v is a bridge iff `low[v] > discovery[u]`.
- 2-Edge begins with the MST/forest. For each unused available edge, count how many current bridges disappear when it is added. Minimize `length / bridges_eliminated`; ties use the same edge order. Stop at zero bridges or no improving edge. Success still requires the entire graph to be connected. This deterministic heuristic is not global survivable minimum-cost optimization.
- Dijkstra uses sorted node IDs for equal tentative distances and sorted adjacency; equal-length predecessor ties retain first discovery. Python uses NetworkX all-pairs distances and components; independent tests compare custom Tarjan and Dijkstra to NetworkX. Both modes report identical selected IDs, routes, connectivity, bridge IDs, max-pair RTT, and empty/disconnected semantics in parity fixtures.
- Main maximum RTT is max shortest distance over **all unordered city pairs** ×0.01. Disconnected graph → null; reachable-pair maximum is separately labeled. Every node/edge/pair count is dynamic. A network is protected iff connected and bridge-free.
- Exhaustive verification removes each baseline installed edge independently. Baseline disconnection or zero cases cannot pass. Report connected/disconnected counts, worst connected-case RTT and responsible cable, and all-cases connectivity plus ≤50 ms.

`engine.py` retains geographic generation and legacy aggregate scenarios, but its `design()` compatibility wrapper now delegates to the same planner definitions. Old scenario APIs remain for compatibility; they are not the main teaching workflow. They are not a second UI simulation clock.

## Local and hosted computation

Local `POST /api/planning/analyze` validates the edited graph and computes designs, metrics and optionally exhaustive verification. Existing loopback Host/Origin protection is unchanged. React shows the Python result only when its graph/topology/endpoints/failure request identity still matches current state; stale responses cannot overwrite an edit. Browser calculation provides an explicit fallback if the API is unavailable. The calculation-mode label distinguishes modes.

Vercel retains its existing static Vite config. `VITE_STATIC_DEMO=1` removes Python API requests from the main workflow, computes dynamic designs locally, and hides the real OSPF toggle. No SQLite, background process, fake SSE or localhost backend dependency. Only public static assets are served. Parameter editing is the same in both modes.

## Geometry and editing semantics

Initial coordinates: GeoNames administrative capitals in WGS84, with per-record source IDs, modification dates and CC BY attribution. Initial length: pyproj.Geod WGS84 geodesic, full sampled geometry, not road/rail alignment. No surveyed corridor or terrain claim. New optional automatic candidates use great-circle distance with mean Earth radius 6371.0088 km; these are labeled estimates. A city coordinate edit rebuilds incident endpoint geometry, retaining user-entered length. Saving a city pair updates/restores the one undirected candidate. Self-loops, duplicates, invalid endpoints/coordinates and nonfinite/nonpositive lengths are rejected. No monetary quotes.

`RTT_ms = 2 × km / 200000 × 1000 = km × 0.01`. No processing, queueing, serialization, actual packet loss or measured router latency. Protection is against one logical edge, not a node or geographically shared assets. Original sourced metadata is preserved in repository provenance; edited names/coordinates/lengths are user assumptions.

## Optional real lab and security

The four-router FRRouting lab remains under `lab/`. Local-only allowlists expose real FRR JSON, bounded loopback ping, and mapped project interfaces up/down. The optional sudo helper owns a 0600 Unix socket; the web process remains unprivileged. No Docker socket or lab control is exposed by Vercel. No host physical interfaces, routes or firewall configuration are changed. `make lab-check` exits 77/skipped when the local daemon/permissions are unavailable.

## Verification and documentation

`tests/test_planning.py`: hand-checkable MST, Tarjan/Dijkstra vs NetworkX over seeded small graphs, full original single-cut coverage, infeasible/empty graphs, request validation, 23-node API and security boundary. `tests/web_demo.mjs`: independent browser core, editing, deleted route source, malformed/blocked storage, original exhaustive cuts, and Python parity for original/edited/small datasets. New measurements: `docs/planning-results.json` and `docs/planning-performance.json`. Earlier `measurements.json`, screenshots and `RESULTS_LEGACY_ARCHIVE.md` document prior versions only.

Primary references: https://leafletjs.com/reference.html (default SVG paths), https://networkx.org/documentation/stable/ (reference graph operations), https://vercel.com/docs/cli/deploy (existing-project CLI deployment).

## Planning workspace ба алгоритмын тайлбар

`main.tsx` нь дээд цэсээр map / algorithms / comparison хэсгийг сонгоно. Сонгоогүй хэсэг `hidden` тул accessibility tree болон дэлгэцэд харагдахгүй; map instance, cost inputs хадгалагдана. Tarjan-ийн хүснэгт нь одоогийн DFS утгууд, Greedy-ийн хүснэгт нь эрүүл 2-Edge augmentation-ийн үр дүн. Нэг Leaflet instance-ийг хадгална. `walkthrough.ts` нь React-оос тусдаа deterministic Kruskal ба Dijkstra snapshot үүсгэнэ; `Walkthrough.tsx` нь алхам, буцах, эцсийн үр дүн, slider болон зайн хүснэгтийг үзүүлнэ. `NetworkMap` нь тайлбарын overlay, баталгаажсан хотууд, candidate кабель болон өмнөх маршрутын цэгэн шугамыг зурна. Overlay нь `graph.ts`-ийн тооцоо эсвэл backend-ийн суурь загварыг өөрчлөхгүй. Тестээр trace-ийн эцсийн кабель/маршрутыг бодит тооцоотой тулгана.

## Тусдаа Python алгоритмууд

`backend/app/algorithms/` дотор Kruskal, Tarjan, Dijkstra, greedy augmentation тусдаа модуль болсон. `planning.py` нь хуучин `mst`, `tarjan`, `shortest` нэрүүдийг import alias-аар хадгалж API/engine/tests-тэй нийцнэ; `designs` нь MST болон augmentation-ийг нэгтгэнэ. Алгоритмын тодорхойлолт, tie-breaking, output schema хэвээр. `python -m backend.app.algorithms.demo` нь эдгээр бодит функцийг жижиг сургалтын граф дээр ажиллуулна.

## Пакетын round-trip үзүүлэн

`packet.ts` нь route node/edge дарааллаас кабелийн геометрийг зөв чиглэлд нийлүүлж, кабель бүрийн уртаар жинлэсэн зам дагуу байрлалыг олно. `NetworkMap` нэг Leaflet marker-ийг requestAnimationFrame-ээр очоод буцахаар хөдөлгөнө. Нэг чиглэл 2–6 секунд: зөвхөн харагдацын хугацаа; planner RTT өөрчлөгдөхгүй. Animation нь хэрэглэгчийн товчоор эхэлнэ. Stop, маршрут/топологи/тасралт/цэс өөрчлөгдөх, unmount үед marker ба pending frame цэвэрлэгдэнэ. `prefers-reduced-motion` идэвхтэй үед хөдөлгөөнгүй төлөв харуулна.

`packetInfo.ts` нь node ID-аас deterministic hash үүсгэж 10.0.0.0/16 дотор синтетик, давхцаагүй хаяг сонгоно. Энэ нь хотыг таних /32 жишээ хаяг; интерфэйс эсвэл subnet routing тохиргоо биш. `PacketInfo.tsx` нь source/destination IP, чиглэл тус бүрийн hop жагсаалтыг үзүүлнэ. `packetTargetHop` нь animation-ийн бодит segment-ээс дараагийн хотын индексийг олж, зөвхөн hop өөрчлөгдөхөд React state шинэчилнэ. `tracerouteRows` нь source хотыг алгасаж TTL-style hop 1-ээс эхэлнэ. Эхний router-ийн ingress interface private, дараагийн backbone interface хаягууд RFC 5737 documentation block 203.0.113.0/24-оос өгөгдөнө (бодит routable IP биш). Нэг хот өөр interface хаягаар харагдаж болно. Hop RTT нь хуримтлагдсан км × 0.01; гурван probe нь ижил propagation-only загвар, jitter/loss/ECMP зохиохгүй. Trace нь outbound чиглэлтэй, буцах animation мөн тухайн хотын мөрийг тодруулна. NAT шат эсвэл гаднах Internet зам нэмэхгүй.

## Simulated satellite packet transport

`transport.ts` keeps packet failover separate from graph planning. With 2-Edge and at least two distinct cuts it constructs a temporary graph with an illustrative relay and two virtual legs. Physical cable edges/nodes are not mutated. Virtual lengths weight map animation only; `hopRtts` explicitly supplies cumulative RTT at half and all of the user-provided assumption. The selected route's physical distance, cost, connectivity and bridge metrics are never recalculated using these virtual edges. Same-source/destination and other topologies do not trigger failover. Animation is cancelled on cut/restore, topology, endpoint, page or latency changes. `packetHopPair` provides both outbound and reply current/next hops. Endpoint IPs stay stable; traceroute router addresses are interface examples, with the destination using its private endpoint address.

## Санамсаргүй ачаалал

«Санамсаргүй ачаалал» нь ажиллаж буй сонгосон топологийн 1–3 кабелийг санамсаргүй сонгож, тус бүрд 10–40 ms нэмэлт RTT өгнө. Давтан дарахад шинэ хувилбараар солино; «Арилгах» нь бүх ачааллыг цэвэрлэнэ. Тасарсан кабель шинэ сонголтод орохгүй. Dijkstra жин = урт × 0.01 ms/km + нэмэлт саатал. Кабелийн бодит урт, топологи, гүүр ба өртөг өөрчлөгдөхгүй. Хуучин замын RTT нь тэр замыг одоогийн ачаалалтай үед ашиглавал гарах хугацаа; шинэ замын RTT-тэй ижил нөхцөлөөр харьцуулна. Илүү хурдан зам байхгүй бол маршрут хэвээр.

`frontend/src/congestion.ts` нь санамсаргүй сонголт ба хугацаагаар жинлэсэн Dijkstra-г агуулна. Browser-ийн маршрут, traceroute, алгоритмын алхмууд ижил жин ашиглана. Python planning API нь кабелийн суурь бүтцийг тооцдог хэвээр. Starlink идэвхтэй үед түүний таамаг RTT давуу үйлчилж, кабелийн ачаалал satellite замд нэмэгдэхгүй. Source/Destination солиход ачаалал хадгалагдаж, топологи солих эсвэл refresh хийхэд цэвэрлэгдэнэ. Өөрчлөлт хийхэд явж буй animation зогсоно. Энэ нь queue/throughput хэмжсэн загвар биш, нэмэлт delay-ийн сургалтын хувилбар.

### Load balancing

Ачаалал идэвхтэй, Starlink идэвхгүй, хоёр өөр маршруттай үед 50/50 packet round robin ажиллана. «Пакет илгээх» нь хоёр пакетыг дараалан, зам тус бүрээр очоод буцаана; хариу нь явсан замаараа буцна. RTT нь сонгосон зам тус бүрийн тогтмол latency загвар. Эхний зам хамгийн бага RTT-тэй; хоёр дахь нь түүнээс өөр хамгийн бага RTT-тэй энгийн зам. Хоёр маршрут нийтлэг кабельтай байж болно. Энэ нь ECMP, flow hashing эсвэл бодит queue/capacity загвар биш; packet reordering болон throughput-ийн өөрчлөлт хэмжихгүй. Өөр замгүй үед нэг замаар явж, боломжгүйг харуулна.

`balancedPaths` нь Dijkstra-аар эхний замыг олоод түүний кабель тус бүрийг хассан граф дээр дахин тооцож хамгийн бага хугацаатай өөр маршрутыг сонгоно. Замын RTT, хотын дараалал, cumulative hop RTT, physical length тусдаа хадгалагдана. Зам 1/2 нь тус бүр 50% буюу batch-ийн нэг пакет. Нийт RTT-г хоёр замын minimum мэтээр үзүүлэхгүй. Clear, cut/restore, endpoint/topology/page/latency changes нь бүх batch-ийг цуцална.
