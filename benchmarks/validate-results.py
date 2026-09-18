#!/usr/bin/env python3
"""Validate published raw results, compute OLS, and report test-count units."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'research' / 'results'
rows = list(csv.DictReader((RESULTS / 'depth-sweep-2026-09-18.csv').open()))
x = [int(r['depth']) for r in rows]
y = [int(r['gas']) for r in rows]
assert x == [1, 2, 4, 8, 16, 24]
assert y == [317171, 398545, 595570, 989924, 1779929, 2571604]
xm, ym = sum(x)/len(x), sum(y)/len(y)
slope = sum((a-xm)*(b-ym) for a,b in zip(x,y))/sum((a-xm)**2 for a in x)
intercept = ym-slope*xm
r2 = 1-sum((b-intercept-slope*a)**2 for a,b in zip(x,y))/sum((b-ym)**2 for b in y)
assert round(intercept) == 206635 and round(slope) == 98417
assert round(r2,6) == .999945
print(f'Depth: six points; intercept={intercept:.6f}, slope={slope:.6f}, R2={r2:.9f}')
search = json.loads((RESULTS / 'g4-search-final.json').read_text())
assert (search['strategies'],search['draws'],search['passedABound']) == (1200,45360,0)
assert search['released']+search['refused'] == search['draws']
print('Search: 1,200 strategies; 45,360 draws; 0 observed bound violations')
for file in ['contract-tests-final.txt','gas-report-2026-09-18.txt']:
 s = (RESULTS/file).read_text()
 assert '101 tests passed, 0 failed, 0 skipped' in s
 assert len(re.findall(r'\[PASS\] testFuzz_',s)) == 7
 assert len(re.findall(r'\(runs: 512,',s)) == 7
 assert 'runs: 256, calls: 8192' in s
 print(f'{file}: 101 reported cases; seven fuzz functions x 512; grouped invariants 256 x 32')
expected = [
 ('pactra',3,'4.68','0.00','0.00'),
 ('shared-cap',3,'4.68','0.00','20.00'),
 ('independent-wallets',3,'4.68','0.00','40.00'),
 ('pactra',3,'13.86','9.18','0.00'),
 ('shared-cap',0,'59.76','56.61','20.00'),
 ('independent-wallets',3,'32.22','27.54','20.00'),
]
lines=[l for l in (RESULTS/'g7-eval-2026-09-18.txt').read_text().splitlines() if 'complete' in l and 'spent' in l]
assert len(lines)==6
for line,(name,completed,spent,runaway,exposure) in zip(lines,expected):
 assert line.strip().startswith(name)
 for value in [f'{completed}/3 complete',f'spent ${spent}',f'runaway ${runaway}',f'exposed at start ${exposure}']:
  assert value in line,(name,value)
print('Baselines: 3 conditions x 2 scenarios x 3 repetitions; all totals match')
print(f'Loop ratios: independent/Pactra={27.54/9.18:.6f}; shared/Pactra={56.61/9.18:.6f}')
gas=(RESULTS/'gas-report-2026-09-18.txt').read_text()
for op in ['open','spawn','revoke','draw','fund','withdraw','release']:
 m=re.search(r'^\| '+op+r'\s+\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|',gas,re.M)
 assert m,op
 print('Gas '+op+' min/avg/median/max/calls: '+', '.join(m.groups()))
print('PASS')
