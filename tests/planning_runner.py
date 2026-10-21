"""JSON-lines parity bridge invoked by the Node tests; no server needed."""
import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.app.planning import analyze
for line in sys.stdin:
    try:
        q=json.loads(line);print(json.dumps(analyze(q['graph'],q.get('topology','resilient'),q['source'],q['destination'],q.get('failed_id'),q.get('verify',False))))
    except Exception as e:print(json.dumps({'error':str(e)}))
