from pathlib import Path
import sqlite3
p=Path('data/state.sqlite')
if p.exists():
 with sqlite3.connect(p) as c:c.execute('DELETE FROM snapshots')
print('Demo scenarios cleared; reload the browser.')
