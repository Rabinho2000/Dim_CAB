/* ---------- dimensionamento das esteiras (passagens E/F: caminhos de cabos e escadas) ----------
   Diâmetros exteriores: valores TÍPICOS de catálogo (estimativa, 0,6/1 kV) — confirmar com o catálogo do fornecedor; não são da RTIEBT.
   Regra: uma só camada (é o que os fatores 52-E4/E5 supõem). Por conjunto: trevo = 2·D das fases, esteira = 3·D, com afastamento = 5·D;
   mais o neutro e a terra ao lado. Multicondutor = D. Entre circuitos/conjuntos fica 1·D livre. Largura sugerida: a normalizada
   ≥ largura ocupada × 1,2 (20 % de reserva). Comprimento: inversores — o maior percurso do grupo (troço comum); percursos — L. */
const DIAM={mono:{Cu:{4:7.5,6:8,10:9,16:10,25:12,35:13,50:15,70:17,95:19,120:21,150:23,185:25.5,240:28.5,300:31.5},
                  Al:{16:10,25:12,35:13,50:14.5,70:16.5,95:18.5,120:20,150:22,185:24.5,240:27.5,300:30}},
  multi5:{1.5:11,2.5:12.5,4:14.5,6:16,10:19.5,16:23,25:28,35:31,50:36},multi3:{1.5:9.5,2.5:10.5,4:12,6:13.5,10:16,16:19,25:23,35:25.5}};
const TRAY_W=[100,150,200,300,400,500,600],TRAY_RES=1.2;
const diamOf=(form,mat,s)=>form==='mono'?(DIAM.mono[mat]||{})[s]:(DIAM[form]||{})[s];
/* largura ocupada por um circuito numa camada (mm) e o maior diâmetro (para o espaço livre) */
function circWidth(c){
  const o=c.res;if(!o)return null;
  if(o.cons==='multi'){const d=diamOf(c.loaded===2?'multi3':'multi5','Cu',o.s);return d?{w:d*o.n+d*(o.n-1),d}:null;}
  const {sn,spe}=condSizes(o,c.loaded),D=diamOf('mono',o.mat,o.s),Dn=diamOf('mono',o.mat,sn),Dp=diamOf('mono',o.mat,spe);if(!D||!Dn||!Dp)return null;
  const disp=c.r.disp||'trevo',ph=c.loaded===2?1:3,k=ph===1?1:disp==='trevo'?2:disp==='esteira'?3:5;
  const set=(ph===1?D:k*D)+Dn;   /* fases + neutro de cada conjunto */
  return {w:o.n*set+(o.n-1)*D+Dp,d:D};
}
function solveTrays(R){
  R=R||last;if(!R)return [];const out=[],isTray=r=>{const m=MODE[r.ref];return m&&m.m==='EF';};
  const add=(nome,r,cs,L,extra)=>{const ws=cs.map(circWidth);if(ws.some(w=>!w))return out.push({nome,r,cs,L,err:'Sem diâmetro típico para uma das secções'});
    const dmax=Math.max(...ws.map(w=>w.d)),trays=Math.max(1,+r.trays||1);
    const w=ws.reduce((a,x)=>a+x.w,0)+Math.max(0,cs.length-1)*dmax+(extra||0)*dmax*2;
    const perTray=w/trays,need=perTray*TRAY_RES,std=TRAY_W.find(x=>x>=need-1e-9);
    out.push({nome,r,cs,L,trays,w,perTray,need,std:std||null,extra:extra||0,err:std?null:`Largura ocupada ${Math.round(perTray)} mm por esteira: mais do que ${TRAY_W[TRAY_W.length-1]} mm — divide por mais esteiras`});};
  /* inversores: um grupo por quadro e esteira */
  const g=new Map();R.invC.filter(c=>c.res&&isTray(c.r)).forEach(c=>{const k=`${c.para}|${String(c.ref.est||'').toUpperCase()}`;(g.get(k)||g.set(k,[]).get(k)).push(c);});
  g.forEach((cs,k)=>{const [q,e]=k.split('|');add(`Inversores → ${q}${e?` · esteira ${e}`:''}`,cs[0].r,cs,Math.max(...cs.map(c=>c.L)),0);});
  /* percursos (os ramos de um mesmo percurso partido por gateway vão juntos) */
  const pg=new Map();R.pC.filter(c=>c.res&&isTray(c.r)).forEach(c=>{(pg.get(c.base)||pg.set(c.base,[]).get(c.base)).push(c);});
  pg.forEach((cs,p)=>add(`${cs[0].code}${cs.length>1?'…':''} · ${p.orig} → ${p.dest}`,p,cs,+p.L||0,Math.max(0,Math.round(+p.extra||0))));
  return out;
}
