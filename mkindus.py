"""Gera indus.json a partir dos orçamentos Indusmelec (PDF) de uma pasta: preço líquido do orçamento mais recente de cada referência
e a mão de obra de cada quadro. Uso: python mkindus.py "C:/Users/.../Indusmelec - Quadros 2026/Orçamentos"
Precisa do pdftotext (Git for Windows / poppler). Preço líquido = P. unit. × (1 − D1) × (1 − D2), como nos orçamentos.
Saída: {"refs": {ref: [descrição, € líquido, data, nº do orçamento]}, "mont": [[data, nº, obra, quadro, €], ...]}
A referência perde o prefixo de fornecedor da Indusmelec ("58.", "086.", "062.", ...): 086.FL213B -> FL213B."""
import subprocess, re, json, sys, glob, os
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/Indusmelec - Quadros 2026/Orçamentos')
num = lambda s: float(s.replace('.', '').replace(',', '.'))
NUM = r'\d{1,3}(?:\.\d{3})*,\d{2,4}'
LAB = re.compile(r'^(?:NCRIADA|MONTAGENS)$')
rows = []
for f in sorted(glob.glob(os.path.join(SRC, '*.pdf'))):
    m = re.match(r'(\d{4}-\d{2}-\d{2}) (.+?) - (?:Orçamento|Encomenda de Cliente) nº (\d+)', os.path.basename(f))
    if not m: continue
    date, obra, no = m.groups()
    lines = [l.strip() for l in subprocess.run(['pdftotext', '-raw', f, '-'], capture_output=True).stdout.decode('latin1').splitlines()]
    sec, cur = '', None
    def flush():
        global cur
        if cur:
            t = ' '.join(cur.pop('tail'))
            vals = [n for n in re.findall(NUM + '%?', t) if not n.endswith('%')]
            pct = [num(p[:-1]) / 100 for p in re.findall(NUM + '%', t)]
            cur['unit'] = num(vals[0]) if vals else None
            cur['net'] = None if cur['unit'] is None else round(cur['unit'] * (1 - (pct[0] if pct else 0)) * (1 - (pct[1] if len(pct) > 1 else 0)), 2)
            rows.append(cur)
        cur = None
    for l in lines:
        if re.fullmatch(r'\d{1,3}', l): continue
        mm = re.match(r'^(\S+)\s+(.+?)\s+(\d+,\d)\s+23,\s*(.*)$', l)
        if mm and not mm.group(1).startswith('^') and re.search(r'\d', mm.group(1)):
            flush(); ref, desc, q, rest = mm.groups()
            cur = dict(date=date, no=no, obra=obra, sec=sec, ref=re.sub(r'^\d{2,3}\.', '', ref), desc=desc, q=num(q), tail=[rest]); continue
        mh = re.match(r'^(.+?)\s+23,$', l)
        if mh and not re.search(NUM, l): flush(); sec = mh.group(1); continue
        if cur is not None:
            if l.startswith(('Em caso de adjudica', 'Observa')): flush()
            elif re.fullmatch(r'(?:' + NUM + r'%?\s*)+', l): cur['tail'].append(l)
            elif not re.search(NUM, l) and len(l) < 60 and not l.startswith('^'): cur['desc'] += ' ' + l
    flush()
clean = lambda d: re.sub(r'\s*(?:23,|ATCUD:.*|Total Il.*|\bmm\b)\s*$', '', re.sub(r'\s+ATCUD:.*', '', d)).strip()
refs, mont = {}, []
for r in sorted(rows, key=lambda r: (r['date'], int(r['no']))):
    if LAB.match(r['ref']):
        if r['net'] and re.search(r'montagem|m.o de obra|quadro', r['desc'], re.I): mont.append([r['date'], r['no'], r['obra'], r['sec'], r['net']])
        continue
    if not r['net'] or r['net'] <= 0: continue
    refs[r['ref']] = [clean(r['desc']), r['net'], r['date'][:7], r['no']]
json.dump({'refs': dict(sorted(refs.items())), 'mont': mont}, open('indus.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(refs), 'referências;', len(mont), 'linhas de montagem; de', len(set(r['no'] for r in rows)), 'orçamentos')
