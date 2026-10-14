/* ---------- motor de cálculo: sem DOM; lê o estado S (definido em rt-app.js) e as tabelas de rt-data.js.
   Usa pickBreaker/scCheck/nodeZ (rt-sc.js) e costPerM (rt-price.js). Testado em tests/engine.test.js ---------- */
/* ---------- constantes RTIEBT ---------- */
const SECS=[1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300];
const INSTD=[6,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1000,1250,1600];
const D1={PVC:{10:1.22,15:1.17,20:1.12,25:1.06,30:1,35:0.94,40:0.87,45:0.79,50:0.71,55:0.61,60:0.5},
          XLPE:{10:1.15,15:1.12,20:1.08,25:1.04,30:1,35:0.96,40:0.91,45:0.87,50:0.82,55:0.76,60:0.71,65:0.65,70:0.58,75:0.5,80:0.41}};
const D2={PVC:{10:1.10,15:1.05,20:1,25:0.95,30:0.89,35:0.84,40:0.77,45:0.71,50:0.63,55:0.55,60:0.45},
          XLPE:{10:1.07,15:1.04,20:1,25:0.96,30:0.93,35:0.89,40:0.85,45:0.80,50:0.76,55:0.71,60:0.65}};
const E6=[[0.4,1.25,'Cabo imerso / lodo'],[0.5,1.21,'Terreno muito húmido / areia'],[0.7,1.13,'Terreno húmido'],[0.85,1.05,'Terreno normal / argila'],[1.0,1.00,'Terreno seco'],[1.2,0.94,'Terreno seco / calcário'],[1.5,0.86,'Terreno muito seco'],[2.0,0.76,'Terreno muito seco'],[2.5,0.70,'Terreno muito seco / cinzas'],[3.0,0.65,'Terreno muito seco']];
/* [local, T ar °C, T solo °C, T mínima de projeto DC °C (sugestão, editável)] */
const LOCS=[['Aveiro',30,18,-3],['Beja',45,22,-4],['Braga',35,18,-6],['Bragança',35,18,-12],['Castelo Branco',40,20,-5],['Coimbra',35,18,-4],['Évora',42,22,-5],['Faro',35,22,0],['Guarda',32,16,-10],['Leiria',35,18,-5],['Lisboa',35,20,-1],['Portalegre',40,20,-5],['Porto',35,18,-3],['Santarém',40,20,-4],['Setúbal',38,20,-3],['Viana do Castelo',30,18,-4],['Vila Real',35,18,-8],['Viseu',35,18,-7],['Madeira',30,20,5],['Açores',28,18,3]];
/* gateways Sigenergy (fichas técnicas 2025): [modelo, gama, fases, In rede A, potência kW, nº entradas de inversor, In por entrada A] */
const GWDB=[['HomePro SP','SigenStor',1,54.6,12,2,54.6],['HomeMax SP 12K','SigenStor',1,100,23,3,55],['HomePro TP','SigenStor',3,45.6,30,1,45.6],['HomeMax TP','SigenStor',3,76,52.6,2,38],
  ['Gateway C60-2','SigenStor C&I',3,91.2,60,2,45.6],['Gateway C120-6','SigenStor C&I',3,182.4,120,6,45.6],['Gateway C180-9','SigenStor C&I',3,274,180,9,45.6],['Gateway C300-12','SigenStor C&I',3,456,300,12,45.6],['Gateway C600','SigenStor C&I',3,912,600,30,45.6],['Gateway C1200','SigenStor C&I',3,1824,1200,50,45.6],
  ['Gateway C600-B','SigenStack',3,912,600,10,190],['Gateway C1200-B','SigenStack',3,1824,1200,20,190],['Gateway C1600-B','SigenStack',3,2432,1600,30,190],['Gateway C2000-B','SigenStack',3,3039,2000,30,190],['Gateway C2400-B','SigenStack',3,3647,2400,30,190]]
  .map(([modelo,gama,fases,In,P,ports,portI])=>({marca:'Sigenergy',modelo,gama,fases,In,P,ports,portI,base:true}));
