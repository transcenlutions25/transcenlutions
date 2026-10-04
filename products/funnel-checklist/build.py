"""Build the self-contained offline product. Python standard library only."""
import json
from pathlib import Path

ROOT = Path(__file__).parent
checks = json.loads((ROOT / 'checks.json').read_text())
template = (ROOT / 'template.html').read_text()
engine = (ROOT / 'engine.cjs').read_text()
result = template.replace('/* CHECKS */', 'const checks = ' + json.dumps(checks, ensure_ascii=False) + ';').replace('/* ENGINE */', engine)
(ROOT / 'funnel-leak-emergency-checklist.html').write_text(result)
print(f'Built {len(checks)} checks into a self-contained HTML file ({len(result.encode())} bytes).')
