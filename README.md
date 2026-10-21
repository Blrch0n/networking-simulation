# Шилэн кабелийн сүлжээний загварчлал ба симуляцийн систем

Монголын нийслэл ба 21 аймгийн төвийг холбох шинэ сүлжээний **ойролцоо геодезийн** төлөвлөлт. React + TypeScript + MapLibre, FastAPI + NetworkX + pyproj, SQLite. Үндэсний инженерийн загвар ба бодит FRRouting лаборатори тусдаа.

## Ажиллуулах

Python 3.14, Node 26, npm 11 дээр шалгасан. Python 3.12+ болон Node 22.12+ шаардлагатай. Интернет нь анхны dependency таталт болон суурь зурагт хэрэгтэй; боловсруулсан 22 хотын өгөгдөл хамт ирнэ.

```bash
cd /home/aswer/Downloads/network_simulation
make doctor
make setup
make demo
```

Нээх: [http://127.0.0.1:8000](http://127.0.0.1:8000). API schema: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

```bash
make test          # graph/API тест + TypeScript/build
make stop          # зөвхөн энэ төслийн Uvicorn процессыг зогсооно
make reset-demo    # зөвхөн хадгалсан demo сценариудыг цэвэрлэнэ
```

UI: MST → 21 гүүр холбоос; хамгаалалттай → 0 гүүр; 231 холбоостой онолын mesh. Хотын хос сонгон маршрут тооцоолно. Кабель сонгоод тасалж, 3 секунд алхуулах эсвэл тоглуулахад маршрут өөрчлөгдөнө. Засварлах, бүх хөрөнгө сэргээх, хотын тэжээл таслах, урсгал ×5, JSON/GeoJSON/CSV экспорттой. Сценари SQLite-д хадгалагдана; refresh хийхэд үргэлжилнэ.

## Бодит OSPF лаборатори

Эхлээд Docker Engine ажилласан, тухайн хэрэглэгч Docker ашиглах зөвшөөрөлтэй байх ёстой. Host interface, firewall, route өөрчлөх скрипт байхгүй. Дөрвөн контейнер, дөрвөн **хоёр router-той тусгаарлагдсан bridge** нь дөрвөн point-to-point сегментийг төлөөлнө. `internal` сүлжээ, тогтмол interface нэр, OSPF point-to-point тохиргоо ашиглана. Контейнерууд порт нийтлэхгүй, management transit сүлжээ байхгүй; API нь `docker exec` control plane ашиглана.

```bash
make lab-up
make lab-check
make stop
FIBER_LAB_ENABLED=1 make demo
```

Docker зөвшөөрөл шаардвал **өөрийн терминалд** `sudo docker compose --profile lab up -d` ажиллуулна. Нууц үгийг чат эсвэл config файлд бүү хадгал. Web API-г root-аар бүү ажиллуул. API хэрэглэгч Docker зөвшөөрөлгүй бол лабораторийн төлөв, JSON шалгалт ажиллахгүй; зөвшөөрөлтэй локал account шаардлагатай. Host хэрэглэгчийн Docker эрх нь өндөр эрхтэй тул `.env`-ийн lab enable тохиргоо анхдагчаар унтраалттай. API-д arbitrary shell/Docker command илгээх боломж байхгүй; зөвхөн allowlist-д байгаа 4 router, 4 link, FRR read команд, 3-packet ping, interface up/down.

```bash
make lab-down      # зөвхөн mnfiber Compose төслийн контейнер/сүлжээг устгана
```

`make lab-check` бодит lab боломжгүй үед **SKIPPED / exit 77** өгнө. FULL хөрш ба ping-ийг бодитоор шалгаагүй бол passed гэж үзэхгүй. Шинэ контейнер эхлэхэд эхний хөрш тогтохыг хүлээнэ. Олон docker context байвал daemon/context ижил байх ёстой. Compose >=2.36 шаардлагатай.

## Өгөгдөл дахин бэлтгэх

```bash
.venv/bin/python scripts/acquire.py
.venv/bin/python lab/scripts/generate.py
```

GeoNames `MN.zip` файлыг зөвхөн cache байхгүй үед татна. GeoNames ID, PPLA/PPLC feature code, admin code-оор нийслэл ба 21 төвийг ялгана. Эх сурвалж, SHA-256, огноо, лиценз, хувиргалт: `data/provenance/manifest.json`. Боловсруулсан өгөгдөл CC BY 4.0; GeoNames attribution заавал хадгална. Суурь зураг © OpenStreetMap contributors; ердийн интерактив хэрэглээ, bulk download байхгүй.

## Хязгаарлалт

Энэ хувилбар бүрэн инженерийн төсөл **биш**. Зам/төмөр замын геометр, DEM, голын гарц, бодит SRLG, газрын зөвшөөрөл татаж баталгаажуулаагүй. Шугамууд WGS84 геодезийн ойролцоо; урт нь авто замын урт биш. Unknown terrain/crossings нь `null`.

Хамгаалалттай хувилбар NetworkX weighted augmentation **heuristic**; MILP optimality баталгаа байхгүй. Зөвхөн загварын нэг логик холбоосын тасралтын хамгаалалтыг шалгасан. Физик замын бие даасан байдал баталгаажаагүй. Capacity/RTT-ийг оптимизацид хязгаарлаагүй; дараа нь тооцон зөрчлийг харуулна. Queue/drop packet simulation байхгүй, deterministic aggregate overload flags ашиглана.

Одоо байгаа сүлжээ: операторын эх сурвалжийн хэсэгчилсэн тайлан; GIS alignment байхгүй тул газрын зурагт кабель зохиож харуулахгүй. Бодит lab-г энэ орчинд Docker эрхгүй үед баталгаажуулах боломжгүй. Дэлгэрэнгүйг `docs/RESULTS.md`-ээс үзнэ үү.

### Docker эрхгүй хэрэглэгчид зориулсан хязгаарлагдсан controller

Web app-д Docker эрх өгөхгүйгээр lab ажиллуулах хувилбар:

```bash
sudo docker compose --profile lab up -d
make lab-controller
```

Хоёр дахь команд тусдаа терминалд нээлттэй ажиллана; sudo нууц үгийг зөвхөн терминалд оруул. Controller `.run/lab.sock` Unix socket-ийг зөвхөн sudo дуудаж буй хэрэглэгчид 0600 эрхээр нээнэ. Browser-д shell/command API өгдөггүй, зөвхөн allowlist-ийн status/read/ping/link state. Demo-г энгийн хэрэглэгчээр `make demo` ажиллуулахад socket-ийг автоматаар илрүүлнэ; `FIBER_LAB_ENABLED=1` шаардлагагүй. Controller-г Ctrl+C-ээр зогсооно. Энэ нь web app-г root-аар ажиллуулах шаардлагыг арилгана. Root helper нь project Docker daemon эрхтэй хэвээр; localhost demo зориулалттай.

## Vercel дээр нийтлэх

GitHub repository-г https://vercel.com/new дээр import хийнэ. Root Directory: **`./`** (repository root). `vercel.json` install/build/output тохиргоог агуулна; нэмэлт secret эсвэл database шаардлагагүй.

Нийтлэгдсэн хувилбар нь **хөтөчид ажиллах төлөвлөлтийн демо**: сценари зөвхөн тухайн browser-д хадгалагдана, бодит OSPF нь локал хувилбарт ажиллана. Газрын зураг, маршрут, тасралт/засвар, урсгал, экспорт ажиллана. Дэлгэрэнгүй: [Vercel deployment](docs/VERCEL.md).