let INVALL=INVDB.slice(),PANALL=PANELDB.slice(),GWALL=GWDB.slice();
const gwSpec=g=>g&&g.modelo?GWALL.find(x=>x.modelo===g.modelo):null;
/* disjuntores internos do gateway (esquemas tipo Solcor e manual Sigenergy): rede / backup / gerador e uma por entrada de inversor */
const gwMainA=sp=>sp?[63,125,160,250,400,630,1000,1250,1600,2000,2500,3200,4000].find(x=>x>=sp.In)||Math.ceil(sp.In):null;
const gwPortA=sp=>!sp?null:/C&I/.test(sp.gama||'')?63:/Stack/.test(sp.gama||'')?250:[16,20,25,32,40,50,63,80,100,125].find(x=>x>=(sp.portI||0))||63;
const MODE=Object.fromEntries(MODES.map(m=>[m.ref,m]));
const fmt=(v,d=1)=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
const fs=s=>String(s).replace('.',',');
let uid=1;
/* ---------- estado ---------- */
const route=(ref,cons)=>({ref,cons,disp:'trevo',trays:1,sol:false});
function example(){return {proj:'',loc:'Porto',tair:35,tsoil:18,rsolo:1,isol:'XLPE',mat:'auto',alThr:15,alPmin:30,limT:3,lim:5,folga:true,cos:1,descABB:0,
  sc:{on:false,fonte:'pt',sn:630,ucc:4,scc:500,icc:10,L0:0,s0:240,m0:'Al',n0:1},
  dc:{tmin:-3,tcell:70,lim:1.5,ifuse:25,f:1,sel:0,arr:[]},
  invs:[{id:uid++,modelo:'SUN2000-100KTL-M2',pman:0,q:'QFV',L:50,S:'auto'},{id:uid++,modelo:'SUN2000-100KTL-M2',pman:0,q:'QFV',L:5,S:'auto'},
        {id:uid++,modelo:'SUN2000-150K-MG0',pman:0,q:'QFV',L:35,S:'auto'},{id:uid++,modelo:'SUN2000-150K-MG0',pman:0,q:'QFV',L:15,S:'auto'}],
  rInv:route('13','mono'),
  percs:[{id:uid++,orig:'QFV',dest:'QInterligação',L:140,S:'auto',...route('13','mono')},{id:uid++,orig:'QInterligação',dest:'Qentrada',L:7,S:'auto',...route('13','mono')}],gws:[]};}

/* ---------- inversores ---------- */
function invInfo(i){
  const d=INVALL.find(x=>x.modelo===i.modelo);
  if(d)return {nome:d.modelo,pnom:d.pnom,Ib:d.iacmax||d.pnom*1000/(Math.sqrt(3)*400),iac:d.iac||d.iacmax,fases:d.fases,src:'Iac máx. da ficha'};
  const p=+i.pman||0;return {nome:'Outro',pnom:p,Ib:p*1100/(Math.sqrt(3)*400),fases:3,src:'1,1 × Pnom / (√3·400)'};
}

