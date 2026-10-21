"""Export the same verified coordinates, geometries and candidate graph for static hosting."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from backend.app import engine
nodes=engine.load_nodes();routes=engine.candidates(nodes)
seed={'schema_version':2,'nodes':nodes,'routes':routes}
seed['provenance']=json.loads((ROOT/'data/provenance/manifest.json').read_text())
path=ROOT/'frontend/public/demo/network.json';path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(seed,ensure_ascii=False,separators=(',',':')))
print(f'Exported {len(nodes)} nodes, {len(routes)} routes to {path} ({path.stat().st_size} bytes)')
