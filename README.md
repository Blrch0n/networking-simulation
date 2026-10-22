# Шилэн сүлжээ — 22 цэгийн загварчлал

Монголын нийслэл ба 21 аймгийн төвийг холбох сүлжээг графаар загварчлах сургалтын хэрэгсэл. [Нийтлэгдсэн сайт](https://networking-simulation-beta.vercel.app/).

**React/TypeScript + Leaflet SVG**, локал **FastAPI/NetworkX**, Vercel дээр Python сервер шаардахгүй ижил тодорхойлолттой browser алгоритм. Хот ба кабель засахад гурван загвар шууд дахин тооцоологдоно.

## Ажиллуулах

Шалгасан орчин: Python 3.14.7, Node 26.8.2. Vercel Node 24.x. Локал Python 3.12+; graph тестэд Node 22.18+ эсвэл Node 24+ зөвлөнө. Анхны install болон OSM суурь зурагт интернет хэрэгтэй. Хот/кабелийн өгөгдөл repository-д бэлэн.

```bash
make setup
make demo
```

Нээх: [http://127.0.0.1:8000](http://127.0.0.1:8000). Локал API: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

```bash
make test             # Python tests + browser/Python parity + production build
make test-graph       # Browser graph / editor / storage / parity tests
make measure-planning # Одоогийн planner ба API хэмжилт
make stop             # Зөвхөн төслийн Uvicorn серверийг зогсоох
```

## Багшид үзүүлэх үндсэн урсгал

Дээд цэснээс нэг хэсгийг сонгоно. Бусад хэсэг нуугдана; өгөгдөл, сонгосон хотууд, тасралт болон зардлын утгууд цэс солиход хадгалагдана.

- **Газрын зураг**: топологи, хоёр хот, маршрут, таслах/сэргээх. Олон тасралт ба гүүр тодруулах нь «Тасралтын тохиргоо»-д байна.
- **Алгоритм**: Kruskal / Dijkstra алхмууд; Tarjan гүүр ба Discovery/Low утгууд; Greedy-ийн сонгосон нэмэлт кабель, арилгасан гүүр, оноо.
- **Харьцуулалт**: гурван топологийн хүснэгт, USD/км зардал, бүх нэг кабелийн шалгалт. Зардлын panel анх нээлттэй.

Алгоритмын overlay нь үндсэн граф эсвэл статистикийг өөрчлөхгүй. Өөр цэс эсвэл алгоритм сонгоход overlay цэвэрлэгдэнэ. Kruskal эрүүл candidate graph дээр MST-г тайлбарлана; Dijkstra, Tarjan нь одоогийн ажиллаж буй кабелиудаар бодно. Greedy хүснэгт нь эрүүл 2-Edge загварыг байгуулах нэмэлтүүдийг харуулна. Энэ нь Tarjan/Greedy-ийн animation биш, бодит тооцоолсон үр дүн юм.

Дэлгэрэнгүй дараалал: [docs/DEMO_GUIDE_MN.md](docs/DEMO_GUIDE_MN.md).

## Алгоритмын Python кодыг багшид үзүүлэх

Дөрвөн алгоритм тусдаа, уншихад хялбар Монгол тайлбартай файлд байна:

- [Kruskal](backend/app/algorithms/kruskal.py)
- [Tarjan](backend/app/algorithms/tarjan.py)
- [Dijkstra](backend/app/algorithms/dijkstra.py)
- [Greedy augmentation heuristic](backend/app/algorithms/greedy_augmentation.py)

Локал simulation нь эдгээрийг `backend/app/planning.py`-аар дамжуулан ашиглана.
Тусдаа хуулбар implementation биш. [Товч заавар](backend/app/algorithms/README_MN.md).

```bash
.venv/bin/python -m backend.app.algorithms.demo
```

## Алгоритм ба шинэ үр дүн

- Kruskal нь **байгаа бүх боломжит кабелиас** уртаар MST олно. Салангид оролтод модны ой; холбогдсон төсөл гэж зарлахгүй.
- Tarjan DFS: `low[v] > discovery[u]` бол u–v гүүр. Бүх бүрэлдэхүүнд ажиллана; NetworkX bridges-тай тестээр тулгасан.
- 2-Edge: MST-д `кабелийн урт / арилгах гүүрийн тоо` хамгийн бага ирмэгийг давтан нэмэх deterministic heuristic. Тэнцвэл урт, эрэмбэлсэн хотын ID хос, кабелийн ID. Глобал optimum биш.
- Full Mesh нь бүх **үлдсэн боломжит** кабель. Хэрэглэгч хассан ирмэгийг алгоритм дахин зохиож нэмэхгүй.
- Богино зам: Dijkstra. Max network RTT нь **бүх хотын хосын** хамгийн их богино замын RTT. Сонгосон замын RTT тусдаа.

| Загвар | Кабель | Урт, км | MST-ээс нэмэлт | Гүүр | Normal max RTT, ms | Нэг тасралтын холбоотой тохиолдол | Worst connected failure RTT, ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| MST | 21 | 3952.29 | 0% | 21 | 27.24 | 0/21 | — |
| 2-Edge heuristic | 29 | 6338.17 | 60.37% | 0 | 20.78 | 29/29 | 24.64 |
| Full Mesh | 231 | 152750.58 | 3764.87% | 0 | 18.10 | 231/231 | 18.10 |

Эдгээр нь **шинэ алгоритмын** анхны dataset дээрх хэмжилт. Хуучин 28-кабелийн augmentation-ийн тоотой хольж болохгүй. Дахин гаргах: `make test-graph`; яг тоонууд [docs/planning-results.json](docs/planning-results.json). Дэлгэрэнгүй [docs/RESULTS.md](docs/RESULTS.md).

## Өгөгдөл, хадгалалт, алдаа

Өгөгдөл засах UI-г хэрэглэгчийн хүсэлтээр хассан. Доорх засварын боломжууд нь source helper болон тестэд хадгалагдсан; одоогийн сайтад editor байхгүй.

- Шинэ хотыг автоматаар холбох нь **сонголттой**: их тойргийн зай, дундаж дэлхийн радиус 6371.0088 км. Дараа нь эдгээр кабелийг засах/устгах боломжтой.
- Координат өөрчлөхөд тухайн кабелийн төгсгөлийн геометр шинэчлэгдэж, өмнөх **урт хадгалагдана**. Өөр урт хэрэгтэй бол кабелиа тусад нь засна.
- Нэг хос хотын кабелийг хадгалах нь шинэчилнэ; хассан хосыг хадгалбал сэргээнэ. Давхар undirected кабель, self-loop, давхардсан ID, invalid координат/урт татгалзана.
- Сонгосон эхлэх/хүрэх хот устахад хүчинтэй орлох хот автоматаар сонгогдоно. 100 хүртэл хот, 4950 кабель дэмждэг demo хязгаартай.
- `fiber-planner-workspace-v2` localStorage key нь граф, маршрут сонголт, сүүлийн нэг undo-г хадгална. Хуучин schema-ийн тусдаа key-үүдийг устгахгүй. Буруу хадгалалт анхны өгөгдөлд буцаж тайлбар харуулна; blocked/quota storage үед memory-д ажиллана.
- Одоогийн тасралт refresh хийхэд цэвэрлэгдэнэ. «Анхны 22 хотыг сэргээх» browser өгөгдлийг сэргээнэ. `make reset-demo` нь зөвхөн хуучин SQLite scenario-г цэвэрлэнэ.
- Зурагны tile тасарсан ч SVG хот/кабель үлдэнэ. Pan/zoom нь кабель сонголт ба тасралтад хадгалагдана; «Бүх хотыг харах» explicit fit хийнэ.

## Зай, RTT ба хязгаарлалт

Анхны координат GeoNames (CC BY 4.0), provenance SHA-256/огноо: [data/provenance/manifest.json](data/provenance/manifest.json). Анхны кабель WGS84 геодезийн ойролцоо; бодит авто/төмөр замын трасс, голын гарц, өндөршил, газрын зөвшөөрөл баталгаажаагүй. Хэрэглэгчийн урт таамаглал. Суурь зураг © OpenStreetMap contributors, bulk tile download байхгүй.

`RTT_ms = 2 × зай_км / 200000 × 1000 = зай_км × 0.01` — зөвхөн тархалт. Processing/queueing/serialization эсвэл бодит ping биш. Салангид графын whole-network RTT null (“—”); зөвхөн reachable pair max-ийг тусад нь шошголон харуулж болно. Тест бүр connected ба ≤50 ms байж байж «бүгд хангана»; хоосон/анхнаасаа салангид граф амжилт гэж гарахгүй.

Хамгаалалтын загвар нь **нэг логик кабелийн тасралт**. Хотын гэмтэл, олон кабель, хамтын trench/SRLG болон тусдаа физик замыг батлахгүй. Мөнгөний зохиомол үнэлгээ байхгүй; урт нь харьцангуй барилгын өртгийн proxy.

## Optional бодит FRR / OSPF

Үндсэн үнэлгээ browser графаар бүрэн ажиллана. Бодит дөрвөн router lab нь локал header-ийн тусдаа хэсэг; Vercel дээр товч байхгүй.

```bash
make lab-up
make lab-check
make stop
FIBER_LAB_ENABLED=1 make demo
```

Docker эрхгүй бол өөрийн терминалд `sudo docker compose --profile lab up -d`, дараа нь тусдаа терминалд `make lab-controller`. Sudo password-ийг зөвхөн терминалд оруул; web API-г root-аар бүү ажиллуул. Controller `.run/lab.sock`-ийг invoking user-д 0600 эрхээр нээнэ, зөвхөн allowlisted status/read/ping/link-state үйлдэлтэй. Host interface/route/firewall өөрчилдөггүй. Нийтэд Docker socket/API expose хийхгүй.

`make lab-check` боломжгүй үед SKIPPED, exit 77; үнэхээр FULL/ping/route шалгаагүйг passed гэж зарлахгүй. Дуусгахад `make lab-down`, controller Ctrl+C. FRR тохиргоо `lab/`, addressing `lab/addressing.json`.

## Vercel

Одоо байгаа `networking-simulation` project, root `./`, config [vercel.json](vercel.json)-ийг хадгалсан. Динамик browser алгоритм нь edited графын бүх сүлжээ, failure, comparison, verification-ийг сервергүй тооцоолно. Нэмэлт cloud database/secret хэрэггүй. Нийтлэх ба локал статик тест: [docs/VERCEL.md](docs/VERCEL.md).

Өгөгдлийг дахин бэлтгэх: `.venv/bin/python scripts/acquire.py` (cache-тай), дараа нь `.venv/bin/python scripts/export_web_demo.py`. Архитектур: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Зардлын харьцуулалт: засварлах боломжтой USD/км таамаглалаар эрүүл гурван загварын нийт өртөг, MST-ээс нэмэгдэх өртөг болон уртын графикийг харуулна. Анхны $20,000/км нь үнийн санал биш; тусдаа тоног төхөөрөмж, ашиглалт, татварыг оруулаагүй.

Олон тасралтын нэмэлт горим: «Олон кабель зэрэг таслах»-ыг идэвхжүүлээд хэд хэдэн кабель тасална. Кабель бүрийг тусад нь эсвэл бүгдийг сэргээж болно. Горим, топологи, граф өөрчлөхөд тасралтууд цэвэрлэгдэнэ. 2-Edge нь зөвхөн нэг кабелийн тасралтад баталгаатай; олон тасралтын үр дүн сонгосон кабелиудаас хамаарна. Нийт шалгалт нь эрүүл суурь загварт нэг кабелийг тус тусад нь тасалсан хэвээр.