/* ---------- fatores ---------- */
function stepUp(tb,t){for(const k of Object.keys(tb).map(Number).sort((a,b)=>a-b))if(t<=k)return tb[k];return null;}
const pick=(arr,keys,n)=>{for(let i=0;i<keys.length;i++)if(n<=keys[i])return arr[i];return arr[arr.length-1];};
function groupFactor(r,n,t){
  /* n = circuitos por esteira (cada conjunto em paralelo conta como um circuito); t = nº de esteiras sobrepostas */
  const g=MODE[r.ref].g,mono=r.cons==='mono',ti=Math.min(Math.max(t||1,1),3)-1;
  const r9=[1,2,3,4,5,6,7,8,9],k6=[1,2,3,4,6,9];
  const E1a=n=>n<=9?pick([1,.8,.7,.65,.6,.57,.54,.52,.5],r9,n):n<=12?.45:n<=16?.41:.38;
  const E1r4=n=>pick([1,.88,.82,.77,.75,.73,.73,.72,.72],r9,n), E1r5=n=>pick([1,.87,.82,.8,.8,.79,.79,.78,.78],r9,n);
  /* 52-E4 (multicondutores, sem afastamento) e 52-E5 (monocondutores), linhas = 1, 2, 3 esteiras */
  const E4T=[[1,.88,.82,.79,.76,.73],[1,.87,.80,.77,.73,.68],[1,.86,.79,.76,.71,.66]];
  const E4L=[[1,.87,.82,.80,.79,.78],[1,.86,.80,.78,.76,.73],[1,.85,.79,.76,.73,.70]]; /* 3 escadas, 4 cabos: impresso 0,86, usado 0,76 */
  const E5T={trevo:[[1,.98,.96],[.97,.93,.89],[.96,.92,.86]],esteira:[[.98,.91,.87],[.96,.87,.81],[.95,.85,.78]]};
  const E5L={trevo:[[1,1,1],[.97,.95,.93],[.96,.94,.90]],esteira:[[1,.97,.96],[.98,.93,.89],[.97,.90,.86]]};
  const lay=t>1?` · ${Math.min(t,3)} esteiras`:'';
  switch(g){
    case 'E1a':return [E1a(n),'52-E1 (1)'];
    case 'E1b':return [pick([1,.85,.79,.75,.73,.72,.72,.71,.70],r9,n),'52-E1 (2)'];
    case 'E1c':return [pick([.95,.81,.72,.68,.66,.64,.63,.62,.61],r9,n),'52-E1 (3)'];
    case 'tray':case 'ladder':{
      const L=g==='ladder';
      if(!mono)return [pick((L?E4L:E4T)[ti],k6,n),'52-E4'+lay];
      const tb=(L?E5L:E5T)[r.disp==='esteira'?'esteira':'trevo'];const dl=r.disp==='esteira'?'esteira sem afastamento':r.disp==='trevo'?'trevo':'com afastamento';
      if(n<=3)return [tb[ti][n-1],`52-E5 (${dl})`+lay];
      /* mais de 3 circuitos por esteira: 52-E1, corrigido pela redução das esteiras sobrepostas do 52-E5 */
      const base=L?E1r5(n):E1r4(n);return [base*tb[ti][2]/tb[0][2],`52-E1 (${L?5:4})`+lay];}
    case 'E3':return [pick([1,.87,.77,.72,.68,.65],[1,2,3,4,5,6],n),'52-E3'];
    case 'E2':return [pick([1,.85,.78,.72,.62,.55],k6,n),'52-E2'];
  }
  return [1,'—'];
}
function tempInfo(r){
  const m=MODE[r.ref].m,buried=m==='D'||m==='D61';
  if(buried){const ft=stepUp(D2[S.isol],S.tsoil);const e6=(E6.find(x=>x[0]===+S.rsolo)||[0,1])[1];
    return {buried,t:S.tsoil,ft,fsolo:e6,ftubo:m==='D61'?0.8:1,src:'52-D2 · 52-E6'+(m==='D61'?' · ×0,80 em tubo':'')};}
  const t=S.tair+(r.sol?10:0);return {buried,t,ft:stepUp(D1[S.isol],t),fsolo:1,ftubo:1,src:'52-D1'};
}
function izBase(r,mat,s,loaded){
  const m=MODE[r.ref].m,k=String(s),I=S.isol;let t,col,q;
  if(m==='A'||m==='B'||m==='C'){t=TB.ABC[I+loaded+mat];col={A:0,B:1,C:2}[m];q={PVC2:'52-C1',XLPE2:'52-C2',PVC3:'52-C3',XLPE3:'52-C4'}[I+loaded];}
  else if(m==='A2'||m==='B2'){t=TB.A2B2[I+mat];col=m==='A2'?(loaded===2?0:2):(loaded===2?1:3);q=I==='PVC'?'52-C13':'52-C14';}
  else if(m==='EF'){t=TB.EFG[I+mat];col=r.cons==='multi'?(loaded===2?0:1):(loaded===2?2:({trevo:3,esteira:4,afh:5,afv:6}[r.disp]??3));q={PVCCu:'52-C9',PVCAl:'52-C10',XLPECu:'52-C11',XLPEAl:'52-C12'}[I+mat];}
  else{t=TB.D[mat];col=I==='PVC'?(loaded===3?0:1):(loaded===3?2:3);q='52-C30';}
  const row=t&&t[k];const v=row?row[col]:null;return v==null?null:{v,q,col:col+1};
}
/* Auto: alumínio quando o percurso é mais longo que o limite (10 m por defeito); abaixo de 16 mm² fica sempre em cobre */
/* Auto: alumínio só acima de 15 m E acima de 30 kW (valores editáveis); abaixo de 16 mm² é sempre cobre */
const matFor=(s,L,P)=>S.mat==='auto'?((L>(+S.alThr||0)&&P>(+S.alPmin||0)&&s>=16)?'Al':'Cu'):S.mat;

