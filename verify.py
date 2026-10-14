import json,math,re
d=json.load(open('calc_dump.json'))
data=open('rt-data.js').read()
TB=json.loads(re.search(r'const TB=(\{.*?\});\n',data,re.S).group(1))
# tabelas transcritas do PDF (quadros 52-C), conferidas com a folha Excel
METHOD={}
for r in '1 51 71 73 74'.split(): METHOD[r]='A'
METHOD['2']='A2'
for r in '3 5 31 32 33 34 42 43 72'.split(): METHOD[r]='B'
for r in '3A 4 4A 5A 21 22 22A 23 23A 24 24A 25 33A 41'.split(): METHOD[r]='B2'
for r in '11 11A 12 52 53'.split(): METHOD[r]='C'
for r in '13 14 15 16 17'.split(): METHOD[r]='EF'
for r in '61 62 63'.split(): METHOD[r]='D'
D1={'PVC':{10:1.22,15:1.17,20:1.12,25:1.06,30:1,35:.94,40:.87,45:.79,50:.71,55:.61,60:.5},'XLPE':{10:1.15,15:1.12,20:1.08,25:1.04,30:1,35:.96,40:.91,45:.87,50:.82,55:.76,60:.71,65:.65,70:.58}}
D2={'PVC':{10:1.1,15:1.05,20:1,25:.95,30:.89,35:.84,40:.77},'XLPE':{10:1.07,15:1.04,20:1,25:.96,30:.93,35:.89,40:.85}}
def up(tb,t):
  for k in sorted(tb):
    if t<=k: return tb[k]
INSTD=[6,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1000,1250,1600]
def iz_table(isol,mat,s,loaded,method,cons,disp):
  k=str(int(s)) if s==int(s) else str(s)
  if method in('A','B','C'):
    t=TB['ABC'][f'{isol}{loaded}{mat}'];return t[k][{'A':0,'B':1,'C':2}[method]]
  if method in('A2','B2'):
    t=TB['A2B2'][isol+mat];return t[k][(0 if method=='A2' else 1)+(0 if loaded==2 else 2)]
  if method=='EF':
    t=TB['EFG'][isol+mat]
    if cons=='multi': col=0 if loaded==2 else 1
    else: col=2 if loaded==2 else {'trevo':3,'esteira':4,'afh':5,'afv':6}[disp]
    return t[k][col]
  t=TB['D'][mat];return t[k][(0 if loaded==3 else 1) if isol=='PVC' else (2 if loaded==3 else 3)]
def fgroup(ref,cons,disp,n,trays):
  m=METHOD[ref]
  E1=[1,.8,.7,.65,.6,.57,.54,.52,.5]
  pick=lambda arr,keys,n: next((arr[i] for i,k in enumerate(keys) if n<=k),arr[-1])
  r9=list(range(1,10))
  if m in('A','A2','B','B2') or ref in('52','53'): return pick(E1,r9,n) if n<=9 else (.45 if n<=12 else .41 if n<=16 else .38)
  if ref=='11A': return pick([.95,.81,.72,.68,.66,.64,.63,.62,.61],r9,n)
  if ref in('11','12'): return pick([1,.85,.79,.75,.73,.72,.72,.71,.7],r9,n)
  if m=='D': return pick([1,.87,.77,.72,.68,.65],[1,2,3,4,5,6],n) if ref=='61' else pick([1,.85,.78,.72,.62,.55],[1,2,3,4,6,9],n)
  ladder=ref!='13';t=min(max(trays,1),3)-1;per=math.ceil(n/max(trays,1))
  if cons=='multi':
    T=[[1,.88,.82,.79,.76,.73],[1,.87,.8,.77,.73,.68],[1,.86,.79,.76,.71,.66]];L=[[1,.87,.82,.8,.79,.78],[1,.86,.8,.78,.76,.73],[1,.85,.79,.76,.73,.7]]
    return pick((L if ladder else T)[t],[1,2,3,4,6,9],per)
  key='esteira' if disp=='esteira' else 'trevo'
  E5T={'trevo':[[1,.98,.96],[.97,.93,.89],[.96,.92,.86]],'esteira':[[.98,.91,.87],[.96,.87,.81],[.95,.85,.78]]}
  E5L={'trevo':[[1,1,1],[.97,.95,.93],[.96,.94,.9]],'esteira':[[1,.97,.96],[.98,.93,.89],[.97,.9,.86]]}
  tb=(E5L if ladder else E5T)[key]
  if per<=3: return tb[t][per-1]
  base=pick([1,.87,.82,.8,.8,.79,.79,.78,.78] if ladder else [1,.88,.82,.77,.75,.73,.73,.72,.72],r9,per)
  return base*tb[t][2]/tb[0][2]
