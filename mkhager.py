"""Preços das envolventes Hager Orion plus usadas na sugestão de quadros (ORION em rt-board.js), a partir da tabela Hager (cat/hager.xlsx).
Gera hager.json = {referência: [descrição, PVP €]}. Atualizar: substituir cat/hager.xlsx pela tabela nova e correr python mkhager.py."""
import json, re, sys
import openpyxl
src = open('rt-board.js', encoding='utf-8').read()
refs = re.findall(r"\['(FL\d+[AB])',", src[src.index('const ORION='):src.index(']];', src.index('const ORION='))])
# a folha declara mal as dimensões: em modo só de leitura o openpyxl só vê 2 linhas
ws = openpyxl.load_workbook('cat/hager.xlsx', data_only=True).worksheets[0]
out = {}
for r in ws.iter_rows(values_only=True):
    ref = str(r[0]).strip() if r and r[0] is not None else ''
    if ref in refs and r[2] is not None:
        out[ref] = [str(r[1]).strip(), round(float(r[2]), 2)]
miss = [r for r in refs if r not in out]
json.dump(out, open('hager.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(out), 'envolventes com preço; sem preço:', miss)
if miss: sys.exit(1)