/* ---------- cálculo de um circuito ---------- */
function options(c){
  /* no máximo 3 cabos por fase */
  const out=[];for(let n=1;n<=3;n++)for(const s of SECS){
    if(n>1&&s<70)continue;const mat=matFor(s,c.L,c.p);if(mat==='Al'&&s<16)continue;
    /* alumínio só existe em monocondutor; em E/F os monocondutores só estão tabelados a partir de 25 mm²: abaixo disso, se o tipo de cabo não foi forçado, usa-se multicondutor */
    const cons=mat==='Al'?'mono':(c.r.cons==='mono'&&!c.consForced&&MODE[c.r.ref].m==='EF'&&s<25&&n===1)?'multi':c.r.cons;
    if(!izBase({...c.r,cons},mat,s,c.loaded))continue;out.push({n,s,mat,cons});}
  /* menos cabos primeiro (1 por fase antes de 2 ou 3) e, para o mesmo nº de cabos, a menor secção */
  return out.sort((a,b)=>a.n-b.n||a.s-b.s);
}
/* reatância X (Ω/m) da tabela da folha Excel: X = 2π·50·l, l = 0,05 + 0,46·log(2·am/d) mH/km */
const XTAB={Cu:{1.5:1.0312e-4,2.5:9.9389e-5,4:9.2844e-5,6:8.7875e-5,10:8.7140e-5,16:8.2232e-5,25:8.1456e-5,35:7.8487e-5,50:7.8089e-5,70:7.5512e-5,95:7.5239e-5,120:7.3660e-5,150:7.3740e-5,185:7.3747e-5,240:7.3301e-5,300:7.2994e-5},
            Al:{16:8.2232e-5,25:8.1456e-5,35:7.8487e-5,50:7.8089e-5,70:7.5512e-5,95:7.3446e-5,120:7.3660e-5,150:7.3740e-5,185:7.3747e-5,240:7.3301e-5,300:7.2994e-5}};
const reactance=(s,mat)=>(XTAB[mat]&&XTAB[mat][s])||8e-5;
const k2=In=>In<=125?1.45:1.3;
function calc(c,o){
  const rr={...c.r,cons:o.cons||c.r.cons};const z=izBase(rr,o.mat,o.s,c.loaded);
  const nEff=c.nAgr+o.n-1; /* cada conjunto em paralelo conta como um circuito (nota 1 do 52-E5) */
  const trays=MODE[rr.ref].m==='EF'?Math.max(1,+rr.trays||1):1;const perTray=Math.ceil(nEff/trays);
  const [fg,fgSrc]=groupFactor(rr,perTray,trays);
  const ti=c.ti;const f=ti.ft*ti.fsolo*ti.ftubo*fg;
  const Iz=z.v*o.n*f;
  const In=c.forceIn||INSTD.find(x=>x>=c.Ib);const I2=k2(In)*In;
  const rho=o.mat==='Cu'?0.0225:0.036,b=c.loaded===2?2:1;
  /* fórmula da folha Excel (colunas BQ–BS): u = b·(ρ·L'/S·cos φ + X·L'·sin φ)·Ib/n ; ΔU% = u/230 */
  const cos=Math.min(Math.max(+S.cos||1,0.5),1),sin=Math.sqrt(1-cos*cos);
  const du=b*(rho*c.Lc/o.s*cos+reactance(o.s,o.mat)*c.Lc*sin)*(c.Ib/o.n)/230*100;
  const sc=In!=null?scCheck(c,o,In):{brk:null,scOk:true};
  return {...o,Iz,iz0:z.v,q:z.q,qcol:z.col,fg,fgSrc,f,nEff,perTray,trays,In,I2,du,term:In!=null&&c.Ib<=In&&In<=Iz,sob:I2<=1.45*Iz,...sc};
}

