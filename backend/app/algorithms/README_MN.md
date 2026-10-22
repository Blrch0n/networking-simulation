# Багшид үзүүлэх таван алгоритм

Эдгээр нь жишээнд зориулсан хуулбар биш: локал FastAPI simulation
`planning.py` болон `traffic.py`-аар дамжуулан эдгээр функцийг ашигладаг.
Vercel сайт нь ижил дүрэмтэй TypeScript хувилбар (`frontend/src/graph.ts`, `frontend/src/roundRobin.ts`)-ыг ашиглана.
Python/TypeScript үр дүнг parity тестээр тулгана.

| № | Файл / функц | Энгийн утга |
|---|---|---|
| 1 | `kruskal.py` → `kruskal_mst` | Бүх хотыг хамгийн бага нийт урттай кабелиар холбоно |
| 2 | `tarjan.py` → `tarjan_bridges` | Тасарвал сүлжээ салгах кабелийг олно |
| 3 | `dijkstra.py` → `dijkstra` | Хоёр хотын хамгийн богино замыг олно |
| 4 | `greedy_augmentation.py` → `augment_to_two_edge_connected` | MST-д нөөц кабель нэмж гүүрийг арилгана |

| 5 | `round_robin.py` → `round_robin` | Пакетуудыг замуудад ээлжлэн хуваарилна |

## Ажиллуулах

Төслийн үндсэн хавтсаас:

```bash
.venv/bin/python -m backend.app.algorithms.demo
```

Зөвхөн нэг алгоритм:

```bash
.venv/bin/python -m backend.app.algorithms.demo --algorithm kruskal
.venv/bin/python -m backend.app.algorithms.demo --algorithm tarjan
.venv/bin/python -m backend.app.algorithms.demo --algorithm dijkstra
.venv/bin/python -m backend.app.algorithms.demo --algorithm greedy
.venv/bin/python -m backend.app.algorithms.demo --algorithm round_robin
```

## Нэг жижиг жишээ

- A–B = 2 км, B–C = 3 км, A–C = 4 км.
- Kruskal: A–B, B–C → нийт 5 км.
- Tarjan: тэр MST-ийн хоёр кабель хоёулаа гүүр.
- Dijkstra: гурван кабельтай үед A→C = 4 км; A–C тасарвал A→B→C = 5 км.
- Greedy: MST-д A–C-г нэмнэ. 4 км / арилгах 2 гүүр = 2 км/гүүр.
  Гурвалжин үүсэж, нэг кабель тасарсан ч бүх хот холбоотой үлдэнэ.

## Кодыг унших

Файл бүрийн Монгол тайлбарт үндсэн алхмуудыг тэмдэглэсэн.
`common.py` нь ижил урттай кабелийн тогтвортой эрэмбийн туслах функцүүд;
алгоритм биш. `demo.py` нь таван алгоритмыг дуудан үр дүн хэвлэнэ.
Оролтын шалгалт нь `planning.validate()`-д хэвээр: үндсэн алгоритмууд хүчинтэй
хот, давхцаагүй чиглэлгүй холбоос, эерэг төгсгөлөг урт авна.

Greedy augmentation бол хамгийн сайн оноотой кабелийг давтан сонгох heuristic.
Глобал хамгийн бага өртгийг батлахгүй. Холбогдсон бөгөөд гүүргүй үед л
нэг кабелийн хамгаалалттай; салангид графыг хамгаалалттай гэж тооцохгүй.

## Round Robin-ийг үзүүлэх

Зургаан пакет, хоёр зам: **1 → 2 → 1 → 2 → 1 → 2**, зам бүр гурван пакеттай. `start_index` нь эхлэх замын индекс; `next_index`-ийг дараагийн хүсэлтэд өгвөл ээлж үргэлжилнэ. Сервер нийт хэрэглэгчид хуваалцсан global cursor ашиглахгүй. Замгүй бол пакет хуваарилахгүй. Dijkstra замыг олдог, Round Robin зөвхөн пакет хуваарилдаг.

`POST /api/planning/load-balance` нь graph/topology/source/destination/failed_id/congestion/packet_count/start_index авч `paths`, `packets`, `counts`, `next_index` буцаана. Локал UI энэ хариуг ашиглана; API боломжгүй эсвэл Vercel статик горимд TypeScript scheduler ажиллана. Python backend Vercel дээр автоматаар ажиллахгүй.
