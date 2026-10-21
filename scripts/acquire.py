#!/usr/bin/env python3
"""Cached GeoNames extract; verify PPLA/PPLC feature code and administrative region."""
import hashlib,json,zipfile,urllib.request,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];raw=ROOT/'data/raw/MN.zip';raw.parent.mkdir(parents=True,exist_ok=True)
url='https://download.geonames.org/export/dump/MN.zip'
if not raw.exists():urllib.request.urlretrieve(url,raw)
lookup={
'2028462':('ulaanbaatar','Улаанбаатар','Нийслэл','20'),
'2028606':('tsetserleg','Цэцэрлэг','Архангай','01'),
'1515436':('olgii','Өлгий','Баян-Өлгий','03'),
'2032533':('bayankhongor','Баянхонгор','Баянхонгор','02'),
'2032201':('bulgan','Булган','Булган','21'),
'1516393':('altai','Алтай','Говь-Алтай','10'),
'2032050':('choir','Чойр','Говьсүмбэр','24'),
'2031964':('darkhan','Дархан','Дархан-Уул','23'),
'2032081':('sainshand','Сайншанд','Дорноговь','07'),
'2032054':('choibalsan','Чойбалсан','Дорнод','06'),
'2030065':('mandalgovi','Мандалговь','Дундговь','08'),
'1515007':('uliastai','Улиастай','Завхан','09'),
'2032814':('arvaikheer','Арвайхээр','Өвөрхангай','15'),
'2032007':('dalanzadgad','Даланзадгад','Өмнөговь','14'),
'2031405':('erdenet','Эрдэнэт','Орхон','25'),
'2029156':('sukhbaatar','Сүхбаатар','Сэлэнгэ','16'),
'2032614':('baruunurt','Баруун-Урт','Сүхбаатар','17'),
'1515029':('ulaangom','Улаангом','Увс','19'),
'1516048':('khovd','Ховд','Ховд','12'),
'2029945':('murun','Мөрөн','Хөвсгөл','13'),
'2029656':('chinggis','Чингис','Хэнтий','11'),
'2031517':('zuunmod','Зуунмод','Төв','18')}
nodes=[]
with zipfile.ZipFile(raw) as z:
 for line in z.read('MN.txt').decode().splitlines():
  c=line.split('\t')
  if c[0] not in lookup:continue
  sid,name,aimag,admin=lookup[c[0]]
  assert c[7] in ['PPLA','PPLC'] and c[10]==admin
  nodes.append(dict(id=sid,name=name,aimag=aimag,lat=float(c[4]),lon=float(c[5]),geonames_id=c[0],source=f'https://www.geonames.org/{c[0]}/',feature_code=c[7],admin_code=admin,source_name=c[1],dataset_modified=c[18],confidence='gazetteer-capital; not site survey'))
assert len(nodes)==22
nodes.sort(key=lambda x:x['id'])
(ROOT/'data/processed/nodes.json').write_text(json.dumps(nodes,ensure_ascii=False,indent=2))
manifest=dict(retrieved_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),sources=[dict(id='geonames',url=url,publisher='GeoNames',license='CC BY 4.0',license_url='https://www.geonames.org/export/',sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),bytes=raw.stat().st_size,dataset_date='individual record modification dates in nodes.json',transformations='Select 1 PPLC + 21 PPLA by stable GeoNames ID and admin code; retain WGS84 coordinates; Mongolian labels from brief.',units='decimal degrees, WGS84',confidence='gazetteer; city center not a surveyed equipment site')],limitations=['All candidate alignments are geodesic approximations, NOT road/rail routes.','No acquired DEM, terrain/slope, river crossings, legal access or verified SRLG. Unknown values remain null.','Complete mesh is a theoretical 231-pair comparison; feasible corridors are unverified.','Existing fiber: ICN operator self-report only; zero geographic features verified.','No engineering cost quotes; 1 relative unit/km, 100 Gbps assumed.'])
(ROOT/'data/provenance/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Extracted {len(nodes)} verified administrative capital records')