/* ---------- topologia ---------- */
const percFrom=n=>S.percs.find(p=>p.orig.trim()===String(n).trim());
function pathOf(q){const out=[];let n=q,g=0;while(g++<30){const p=percFrom(n);if(!p||out.includes(p))break;out.push(p);n=p.dest;}return out;}
const quadros=()=>{const a=[];S.percs.forEach(p=>[p.orig,p.dest].forEach(n=>{n=n.trim();if(n&&!a.includes(n))a.push(n);}));(S.gws||[]).forEach(g=>{const n=g.nome.trim();if(n&&!a.includes(n))a.push(n);});S.invs.forEach(i=>{if(i.q&&!a.includes(i.q))a.push(i.q);});return a;};
const gwOf=n=>(S.gws||[]).find(g=>g.nome.trim()===String(n).trim());

/* ---------- dimensionamento ---------- */
const passes=x=>x.term&&x.sob&&x.scOk!==false;
/* explicação para um circuito em que nenhuma secção tabelada cumpre In ≤ Iz (ex.: B2 só tabelado até 120 mm²) */
function noFitMsg(c){
  const o=c.res;if(!o||!(o.In>o.Iz))return null;
  const m=MODE[c.r.ref].m,lab={EF:'E/F',D61:'D'}[m]||m,smax=Math.max(...c.opts.map(x=>x.s));
  const head=`Nenhuma secção cumpre In ≤ Iz: ${c.auto?'a maior possível':'a escolhida'}, ${o.n} × ${fs(o.s)} mm² ${o.mat}, dá Iz ${fmt(o.Iz,0)} A < In ${o.In} A.`;
  return smax<300?`${head} No método ${lab} a RTIEBT (${o.q}) só tem valores até ${fs(smax)} mm²: escolhe outra passagem (por exemplo caminho de cabos, ref. 13) ou divide o circuito.`
    :`${head} Nem com 3 cabos de ${fs(smax)} mm² por fase chega: divide o circuito ou escolhe uma passagem com menos agrupamento.`;
}
function solve(zf){
  const invC=S.invs.map((i,k)=>{const info=invInfo(i);const nq=S.invs.filter(x=>x.q===i.q).length;
    const nAgr=nq;
    return {ref:i,kind:'inv',nome:`Inversor ${k+1}`,modelo:info.nome,para:i.q,p:info.pnom,Ib:info.Ib,iac:info.iac||info.Ib,ibSrc:info.src,fases:info.fases,loaded:info.fases===1?2:3,
      L:+i.L||0,r:{...S.rInv,cons:(i.cons==='mono'||i.cons==='multi')?i.cons:S.rInv.cons},consForced:i.cons==='mono',ti:tempInfo(S.rInv),nAgr,path:pathOf(i.q)};});
  const pC=S.percs.flatMap(p=>{const fe=invC.filter(c=>c.path.includes(p));const gw=gwOf(p.orig),gwD=gwOf(p.dest);
    /* ordem inversor → QFV → gateway: do QFV sai um cabo por inversor até à respetiva entrada do gateway */
    if(gwD&&p.split!==false&&fe.length){p.subs=p.subs||{};const sp=gwSpec(gwD);
      return fe.map(ic=>{const key=String(S.invs.indexOf(ic.ref));const sub=(p.subs[key]??={S:'auto'});const ref=Object.create(p);
        Object.defineProperty(ref,'S',{get:()=>sub.S,set:v=>{sub.S=v;},enumerable:true});ref.id=p.id+'_'+key;
        const err=sp&&sp.portI&&ic.iac>sp.portI+1e-9?`Excede a entrada do gateway (${fmt(ic.iac,1)} > ${sp.portI} A)`:'';
        return {ref,base:p,sub:ic,split:true,forceIn:gwPortA(sp),kind:'perc',nome:`${p.orig} → ${p.dest} · ${ic.nome}`,p:ic.p,Ib:ic.Ib,IbInv:ic.Ib,gw:null,gwErr:err,fases:ic.fases,loaded:ic.loaded,
          L:+p.L||0,r:p,ti:tempInfo(p),nAgr:fe.length,nInv:1};});}
    /* monofásico se sair de um gateway monofásico ou se só tiver inversores monofásicos a montante */
    const fases=gw?+gw.fases:(fe.length&&fe.every(c=>c.fases===1)?1:3);
    const IbInv=fases===1?fe.reduce((a,c)=>a+c.Ib,0):fe.reduce((a,c)=>a+(c.fases===1?c.Ib/3:c.Ib),0);
    const Ib=gw&&gw.dimNom!==false?Math.max(IbInv,+gw.In||0):IbInv;
    const sp=gwSpec(gw);
    const gwErr=gw?(+gw.fases===1&&fe.some(c=>c.fases===3)?'Inversor 3F em gateway 1F':((fases===1?fe.reduce((a,c)=>a+c.iac,0):fe.reduce((a,c)=>a+(c.fases===1?c.iac/3:c.iac),0))>(+gw.In||0)+1e-9?`Excede gateway (${fmt(fe.reduce((a,c)=>a+c.iac,0),0)} > ${gw.In} A nominais)`:sp&&sp.ports&&fe.length>sp.ports?`Excede as entradas do gateway (${fe.length} > ${sp.ports})`:'')):'';
    return [{base:p,ref:p,forceIn:gw?gwMainA(sp):null,kind:'perc',nome:`${p.orig} → ${p.dest}`,p:fe.reduce((a,c)=>a+c.p,0),Ib,IbInv,gw,gwErr,fases,loaded:fases===1?2:3,
      L:+p.L||0,r:p,ti:tempInfo(p),nAgr:1,nInv:fe.length}];});
  const pmap=new Map();pC.forEach(c=>{if(!pmap.has(c.base))pmap.set(c.base,c);});const all=invC.concat(pC);
  /* impedância a montante no local do disjuntor: quadro do inversor; nos percursos, o quadro de destino (lado da rede) */
  all.forEach(c=>{c.zUp=zf?zf(c.kind==='inv'?c.para:c.ref.dest):null;});
  /* comprimento de cálculo com folga, como na folha Excel (coluna W): +20% abaixo de 30 m, +10% a partir de 30 m */
  all.forEach(c=>{c.Lc=S.folga===false?c.L:(c.L<30?c.L*1.2:c.L*1.1);});
  all.forEach(c=>{const every=options(c);const tb=every.filter(o=>{const x=calc(c,o);return x.term&&x.sob;});const good=tb.filter(o=>passes(calc(c,o)));
    c.opts=good.length?good:tb.length?tb:every;c.noFit=!good.length&&!tb.length&&every.length>0;
    const okey=o=>`${o.n}x${o.s}|${o.mat}|${o.cons}`;
    if(c.ref.S!=='auto'&&!c.ref.S.includes('|')){const f=c.opts.find(o=>`${o.n}x${o.s}`===c.ref.S)||every.find(o=>`${o.n}x${o.s}`===c.ref.S);c.ref.S=f?okey(f):'auto';}
    if(c.ref.S!=='auto'&&!c.opts.some(o=>okey(o)===c.ref.S)){const [ns,mat,cons]=c.ref.S.split('|');const [n,s]=ns.split('x').map(Number);c.opts=c.opts.concat([{n,s,mat,cons}]);}
    /* sem nenhuma secção que cumpra In ≤ Iz: mostra-se a de maior Iz (a que fica mais perto), não a menor */
    const big=()=>c.opts.reduce((bi,o,j)=>calc(c,o).Iz>calc(c,c.opts[bi]).Iz?j:bi,0);
    const fx=c.ref.S!=='auto'?c.opts.findIndex(o=>okey(o)===c.ref.S):-1;c.auto=fx<0;c.i=c.auto?(c.noFit?big():0):fx;c.min=c.i;});
  const run=()=>{all.forEach(c=>c.res=(c.Ib>0&&c.opts.length)?calc(c,c.opts[c.i]):null);
    pC.forEach(c=>{let d=pathOf(c.ref.orig);d=d.slice(d.indexOf(c.base));c.acc=d.reduce((a,p)=>a+((pmap.get(p).res||{}).du||0),0);});
    invC.forEach(c=>{c.acc=((c.res||{}).du||0)+c.path.reduce((a,p)=>a+((pmap.get(p).res||{}).du||0),0);});};
  /* dois limites: queda em cada troço (limT) e acumulada do inversor até à injeção (lim, quadro 52-O) */
  /* só se verifica a queda em cada troço (como na folha Excel); a acumulada é apenas informativa */
  const ok=()=>all.every(c=>!c.res||c.res.du<=S.limT+1e-9);
  for(let it=0;it<800;it++){run();const viol=[];const vT=all.filter(c=>c.res&&c.res.du>S.limT);if(!viol.length&&!vT.length)break;
    const hits=new Map();vT.forEach(c=>hits.set(c,(hits.get(c)||0)+100));viol.forEach(c=>{hits.set(c,(hits.get(c)||0)+1);c.path.forEach(p=>{const pc=pmap.get(p);hits.set(pc,(hits.get(pc)||0)+1);});});
    let best=null,br=-1;
    hits.forEach((h,c)=>{if(!c.auto||!c.res)return;let nx=null,j=c.i+1;
      for(;j<c.opts.length;j++){const x=calc(c,c.opts[j]);if(x.du<c.res.du-1e-9){nx=x;break;}}
      if(!nx)return;const pa=costPerM(c.res,c.loaded),pb=costPerM(nx,c.loaded);const cost=(pa&&pb?Math.max(pb.p-pa.p,0.01):Math.max(nx.n*nx.s-c.res.n*c.res.s,1))*Math.max(c.L,1);const g=h*(c.res.du-nx.du)/cost;if(g>br){br=g;best=c;best._j=j;}});
    if(!best)break;best.i=best._j;}
  run();
  if(ok())all.forEach(c=>{if(!c.auto)return;for(let j=c.min;j<c.i;j++){const keep=c.i;c.i=j;run();if(ok())break;c.i=keep;run();}});
  run();
  /* uniformizar: inversores iguais no mesmo quadro ficam com o mesmo cabo, salvo se a distância obrigar a outro */
  const key=o=>`${o.mat}|${o.s}|${o.n}|${o.cons}`;
  const valid=(c,o)=>passes(calc(c,o));
  const tryMove=(c,j)=>{const keep=c.i;c.i=j;run();if(ok()&&c.res&&passes(c.res))return true;c.i=keep;run();return false;};
  const groups={};invC.forEach(c=>{if(!c.auto||!c.res)return;const g=`${c.modelo}|${c.para}|${c.r.cons}|${matFor(999,c.L,c.p)}`;(groups[g]??=[]).push(c);});
  Object.values(groups).forEach(g=>{if(g.length<2)return;
    const big=g.map(c=>c.opts[c.i]).sort((a,b)=>a.n*a.s-b.n*b.s).pop();
    g.forEach(c=>{if(key(c.opts[c.i])===key(big))return;const j=c.opts.findIndex(o=>key(o)===key(big));
      /* só sobe para o cabo do grupo se não passar de 2 secções acima do necessário */
      if(j>c.i&&SECS.indexOf(big.s)-SECS.indexOf(c.opts[c.i].s)<=1&&big.n===c.opts[c.i].n&&valid(c,c.opts[j]))tryMove(c,j);});});
  /* reduzir o nº de cabos diferentes: um cabo usado uma só vez passa para outro já usado na obra, até 2 secções acima */
  for(let it=0;it<40;it++){let changed=false;
    const cnt={};all.forEach(c=>{if(c.res){const k=key(c.opts[c.i]);cnt[k]=(cnt[k]||0)+1;}});
    for(const c of all.filter(c=>c.auto&&c.res).sort((a,b)=>cnt[key(a.opts[a.i])]-cnt[key(b.opts[b.i])])){
      const cur=c.opts[c.i];if(cnt[key(cur)]>1)continue;
      const si=SECS.indexOf(cur.s);
      const j=c.opts.findIndex((o,j)=>j!==c.i&&cnt[key(o)]&&o.n===cur.n&&SECS.indexOf(o.s)>=si&&SECS.indexOf(o.s)-si<=1&&valid(c,o));
      if(j>=0&&tryMove(c,j)){changed=true;break;}}
    if(!changed)break;}
  run();
  /* custo de cada circuito e alternativa mais barata que cumpra todas as regras técnicas (com os outros circuitos fixos) */
  const pdu=new Map();pC.forEach(c=>pdu.set(c.base,Math.max(pdu.get(c.base)||0,(c.res||{}).du||0)));
  const accWith=(c,du)=>{if(c.kind==='inv')return [du+c.path.reduce((a,p)=>a+pdu.get(p),0)];
    return invC.filter(q=>q.path.includes(c.ref)).map(q=>((q.res||{}).du||0)+q.path.reduce((a,p)=>a+(p===c.ref?du:pdu.get(p)),0));};
  all.forEach(c=>{c.cost=null;c.alt=null;if(!c.res)return;const k=costPerM(c.res,c.loaded);if(!k)return;c.cost={v:k.p*c.Lc,est:k.est};
    let best=null;
    for(const mat of ['Cu','Al'])for(const cons of (mat==='Al'?['mono']:['mono','multi']))for(let n=1;n<=3;n++)for(const s of SECS){
      if(mat==='Al'&&s<16)continue;if(n>1&&s<70)continue;if(cons==='multi'&&n>1)continue;
      const o={n,s,mat,cons};if(!izBase({...c.r,cons},mat,s,c.loaded))continue;
      const x=calc(c,o);if(!passes(x)||x.du>S.limT+1e-9)continue;
      const q=costPerM(o,c.loaded);if(!q)continue;const v=q.p*c.Lc;if(!best||v<best.v)best={v,est:q.est,o:x};}
    if(best&&best.v<c.cost.v*0.97&&c.cost.v-best.v>=10&&!(best.o.n===c.res.n&&best.o.s===c.res.s&&best.o.mat===c.res.mat&&best.o.cons===c.res.cons))c.alt=best;});
  all.forEach(c=>{c.noFitMsg=c.noFit?noFitMsg(c):null;});
  return {invC,pC,costTot:all.reduce((a,c)=>a+(c.cost?c.cost.v:0),0),costEst:all.some(c=>c.cost&&c.cost.est),Ptot:invC.reduce((a,c)=>a+c.p,0),IbTot:invC.reduce((a,c)=>a+(c.fases===1?c.Ib/3:c.Ib),0)};
}

