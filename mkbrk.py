"""Gera a escada de disjuntores ABB (por calibre e nº de polos, do menor para o maior poder de corte) a partir da tabela ABB."""
import json,re
c=json.load(open('cat/cat.json',encoding='utf-8'))['abb']
items=[(k,str(v[0]),v[1]) for k,v in c.items()]
D={k:(str(v[0]),v[1]) for k,v in c.items()}
def find(pat):
    r=[(k,d,p) for k,d,p in items if re.search(pat,d)]
    return r[0] if r else None
CAL=[6,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1000,1250,1600]
dif={}
# E1.2: na tabela ABB a descrição vem truncada ("E1.2 Di f 1000 ...") e não diz a versão; as referências vêm em blocos de 10,
# um por versão (B, C, N, por ordem de preço), e dentro de cada bloco há uma linha com o nome completo ("E1.2C 1000 ...").
# Icu a 400/415 V (Emax 2 E1.2): B 42 kA, C 50 kA, N 66 kA — confirmar com o catálogo ABB se a ABB mudar as versões.
E12ICU={'B':42,'C':50,'N':66}
def e12(In):
    out=[]
    for k,(d,p) in D.items():
        if not re.search(r'^E1\.2 Di f 0?%d Ekip Dip LI 4p F F'%In,d):continue
        n=int(re.match(r'1SDA(\d+)R1$',k).group(1))
        blk=' '.join(D.get('1SDA%06dR1'%i,('',0))[0] for i in range(n,n+10))
        v=sorted(set(re.findall(r'E1\.2([BCN]) 0?%d '%In,blk)))
        if len(v)==1:out.append((k,d.replace('E1.2 Di f %04d'%In if In<1000 else 'E1.2 Di f %d'%In,'E1.2%s %d'%(v[0],In)),p,v[0]))
    return out
def dda(P,In,fam):
    if fam=='S200':
        k=25 if In<=25 else 40 if In<=40 else 63
        r=find(r'^DDA20%dA-%d/03 '%(P,k))
        return {'name':'DDA20%dA-%d/0,3 tipo A 300 mA'%(P,k),'refs':[r[0]],'p':r[2]} if r else None
    if fam=='S800':
        if In<=63: r=find(r'^DDA80%dA-63/03 '%P); n='DDA80%dA-63/0,3 tipo A 300 mA'%P
        else: r=find(r'^DDA80%dA-100/0,5 '%P); n='DDA80%dA-100/0,5 tipo A 500 mA'%P
        return {'name':n,'refs':[r[0]],'p':r[2]} if r else None
    return None
def mccbdif(frame):
    bob={'XT1':'1SDA066325R1','XT3':'1SDA066325R1','XT5':'1SDA054873R1','E1.2':'1SDA073700R1'}[frame]
    refs=['2CSJ331001R0202','2CSG110100R1211',bob]
    return {'name':'relé RGU-10 + toroide TR4 + bobina de abertura','refs':refs,'p':round(sum(c[r][1] for r in refs),2)}
out={2:{},4:{}}
for P in (2,4):
    for In in CAL:
        L=[]
        def add(r,serie,icu,k2,fam,frame=None,reg=None):
            if not r: return
            d=dda(P,In,fam) if fam in('S200','S800') else mccbdif(frame)
            L.append({'s':serie,'icu':icu,'ref':'58.'+r[0],'d':r[1],'p':r[2],'k2':k2,'mod':fam in('S200','S800'),'dif':d,'reg':reg})
        if In<=63:
            add(find(r'^S20%d-C%d Disj .*6kA/10kA'%(P,In)),'S20%d'%P,6,1.45,'S200')
            add(find(r'^S20%dM-C%d Disj .*10kA/15kA'%(P,In)),'S20%dM'%P,10,1.45,'S200')
            for s,icu in (('C',25),('N',36),('S',50)):
                add(find(r'^S80%d%s-C%d Disj '%(P,s,In)),'S80%d%s'%(P,s),icu,1.45,'S800')
        elif In<=100:
            add(find(r'S80%dP-C%d %dp'%(P,In,P)),'S80%dP'%P,50,1.45,'S800')
        else:
            k=next((x for x in (125,160,200,250,320,400,630,1000,1250,1600) if x>=In),None)
            reg=None if k==In else In
            if k in(125,160):
                for s,icu in (('B',18),('C',25),('N',36),('S',50),('H',70)):
                    add(find(r'^XT1%s160 Disj 160 TMD R%d Im\d+ 4p N100'%(s,k)),'XT1%s160'%s,icu,1.3,'MCCB','XT1',reg)
            elif k in(200,250):
                for s,icu in (('N',36),('S',50)):
                    add(find(r'^XT3%s250 TMD R%d Im\d+ 4P F F N50%%'%(s,k)),'XT3%s250'%s,icu,1.3,'MCCB','XT3',reg)
            elif k in(320,400,630):
                fr=400 if k<=400 else 630
                for s,icu in (('N',36),('S',50),('H',70)):
                    add(find(r'^XT5%s %d Ekip Dip LS/I In=%d 4p F F'%(s,fr,k)),'XT5%s %d'%(s,fr),icu,1.3,'MCCB','XT5',reg)
            elif k in(1000,1250,1600):
                for ref,d,p,v in e12(k):
                    add((ref,d,p),'E1.2%s %d'%(v,k),E12ICU[v],1.3,'MCCB','E1.2',reg)
        L.sort(key=lambda x:(x['icu'],x['p']))
        out[P][In]=L
miss=[(P,In) for P in out for In in out[P] if not out[P][In]]
print('sem disjuntor:',miss)
json.dump(out,open('brk.json','w',encoding='utf-8'),ensure_ascii=False)
print({P:{In:[x['s'] for x in out[P][In]] for In in (6,32,63,100,125,250,630,1000)} for P in out})
