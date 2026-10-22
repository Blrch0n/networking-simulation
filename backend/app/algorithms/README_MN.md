# Багшид үзүүлэх дөрвөн алгоритм

Эдгээр нь жишээнд зориулсан хуулбар биш: локал FastAPI simulation
`planning.py`-аар дамжуулан эдгээр функцийг ашигладаг.
Vercel сайт нь ижил дүрэмтэй TypeScript хувилбар (`frontend/src/graph.ts`)-ыг ашиглана.
Python/TypeScript үр дүнг parity тестээр тулгана.

| № | Файл / функц | Энгийн утга |
|---|---|---|
| 1 | `kruskal.py` → `kruskal_mst` | Бүх хотыг хамгийн бага нийт урттай кабелиар холбоно |
| 2 | `tarjan.py` → `tarjan_bridges` | Тасарвал сүлжээ салгах кабелийг олно |
| 3 | `dijkstra.py` → `dijkstra` | Хоёр хотын хамгийн богино замыг олно |
| 4 | `greedy_augmentation.py` → `augment_to_two_edge_connected` | MST-д нөөц кабель нэмж гүүрийг арилгана |

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
тав дахь алгоритм биш. `demo.py` нь дөрвөн алгоритмыг дуудан үр дүн хэвлэнэ.
Оролтын шалгалт нь `planning.validate()`-д хэвээр: үндсэн алгоритмууд хүчинтэй
хот, давхцаагүй чиглэлгүй холбоос, эерэг төгсгөлөг урт авна.

Greedy augmentation бол хамгийн сайн оноотой кабелийг давтан сонгох heuristic.
Глобал хамгийн бага өртгийг батлахгүй. Холбогдсон бөгөөд гүүргүй үед л
нэг кабелийн хамгаалалттай; салангид графыг хамгаалалттай гэж тооцохгүй.