/* ---------- render ---------- */
/* neutro: igual à fase em monofásico e até 16 mm² Cu / 25 mm² Al; acima, metade da fase (secção normalizada seguinte), mínimo 16 Cu / 25 Al (RTIEBT 524.2).
   PE: quadro 54F — S ≤ 16: S; 16 < S ≤ 35: 16; S > 35: S/2 (secção normalizada seguinte). */
function condSizes(o,loaded){
  const up=x=>SECS.find(v=>v>=x)||x;
  const lim=o.mat==='Al'?25:16;
  const sn=(loaded===2||o.s<=lim)?o.s:Math.max(up(o.s/2),lim);
  const spe=o.s<=16?o.s:o.s<=35?16:up(o.s/2);
  return {sn,spe};
}
function cableParts(o,loaded){
  const type=(o.mat==='Cu'?'':'L')+(S.isol==='XLPE'?'XV':'VV');const mono=loaded===2;
  if(o.cons==='multi'&&o.n===1)return {multi:true,cabo:`1 × ${type} ${mono?'3G':'5G'}${fs(o.s)}`,nota:mono?'fase, neutro e terra no mesmo cabo':'3 fases, neutro e terra no mesmo cabo'};
  const {sn,spe}=condSizes(o,loaded);
  return {multi:false,fase:`${o.n} × ${type} 1×${fs(o.s)} mm²`,neutro:`${o.n} × ${type} 1×${fs(sn)} mm²`,terra:`1 × 1×${fs(spe)} mm² ${o.mat}`,fases:mono?1:3,sn,spe};
}
function solveAll(){
  let R=solve(null);
  if(S.sc&&S.sc.on!==false){let sig='';for(let k=0;k<5;k++){R=solve(nodeZ(R.pC));const s2=R.pC.map(c=>c.res?c.res.n+'x'+c.res.s+c.res.mat:'').join();if(s2===sig)break;sig=s2;}}
  const z=srcZ();R.ikSrc=1.05*400/(Math.sqrt(3)*zabs(z.max))/1000;
  R.brkTot=R.invC.concat(R.pC).reduce((a,c)=>a+(c.res&&c.res.brk&&!c.split&&!gwOf(c.ref.dest)?brkCost(c.res.brk):0),0);
  return R;
}
