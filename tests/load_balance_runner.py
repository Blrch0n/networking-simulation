"""JSON-lines bridge for Python/static-browser traffic parity tests."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.traffic import load_balance
from backend.app.algorithms.round_robin import round_robin
for line in sys.stdin:
    request = json.loads(line)
    if request.get('operation') == 'schedule':
        result = round_robin(request['path_ids'], request['packet_count'], request.get('start_index', 0))
    else:
        result = load_balance(request['graph'], request['topology'], request['source'], request['destination'],
                              request.get('failed_id'), request.get('congestion'), request.get('packet_count', 2), request.get('start_index', 0))
    print(json.dumps(result))