XT={'Cu':{1.5:1.0312e-4,2.5:9.9389e-5,4:9.2844e-5,6:8.7875e-5,10:8.7140e-5,16:8.2232e-5,25:8.1456e-5,35:7.8487e-5,50:7.8089e-5,70:7.5512e-5,95:7.5239e-5,120:7.3660e-5,150:7.3740e-5,185:7.3747e-5,240:7.3301e-5,300:7.2994e-5},'Al':{16:8.2232e-5,25:8.1456e-5,35:7.8487e-5,50:7.8089e-5,70:7.5512e-5,95:7.3446e-5,120:7.3660e-5,150:7.3740e-5,185:7.3747e-5,240:7.3301e-5,300:7.2994e-5}}
errors=0
for sc,v in d.items():
  rows=v['rows'];isol=v['isol']
  du={}
  for r in rows:
    m=METHOD[r['ref']];e=[]
    # material e constituição
    expmat='Al' if (r['L']>v['alThr'] and r['p']>v['alPmin'] and r['s']>=16) else 'Cu'
    if r['mat']!=expmat: e.append(f"material {r['mat']} != {expmat}")
    if r['mat']=='Al' and r['cons']!='mono': e.append('Al multicondutor')
    if r['n']>3: e.append('mais de 3 cabos/fase')
    iz0=iz_table(isol,r['mat'],r['s'],r['loaded'],m,r['cons'],r['disp'])
    if abs(iz0-r['iz0'])>1e-9: e.append(f"Iz tabela {r['iz0']} != {iz0}")
    if m=='D': ft=up(D2[isol],r['t'])
    else: ft=up(D1[isol],r['t'])
    if abs(ft-r['ft'])>1e-9: e.append(f'fT {r["ft"]}!={ft}')
    nEff=r['nAgr']+r['n']-1
    fg=fgroup(r['ref'],r['cons'],r['disp'],nEff,r['trays'] if m=='EF' else 1)
    if abs(fg-r['fg'])>1e-9: e.append(f'fG {r["fg"]}!={fg}')
    f=ft*fg*r['fsolo']*(0.8 if r['ref']=='61' else 1)
    Iz=iz0*r['n']*f
    if abs(Iz-r['Iz'])>1e-6: e.append(f'Iz {r["Iz"]:.1f}!={Iz:.1f}')
    In=next(x for x in INSTD if x>=r['Ib']-1e-9)
    if In!=r['In']: e.append(f'In {r["In"]}!={In}')
    if not (r['Ib']<=In<=Iz): e.append(f'falha Ib<=In<=Iz ({r["Ib"]:.1f}/{In}/{Iz:.1f})')
    k2=1.45 if In<=125 else 1.3
    if k2*In>1.45*Iz: e.append('falha I2<=1,45Iz')
    rho=0.0225 if r['mat']=='Cu' else 0.036;b=2 if r['loaded']==2 else 1
    Lc=(r['L']*1.2 if r['L']<30 else r['L']*1.1) if v.get('folga',True)!=False else r['L']
    if abs(Lc-r['Lc'])>1e-9: e.append(f"L' {r['Lc']}!={Lc}")
    cs=v.get('cos',1) or 1;sn=(1-cs*cs)**.5
    dU=b*(rho*Lc/r['s']*cs+XT[r['mat']][r['s']]*Lc*sn)*(r['Ib']/r['n'])/230*100
    if abs(dU-r['du'])>1e-9: e.append(f'du {r["du"]:.3f}!={dU:.3f}')
    if dU>v['limT']+1e-9: e.append(f'ΔU troço {dU:.2f}>{v["limT"]}')
    du[(r['kind'],r['nome'])]=dU;r['_du']=dU
    if e: errors+=1;print(sc,r['nome'],r['mat'],r['n'],'x',r['s'],'|',' ; '.join(e))
  # acumulada
  pmap={f"{r['orig']}>{r['dest']}":r['_du'] for r in rows if r['kind']=='perc'}
  for r in rows:
    if r['kind']!='inv': continue
    acc=r['_du']+sum(pmap.get(p,0) for p in r['path'])
    if abs(acc-r['acc'])>1e-9: errors+=1;print(sc,r['nome'],'acc',r['acc'],'!=',acc)
  print(sc,'ok' if True else '', [f"{r['nome'].split(' ')[0][:3]}{r['nome'].split(' ')[-1]}:{r['n']}x{r['s']}{r['mat']}{'m' if r['cons']=='multi' else ''}" for r in rows])
print('ERROS',errors)
# minimalidade: com os outros circuitos fixos, nenhuma secção menor (mesmo nº de cabos, material e constituição) cumpre tudo
SECS=[1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300]
print('--- minimalidade')
for sc,v in d.items():
  rows=v['rows'];isol=v['isol']
  pd={f"{r['orig']}>{r['dest']}":r['_du'] for r in rows if r['kind']=='perc'}
  for r in rows:
    m=METHOD[r['ref']]
    for s in [x for x in SECS if x<r['s']]:
      if r['mat']=='Al' and s<16: continue
      try: iz0=iz_table(isol,r['mat'],s,r['loaded'],m,r['cons'],r['disp'])
      except Exception: continue
      if iz0 is None: continue
      ft=up(D2[isol],r['t']) if m=='D' else up(D1[isol],r['t'])
      fg=fgroup(r['ref'],r['cons'],r['disp'],r['nAgr']+r['n']-1,r['trays'] if m=='EF' else 1)
      Iz=iz0*r['n']*ft*fg*r['fsolo']*(0.8 if r['ref']=='61' else 1)
      if not(r['Ib']<=r['In']<=Iz) or (1.45 if r['In']<=125 else 1.3)*r['In']>1.45*Iz: continue
      rho=0.0225 if r['mat']=='Cu' else 0.036;b=2 if r['loaded']==2 else 1
      Lc=r['Lc'];cs=v.get('cos',1) or 1;sn=(1-cs*cs)**.5
      dU=b*(rho*Lc/s*cs+XT[r['mat']][s]*Lc*sn)*(r['Ib']/r['n'])/230*100
      if dU>v['limT']: continue
      print(sc,r['nome'],f"{r['n']}x{r['s']}{r['mat']} -> {r['n']}x{s} também cumpria");break
