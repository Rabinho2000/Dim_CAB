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
/* tipo de cada quadro: escolhido no popup ou deduzido (QFV se tem inversores, gateway, cliente se é o ponto de injeção) */
const BTYPES={QFV:['Quadro fotovoltaico','Recebe os inversores: proteções de cada inversor, DST e terra.'],INT:['Quadro de interligação','Corte geral, proteção da saída para o cliente e DST.'],CONT:['Quadro de contagem','Contador de produção em armário próprio: direto até 50 kW, indireto com TI acima.'],GW:['Gateway Sigenergy','Entre o QFV e a rede: cada inversor entra numa porta do gateway.'],CLI:['Quadro do cliente','Quadro existente onde se faz a ligação (QGBT / Q. Entrada).']};
const btypeSet=n=>(S.btypes||{})[String(n).trim()]||null;
const gwSpec=g=>g&&g.modelo?GWALL.find(x=>x.modelo===g.modelo):null;
/* disjuntores internos do gateway (esquemas tipo Solcor e manual Sigenergy): rede / backup / gerador e uma por entrada de inversor */
const gwMainA=sp=>sp?[63,125,160,250,400,630,1000,1250,1600,2000,2500,3200,4000].find(x=>x>=sp.In)||Math.ceil(sp.In):null;
const gwPortA=sp=>!sp?null:/C&I/.test(sp.gama||'')?63:/Stack/.test(sp.gama||'')?250:[16,20,25,32,40,50,63,80,100,125].find(x=>x>=(sp.portI||0))||63;
const FAV=['13','16','14','11','12','3A','4A','61','62'];
const MODE=Object.fromEntries(MODES.map(m=>[m.ref,m]));
const METLAB={A:'A',A2:'A2',B:'B',B2:'B2',C:'C',EF:'E/F',D:'D',D61:'D'};

const $=s=>document.querySelector(s);
const fmt=(v,d=1)=>v==null||!isFinite(v)?'—':v.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
const fs=s=>String(s).replace('.',',');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
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
let S=example();
try{const o=JSON.parse(localStorage.getItem('cabosrt.v1')||'null');if(o&&o.invs&&o.percs){if(o.limT==null){o.limT=3;o.lim=5;o.alThr=15;o.alPmin=30;}if(o.folga==null){o.folga=true;o.cos=1;}S=Object.assign(example(),o);(S.gws||[]).forEach(g=>g.id=uid++);S.invs.forEach(i=>i.id=uid++);S.percs.forEach(p=>p.id=uid++);}}catch(e){}
const save=()=>{try{localStorage.setItem('cabosrt.v1',JSON.stringify(S));}catch(e){}};

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
    c.opts=good.length?good:tb.length?tb:every;
    const okey=o=>`${o.n}x${o.s}|${o.mat}|${o.cons}`;
    if(c.ref.S!=='auto'&&!c.ref.S.includes('|')){const f=c.opts.find(o=>`${o.n}x${o.s}`===c.ref.S)||every.find(o=>`${o.n}x${o.s}`===c.ref.S);c.ref.S=f?okey(f):'auto';}
    if(c.ref.S!=='auto'&&!c.opts.some(o=>okey(o)===c.ref.S)){const [ns,mat,cons]=c.ref.S.split('|');const [n,s]=ns.split('x').map(Number);c.opts=c.opts.concat([{n,s,mat,cons}]);}
    const fx=c.ref.S!=='auto'?c.opts.findIndex(o=>okey(o)===c.ref.S):-1;c.auto=fx<0;c.i=c.auto?0:fx;c.min=c.i;});
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
function designation(c){
  const o=c.res;if(!o)return '—';const P=cableParts(o,c.loaded);
  const body=P.multi?`<div class="cgrid"><span>Cabo</span><b>${P.cabo}</b></div><span class="sub">${P.nota}</span>`
    :`<div class="cgrid"><span>Fase${P.fases>1?'s':''}</span><b>${P.fase}</b><span>Neutro</span><b>${P.neutro}</b><span>Terra</span><b>${P.terra}</b></div><span class="sub">por fase${P.fases>1?' (× 3 fases)':''}; neutro por conjunto; terra única</span>`;
  return `<div class="cable">${body}</div><span class="sub trace">${o.q} col. ${o.qcol} · Iz ${fmt(o.iz0,0)} A × ${o.n} × f ${fmt(o.f,2)}</span>`;
}
const eur=v=>v==null?'—':v.toLocaleString('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const breaker=(o,c)=>{if(!o)return '—';const b=o.brk;if(c.split)return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub">entrada do gateway (proteção do fabricante); a proteção do inversor fica no QFV</span>`;if(!b)return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub">a definir</span>`;
  return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub abb">ABB ${esc(b.name)} · ${b.icu} kA</span><span class="sub trace">${esc(b.ref)}</span>${b.dif?`<span class="sub">Diferencial: ${esc(b.dif.name)}</span>`:''}<span class="sub">${eur(brkCost(b))}${+S.descABB?` (PVP −${S.descABB}%)`:' PVP'}</span>`;};
const scCell=o=>{if(!o||o.ikmax==null)return '<span class="sub">—</span>';
  const f=(ok,t)=>`<span class="${ok?'':'bad-t'}">${t}</span>`;
  return `<span class="n">${f(o.icuOk,`máx ${fmt(o.ikmax,1)} kA`)}</span><span class="sub n">${f(o.trip,`mín ${fmt(o.ikmin*1000,0)} A`)} · ${o.elec?`I₃ ≤ ${fmt(Math.min(o.Iset,15),1)} × In`:`Im ${fmt(o.Im,0)} A`}</span><span class="sub n">${f(o.therm,`I²t ${(o.i2t/1e3).toLocaleString('pt-PT',{maximumFractionDigits:0})}k ≤ k²S² ${(o.k2s2/1e3).toLocaleString('pt-PT',{maximumFractionDigits:0})}k`)}</span>`;};
const thumb=r=>{const m=MODE[r.ref];return `<img src="${m.img[0]}" alt="">`;};
function routeCard(key,r,c,autoN){
  const m=MODE[r.ref];const ti=tempInfo(r);
  const ef=m.m==='EF';const tr=ef?Math.max(1,+r.trays||1):1;
  const nE=c&&c.res?c.res.nEff:autoN,pT=c&&c.res?c.res.perTray:Math.ceil(autoN/tr);
  const [fg,src]=c&&c.res?[c.res.fg,c.res.fgSrc]:groupFactor(r,pT,tr);
  return `<div class="modecard"><button class="modepick" data-pick="${key}" aria-label="Escolher tipo de passagem"><span class="tile">${thumb(r)}</span>
      <span class="mtext"><b>Ref. ${m.ref} · método ${METLAB[m.m]}</b><span>${esc(m.d)}</span><u>Alterar passagem</u></span></button>
    <div class="fields">
      <label>${key==='inv'?'Constituição por defeito':'Constituição'}<select data-rk="${key}" data-k="cons"><option value="mono"${r.cons==='mono'?' selected':''}>Monocondutores</option><option value="multi"${r.cons==='multi'?' selected':''}>Multicondutor</option></select></label>
      ${m.m==='EF'&&r.cons==='mono'?`<label>Disposição dos monocondutores<select data-rk="${key}" data-k="disp">${[['trevo','Em trevo (triângulo) · F'],['esteira','Em esteira, sem afastamento · F'],['afh','Com afastamento, horizontal · G'],['afv','Com afastamento, vertical · G']].map(([v,l])=>`<option value="${v}"${r.disp===v?' selected':''}>${l}</option>`).join('')}</select></label>`:''}
      ${ef?`<label>Nº de esteiras sobrepostas<select data-rk="${key}" data-k="trays">${[1,2,3,4].map(v=>`<option value="${v}"${tr===v?' selected':''}>${v}${v===4?' ou mais':''}</option>`).join('')}</select></label>`:''}
      ${ti.buried?'':`<label class="check"><input type="checkbox" data-rk="${key}" data-k="sol"${r.sol?' checked':''}> Exposto ao sol (+10 °C)</label>`}
    </div>
    <div class="factor">${ti.buried?`Solo ${ti.t} °C → fT <b>${fmt(ti.ft,2)}</b> · resistividade <b>${fmt(ti.fsolo,2)}</b>${ti.ftubo<1?' · tubo <b>0,80</b>':''}`:`Ar ${ti.t} °C → fT <b>${fmt(ti.ft,2)}</b>`} · ${nE} circuito${nE===1?'':'s'}${ef&&tr>1?` em ${tr} esteiras (${pT} por esteira)`:''} → agrupamento <b>${fmt(fg,2)}</b> <span>(${src})</span></div></div>`;
}
function renderInvTable(){
  const qs=quadros();const groups={};INVALL.forEach(d=>(groups[d.marca||'Outros']??=[]).push(d));
  const modelSel=v=>Object.entries(groups).map(([b,l])=>`<optgroup label="${esc(b)}">${l.map(d=>`<option value="${esc(d.modelo)}"${d.modelo===v?' selected':''}>${esc(d.modelo)} · ${d.pnom} kW${d.fases===1?' · 1F':''}${d.conf?' · a confirmar':''}</option>`).join('')}</optgroup>`).join('')+`<option value="__outro"${v==='__outro'?' selected':''}>Outro (potência manual)</option>`;
  $('#inv-body').innerHTML=S.invs.map((i,k)=>{const info=invInfo(i);return `<tr data-id="${i.id}"><td class="n">${k+1}</td>
    <td><select data-k="modelo" aria-label="Modelo">${modelSel(i.modelo)}</select>${i.modelo==='__outro'?`<input data-k="pman" type="number" min="0" step="0.1" value="${i.pman||''}" placeholder="kW" class="pman" aria-label="Potência kW">`:''}</td>
    <td class="n r">${fmt(info.pnom,1)}</td><td class="n r">${fmt(info.Ib,1)}<span class="sub">${info.fases===1?'1F 230 V':'3F 400 V'}</span></td>
    <td><select data-k="cons" aria-label="Constituição do cabo"><option value="rota"${!i.cons||i.cons==='rota'?' selected':''}>Como a passagem (${S.rInv.cons==='mono'?'mono':'multi'})</option><option value="mono"${i.cons==='mono'?' selected':''}>Monocondutores</option><option value="multi"${i.cons==='multi'?' selected':''}>Multicondutor</option></select></td>
    <td><select data-k="q" aria-label="Quadro">${qs.concat(qs.includes(i.q)?[]:[i.q]).map(n=>`<option${n===i.q?' selected':''}>${esc(n)}</option>`).join('')}</select></td>
    <td><input data-k="L" type="number" min="0" step="1" value="${i.L}" aria-label="Distância m" class="w-num"></td>
    <td class="r"><button class="ghost" data-dup="${i.id}" title="Duplicar">Duplicar</button><button class="ghost del" data-del="${i.id}">Remover</button></td></tr>`;}).join('');
}
function renderPercTable(){
  $('#p-body').innerHTML=S.percs.map(p=>`<tr data-id="${p.id}">
    <td><input data-k="orig" data-prev="${esc(p.orig)}" value="${esc(p.orig)}" aria-label="Origem"></td>
    <td><input data-k="dest" value="${esc(p.dest)}" aria-label="Destino">${gwOf(p.dest)?'<span class="sub">Gateway</span>':`<select class="btype" data-bt="${esc(p.dest)}" aria-label="Tipo do quadro de destino"><option value="">Tipo automático</option>${['INT','CONT','CLI','QFV'].map(k=>`<option value="${k}"${btypeSet(p.dest)===k?' selected':''}>${BTYPES[k][0]}</option>`).join('')}</select>`}</td>
    <td><input data-k="L" type="number" min="0" step="1" value="${p.L}" aria-label="Distância" class="w-num">${gwOf(p.dest)?`<label class="check"><input type="checkbox" data-k="split"${p.split!==false?' checked':''}> 1 cabo por inversor até ao gateway</label>`:''}</td>
    <td class="r"><button class="ghost del" data-delp="${p.id}">Remover</button></td></tr>
    <tr class="rrow" data-id="${p.id}"><td colspan="4" data-route></td></tr>`).join('');
}
const eur0=v=>v==null?'—':v.toLocaleString('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function altName(o,loaded){const P=cableParts(o,loaded);return P.multi?P.cabo:`fases ${P.fase} · neutro ${P.neutro} · terra ${P.terra}`;}
let last;
function solveAll(){
  let R=solve(null);
  if(S.sc&&S.sc.on!==false){let sig='';for(let k=0;k<5;k++){R=solve(nodeZ(R.pC));const s2=R.pC.map(c=>c.res?c.res.n+'x'+c.res.s+c.res.mat:'').join();if(s2===sig)break;sig=s2;}}
  const z=srcZ();R.ikSrc=1.05*400/(Math.sqrt(3)*zabs(z.max))/1000;
  R.brkTot=R.invC.concat(R.pC).reduce((a,c)=>a+(c.res&&c.res.brk&&!c.split&&!gwOf(c.ref.dest)?brkCost(c.res.brk):0),0);
  return R;
}
function render(){
  const R=solveAll();last=R;
  const maxN=Math.max(1,...R.invC.map(c=>c.nAgr));
  $('#route-inv').innerHTML=routeCard('inv',S.rInv,R.invC[0],maxN);
  R.pC.forEach(c=>{if(c.split&&c!==R.pC.find(x=>x.base===c.base))return;const td=document.querySelector(`#p-body tr.rrow[data-id="${c.base.id}"] [data-route]`);if(td)td.innerHTML=routeCard('p'+c.base.id,c.base,c,c.split?c.nAgr:1);});
  const all=R.invC.concat(R.pC);
  const bad=all.filter(c=>c.Ib>0&&(!c.res||!passes(c.res)||c.res.icuOk===false||c.res.du>S.limT||c.gwErr));
  const worst=Math.max(0,...all.filter(c=>c.res).map(c=>c.res.du));
  const ends=R.pC.filter(c=>!percFrom(c.ref.dest)&&c.res).sort((a,b)=>b.p-a.p);const main=ends[0];
  $('#kpis').innerHTML=[['Inversores',S.invs.length,''],['Potência total',fmt(R.Ptot,1),'kW'],['Corrente total',fmt(R.IbTot,0),'A'],
    ['Disjuntor de ligação',main?main.res.In:'—','A'],['ΔU máxima no troço',fmt(worst,2),'%',worst>S.limT],...(S.sc.on!==false?[['Icc no ponto de injeção',fmt(R.ikSrc,1),'kA']]:[]),['Custo dos cabos',eur0(R.costTot),R.costEst?'c/ estimativas':''],['Custo das proteções',eur0(R.brkTot),+S.descABB?`PVP −${S.descABB}%`:'PVP ABB'],['A rever',bad.length,'',bad.length>0]]
    .map(([l,v,u,b])=>`<div class="kpi${b?' bad':''}"><small>${l}</small><b>${v}</b><i>${u}</i></div>`).join('');
  const rowHTML=c=>{
    const o=c.res;
    if(c.Ib<=0)return `<tr class="${c.kind==='perc'?'feeder':''}"><td>${esc(c.nome)}<span class="sub">${c.L} m</span></td><td class="n r">0,0</td><td colspan="8" class="hint">${c.kind==='perc'?'Nenhum inversor passa por este percurso. Confirma os nomes dos quadros.':'Indica a potência.'}</td></tr>`;
    const st=!o?'bad':(passes(o)&&o.icuOk!==false&&o.du<=S.limT&&!c.gwErr)?'ok':'bad';
    const why=!o?'Sem tabela':c.gwErr?c.gwErr:!o.term?(c.Ib>o.In?'In < Ib':'In > Iz'):!o.sob?'I₂ > 1,45 Iz':o.du>S.limT?'ΔU troço':o.icuOk===false?'Poder de corte':o.trip===false?'Icc mín < Im':o.therm===false?'I²t > k²S²':'OK';
    const sel=`<select class="ovr" data-sel="${c.kind}:${c.ref.id}" aria-label="Secção"><option value="auto">Auto</option>${c.opts.map(x=>{const v=`${x.n}x${x.s}|${x.mat}|${x.cons}`;return `<option value="${v}"${c.ref.S===v?' selected':''}>${x.n>1?x.n+'×':''}${fs(x.s)} ${x.mat}${x.cons==='multi'?' multi':''}</option>`;}).join('')}</select>`;
    const label=c.kind==='inv'?`${esc(c.nome)} → ${esc(c.para)}`:esc(c.nome);
    const sub=c.kind==='inv'?`${esc(c.modelo)} · ${c.L} m${c.Lc!==c.L?` (cálculo ${fmt(c.Lc,1)} m)`:''} · ref. ${c.r.ref}`:`${c.L} m${c.Lc!==c.L?` (cálculo ${fmt(c.Lc,1)} m)`:''} · ${c.nInv} inversor${c.nInv===1?'':'es'}${c.gw?` · gateway ${c.gw.In} A ${+c.gw.fases===1?'1F':'3F'}${c.gw.dimNom!==false&&c.Ib>c.IbInv?' (cabo pela corrente nominal)':''}`:(c.fases===1?' · 1F':'')} · ref. ${c.r.ref}`;
    return `<tr class="${c.kind==='perc'?'feeder ':''}${st==='bad'?'err':''}"><td>${label}<span class="sub">${sub}</span></td><td class="n r">${fmt(c.p,1)}</td><td class="n r">${fmt(c.Ib,1)}</td>
      <td>${designation(c)}${c.alt?`<span class="sub altc">Mais barato e também cumpre: <b>${altName(c.alt.o,c.loaded)}</b> · poupa ${eur0(c.cost.v-c.alt.v)}${c.alt.est||c.cost.est?' (com preço estimado)':''} <button class="linkb" data-useal="${c.kind}:${c.ref.id}" data-o="${c.alt.o.n}x${c.alt.o.s}|${c.alt.o.mat}|${c.alt.o.cons}">Usar</button></span>`:''}${o&&c.opts.length&&c.i===c.opts.length-1&&o.n===3?`<span class="sub limt">Secção máxima: 3 cabos por fase. Se a queda de tensão apertar, considera cobre neste troço.</span>`:''}</td><td>${breaker(o,c)}</td><td class="n r">${o?fmt(o.Iz,0)+' A':'—'}</td><td class="n r">${o?`<b>${fmt(o.du*2.3,2)} V</b><span class="sub">${fmt(o.du,2)} %</span>`:'—'}</td>
      <td class="n r">${c.cost?eur0(c.cost.v)+(c.cost.est?'<span class="est" title="Preço estimado: sem compra deste cabo em 2026">*</span>':''):'—'}</td><td>${sel}</td><td><span class="pill ${st}">${why}</span></td></tr>`;};
  $('#res-body').innerHTML=R.invC.map(rowHTML).join('')+R.pC.map(rowHTML).join('');
  $('#sumline').textContent=(bad.length?`${bad.length} circuito(s) a rever`:'Todos os circuitos verificados')+(ends.length?` · injeção em ${[...new Set(ends.map(e=>e.ref.dest))].join(', ')}`:'');
  save();HOOKS.forEach(f=>f(R));
}

/* ---------- seletor de passagem ---------- */
let pickTarget=null;
function openPicker(key){
  pickTarget=key;const r=key==='inv'?S.rInv:S.percs.find(p=>'p'+p.id===key);
  const card=m=>`<button class="pcard${m.ref===r.ref?' on':''}" data-ref="${m.ref}"><span class="tile">${m.img.map(s=>`<img src="${s}" alt="">`).join('')}</span><b>Ref. ${m.ref} · ${METLAB[m.m]}</b><span>${esc(m.d)}</span></button>`;
  $('#pk-fav').innerHTML=FAV.map(f=>card(MODE[f])).join('');
  $('#pk-all').innerHTML=MODES.filter(m=>!FAV.includes(m.ref)).map(card).join('');
  $('#picker').hidden=false;$('#pk-fav .pcard.on, #pk-all .pcard.on, #pk-fav .pcard')?.focus();
}
function closePicker(){$('#picker').hidden=true;pickTarget=null;}


/* ---------- gateways ---------- */
function renderGwTable(){
  const gws=S.gws||[];$('#gw-empty').hidden=gws.length>0;$('#gw-wrap').hidden=!gws.length;
  $('#gw-body').innerHTML=gws.map(g=>`<tr data-id="${g.id}">
    <td><input data-g="nome" data-prev="${esc(g.nome)}" value="${esc(g.nome)}" aria-label="Nome do gateway"></td>
    <td><select data-g="modelo" aria-label="Modelo"><option value="">Manual</option>${GWALL.concat(g.modelo&&!GWALL.some(x=>x.modelo===g.modelo)?[{modelo:g.modelo}]:[]).map(x=>`<option value="${esc(x.modelo)}"${x.modelo===g.modelo?' selected':''}>${esc((x.marca?x.marca+' ':'')+x.modelo)}</option>`).join('')}</select></td>
    <td><select data-g="fases" aria-label="Rede"><option value="3"${+g.fases===3?' selected':''}>Trifásico 400 V</option><option value="1"${+g.fases===1?' selected':''}>Monofásico 230 V</option></select></td>
    <td><input data-g="In" type="number" min="1" step="1" value="${g.In}" class="w-num" aria-label="Corrente nominal"></td>
    <td><label class="check"><input type="checkbox" data-g="dimNom"${g.dimNom!==false?' checked':''}> Cabo de saída pela corrente nominal</label></td>
    <td class="r"><button class="ghost del" data-delg="${g.id}">Remover</button></td></tr>`).join('');
}
function bindGw(){
  const gb=$('#gw-body');
  const ev=e=>{const el=e.target,k=el.dataset.g;if(!k)return;const g=S.gws.find(x=>x.id===+el.closest('tr').dataset.id);
    if(k==='nome'){const prev=el.dataset.prev,nv=el.value;
      /* o gateway é um nó: o novo nome segue para os inversores e percursos que o usam */
      S.invs.forEach(i=>{if(i.q===prev)i.q=nv;});S.percs.forEach(p=>{if(p.orig===prev)p.orig=nv;if(p.dest===prev)p.dest=nv;});
      g.nome=nv;el.dataset.prev=nv;renderPercTable();renderInvTable();}
    else if(k==='modelo'){g.modelo=el.value;const m=GWALL.find(x=>x.modelo===el.value);if(m){g.fases=+m.fases;g.In=+m.In;}renderGwTable();}
    else if(k==='dimNom')g.dimNom=el.checked;else if(k==='fases')g.fases=+el.value;else g.In=parseFloat(el.value)||0;
    render();};
  gb.addEventListener('input',e=>{if(e.target.type!=='checkbox'&&e.target.tagName==='INPUT')ev(e);});
  gb.addEventListener('change',e=>{if(e.target.tagName==='SELECT'||e.target.type==='checkbox')ev(e);});
  gb.addEventListener('click',e=>{const b=e.target.closest('[data-delg]');if(!b)return;const g=S.gws.find(x=>x.id===+b.dataset.delg);
    /* ao remover, os inversores ligados ao gateway passam para o quadro a jusante */
    const out=S.percs.find(p=>p.orig===g.nome);const ins=S.percs.filter(p=>p.dest===g.nome);
    const to=out?out.dest:(ins[0]?ins[0].orig:(S.percs[0]?S.percs[0].orig:'QFV'));
    /* os percursos que chegavam ao gateway passam a ir para onde o gateway ia */
    ins.forEach(p=>{if(out)p.dest=out.dest;});S.percs=S.percs.filter(p=>p.orig!==g.nome&&(out||p.dest!==g.nome));
    S.invs.forEach(i=>{if(i.q===g.nome)i.q=to;});S.gws=S.gws.filter(x=>x!==g);
    renderGwTable();renderPercTable();renderInvTable();render();});
  $('#addgw').addEventListener('click',()=>openBP('GW'));
  $('#addgw-old')?.addEventListener('click',()=>{S.gws=S.gws||[];let k=S.gws.length+1;while(quadros().includes('Gateway '+k))k++;const nome='Gateway '+k;
    /* ordem inversor → QFV → gateway → quadro seguinte: o gateway entra logo a seguir ao QFV */
    const cnt={};S.invs.forEach(i=>cnt[i.q]=(cnt[i.q]||0)+1);const qfv=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||'QFV';
    const invs=S.invs.filter(i=>i.q===qfv).map(invInfo);const n=invs.length,f1=invs.length&&invs.every(x=>x.fases===1),Ib=invs.reduce((a,x)=>a+(x.iac||x.Ib),0);
    const sp=GWDB.find(g=>g.fases===(f1?1:3)&&g.ports>=n&&g.In>=Ib-1e-9&&invs.every(x=>(x.iac||x.Ib)<=g.portI+1e-9))||null;
    S.gws.push({id:uid++,nome,modelo:sp?sp.modelo:'',fases:sp?sp.fases:(f1?1:3),In:sp?sp.In:63,dimNom:true});
    const out=S.percs.find(p=>p.orig===qfv);
    if(out){const d=out.dest;out.dest=nome;out.split=true;S.percs.push({id:uid++,orig:nome,dest:d,L:5,S:'auto',...route('13','mono')});}
    else S.percs.unshift({id:uid++,orig:qfv,dest:nome,L:5,S:'auto',split:true,...route('13','mono')},{id:uid++,orig:nome,dest:'Quadro do cliente',L:10,S:'auto',...route('13','mono')});
    renderGwTable();renderPercTable();renderInvTable();render();toast(`${nome}${sp?' ('+sp.modelo+')':''} criado entre o ${qfv} e o quadro seguinte.`);});
}

/* ---------- eventos ---------- */
/* referência editável de um circuito: inversor, percurso, ou cabo de um inversor até ao gateway (id "percurso_inversor") */
function refOf(kind,id){if(kind==='inv')return S.invs.find(x=>x.id===+id);const [a,b]=String(id).split('_');const p=S.percs.find(x=>x.id===+a);if(!p)return null;
  if(b==null)return p;p.subs=p.subs||{};const sub=(p.subs[b]??={S:'auto'});return sub;}
function routeOf(key){return key==='inv'?S.rInv:S.percs.find(p=>'p'+p.id===key);}
function bind(){
  $('#loc').innerHTML=LOCS.map(([n])=>`<option>${n}</option>`).join('')+'<option>Outra</option>';
  $('#rsolo').innerHTML=E6.map(([r,f,d])=>`<option value="${r}">${fs(r)} K·m/W · ${d} (${fs(f.toFixed(2))})</option>`).join('');
  $('#folga').addEventListener('change',e=>{S.folga=e.target.checked;render();});
  document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab);});
  ['proj','tair','tsoil','rsolo','isol','mat','alThr','alPmin','limT','cos','descABB'].forEach(k=>{const el=document.getElementById(k);
    el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{S[k]=(el.type==='number'||k==='rsolo')?parseFloat(el.value):el.value;if(k!=='proj')render();else save();});});
  $('#loc').addEventListener('change',e=>{S.loc=e.target.value;const l=LOCS.find(x=>x[0]===S.loc);if(l){S.tair=l[1];S.tsoil=l[2];S.dc.tmin=l[3];$('#tair').value=l[1];$('#tsoil').value=l[2];if(typeof renderDC==='function')renderDC();}render();});
  const ib=$('#inv-body');
  const invEv=e=>{const k=e.target.dataset.k;if(!k)return;const i=S.invs.find(x=>x.id===+e.target.closest('tr').dataset.id);
    if(k==='modelo'){i.modelo=e.target.value;i.S='auto';renderInvTable();}else if(k==='q')i.q=e.target.value;else if(k==='cons'){i.cons=e.target.value;i.S='auto';}else i[k]=parseFloat(e.target.value)||0;
    if(k==='modelo'||k==='pman'){const tr=document.querySelector(`#inv-body tr[data-id="${i.id}"]`);const info=invInfo(i);if(tr&&k==='pman'){tr.children[2].textContent=fmt(info.pnom,1);tr.children[3].firstChild.textContent=fmt(info.Ib,1);}}
    render();};
  ib.addEventListener('input',e=>{if(e.target.tagName==='INPUT')invEv(e);});ib.addEventListener('change',e=>{if(e.target.tagName==='SELECT')invEv(e);});
  ib.addEventListener('click',e=>{const d=e.target.closest('[data-del]'),u=e.target.closest('[data-dup]');
    if(d){S.invs=S.invs.filter(x=>x.id!==+d.dataset.del);}
    if(u){const src=S.invs.find(x=>x.id===+u.dataset.dup);const at=S.invs.indexOf(src);S.invs.splice(at+1,0,{...src,id:uid++,S:'auto'});}
    if(d||u){renderInvTable();render();}});
  $('#add').addEventListener('click',()=>{const l=S.invs[S.invs.length-1];S.invs.push({id:uid++,modelo:l?l.modelo:'SUN2000-50KTL-M3',pman:l?l.pman:0,q:l?l.q:(S.percs[0]?S.percs[0].orig:'QFV'),L:l?l.L:20,S:'auto'});renderInvTable();render();});
  const pb=$('#p-body');
  pb.addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k||el.dataset.rk)return;const p=S.percs.find(x=>x.id===+el.closest('tr').dataset.id);if(!p)return;
    if(k==='split'){p.split=el.checked;render();return;}
    if(k==='orig'||k==='dest'){const prev=el.dataset.prev,nv=el.value;
      if(k==='orig'&&prev&&!S.percs.some(x=>x!==p&&(x.orig===prev||x.dest===prev)))S.invs.forEach(i=>{if(i.q===prev)i.q=nv;});
      p[k]=nv;if(k==='orig')el.dataset.prev=nv;renderInvTable();}else p[k]=parseFloat(el.value)||0;render();});
  pb.addEventListener('change',e=>{const el=e.target;if(!el.dataset.bt)return;S.btypes=S.btypes||{};if(el.value)S.btypes[el.dataset.bt]=el.value;else delete S.btypes[el.dataset.bt];render();});
  pb.addEventListener('click',e=>{const b=e.target.closest('[data-delp]');if(!b)return;S.percs=S.percs.filter(x=>x.id!==+b.dataset.delp);renderPercTable();renderInvTable();render();});
  $('#addp').addEventListener('click',()=>openBP());
  $('#addp-old')?.addEventListener('click',()=>{const ends=S.percs.filter(p=>!percFrom(p.dest));const from=ends.length?ends[ends.length-1].dest:'QFV';
    S.percs.push({id:uid++,orig:from,dest:'Novo quadro',L:10,S:'auto',...route('13','mono')});renderPercTable();renderInvTable();render();
    const inp=document.querySelector('#p-body tr:last-child input[data-k="dest"]');if(inp){inp.focus();inp.select();}});
  /* cartões de passagem (inversores e percursos) */
  const routeEv=e=>{const el=e.target,key=el.dataset.rk;if(!key)return;const r=routeOf(key);const k=el.dataset.k;
    if(k==='sol')r.sol=el.checked;else if(k==='trays')r.trays=parseInt(el.value)||1;else{r[k]=el.value;(key==='inv'?S.invs:[r]).forEach(x=>x.S='auto');}
    if(key==='inv'&&k==='cons')renderInvTable();
    render();};
  /* o nº de circuitos aplica-se ao sair do campo, para o cartão poder ser redesenhado sem perder o foco */
  document.addEventListener('change',e=>{if(e.target.dataset.rk)routeEv(e);});
  document.addEventListener('click',e=>{const p=e.target.closest('[data-pick]');if(p)openPicker(p.dataset.pick);
    const c=e.target.closest('.pcard');if(c&&pickTarget){const r=routeOf(pickTarget);r.ref=c.dataset.ref;if(MODE[r.ref].m==='A2'&&r.cons==='mono')r.cons='multi';
      (pickTarget==='inv'?S.invs:[r]).forEach(x=>x.S='auto');closePicker();render();}});
  $('#pk-close').addEventListener('click',closePicker);
  $('#picker').addEventListener('click',e=>{if(e.target.id==='picker')closePicker();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker();});
  $('#res-body').addEventListener('click',e=>{const b=e.target.closest('[data-useal]');if(!b)return;const [kind,id]=b.dataset.useal.split(':');const ref=refOf(kind,id);if(ref){ref.S=b.dataset.o;render();}});
  $('#res-body').addEventListener('change',e=>{const s=e.target.dataset.sel;if(!s)return;const [kind,id]=s.split(':');const ref=refOf(kind,id);if(ref){ref.S=e.target.value;render();}});
  $('#reset').addEventListener('click',()=>{S=example();if(typeof CUR!=='undefined')CUR=null;load();});
  $('#copy').addEventListener('click',async()=>{const R=last;const L=['Circuito\tEquipamento\tP (kW)\tIb (A)\tL (m)\tPassagem (52H)\tFases (por fase)\tNeutro\tTerra (PE)\tDisjuntor\tRef. ABB disjuntor\tDiferencial ABB\tIz corr. (A)\tΔU troço (V)\tΔU troço (%)\tIcc máx. (kA)\tIcc mín. fim (kA)'];
    R.invC.concat(R.pC).forEach(c=>{const o=c.res;if(!o)return;const P=cableParts(o,c.loaded);
      L.push([c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome,c.kind==='inv'?c.modelo:'',fmt(c.p,1),fmt(c.Ib,1),c.L,`Ref. ${c.r.ref} (${METLAB[MODE[c.r.ref].m]})`,P.multi?P.cabo:P.fase,P.multi?'no mesmo cabo':P.neutro,P.multi?'no mesmo cabo':P.terra,`${o.In} A ${c.loaded===2?'2P':'4P'}`,o.brk?`ABB ${o.brk.name} ${o.brk.icu} kA (${o.brk.ref})`:'',o.brk&&o.brk.dif?`${o.brk.dif.name} (${o.brk.dif.refs.join(', ')})`:'',fmt(o.Iz,0),fmt(o.du*2.3,2),fmt(o.du,2),o.ikmax!=null?fmt(o.ikmax,2):'',o.ikmin!=null?fmt(o.ikmin,2):''].join('\t'));});
    try{await navigator.clipboard.writeText(L.join('\n'));toast('Tabela copiada: cola no Excel ou no Word');}catch(e){toast('A cópia foi bloqueada neste navegador');}});
}
function scVis(){const on=S.sc.on!==false;document.querySelectorAll('#sc-fields [data-f]').forEach(l=>l.hidden=l.dataset.f!==S.sc.fonte);document.querySelectorAll('#sc-fields input,#sc-fields select').forEach(el=>el.disabled=!on);}
let TAB='ac';const HOOKS=[];
function showTab(t){TAB=t;document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  document.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==t);if(last)HOOKS.forEach(f=>f(last));}
function load(){renderGwTable();$('#folga').checked=S.folga!==false;['proj','tair','tsoil','isol','mat','alThr','alPmin','limT','cos','descABB'].forEach(k=>document.getElementById(k).value=S[k]??'');
  S.sc=Object.assign(example().sc,S.sc||{});S.dc=Object.assign(example().dc,S.dc||{});
  S.sc.on=false; /* curto-circuito retirado da ferramenta */
  if(typeof loadDC==='function')loadDC();$('#rsolo').value=String(S.rsolo);$('#loc').value=S.loc;renderPercTable();renderInvTable();render();}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2400);}
bind();bindGw();load();

/* ---------- popup "novo quadro" ---------- */
let BP={type:'INT'};
function bpEnds(){return S.percs.filter(p=>!percFrom(p.dest));}
function openBP(type){BP.type=type||'INT';
  $('#bp-types').innerHTML=['INT','CONT','GW','CLI'].map(k=>`<button class="tcard${k===BP.type?' on':''}" data-bt2="${k}"><b>${BTYPES[k][0]}</b><span>${BTYPES[k][1]}</span></button>`).join('');
  const pos=S.percs.map(p=>[String(p.id),`Entre ${p.orig} e ${p.dest}`]);const ends=bpEnds();const endN=ends.length?ends[ends.length-1].dest:(S.invs[0]?S.invs[0].q:'QFV');
  $('#bp-pos').innerHTML=pos.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')+`<option value="end">No fim, a seguir a ${esc(endN)}</option>`;
  $('#bp-gw').innerHTML=GWALL.map(g=>`<option value="${esc(g.modelo)}">${esc(g.modelo)} · ${g.gama||''} · ${g.In} A ${+g.fases===1?'1F':'3F'} · ${g.ports??'?'} entradas</option>`).join('');
  bpSync(true);$('#bpick').hidden=false;}
function bpSync(defaults){const t=BP.type;document.querySelectorAll('#bp-types .tcard').forEach(b=>b.classList.toggle('on',b.dataset.bt2===t));
  $('#bp-gwl').hidden=t!=='GW';
  const base={INT:'Q. Interligação',CONT:'Q. Contagem',GW:'Gateway',CLI:'Q. Entrada'}[t];let nm=base,k=2;while(quadros().includes(nm))nm=base+' '+k++;
  if(defaults||!$('#bp-name').value||Object.values({INT:'Q. Interligação',CONT:'Q. Contagem',GW:'Gateway',CLI:'Q. Entrada'}).some(b=>$('#bp-name').value.startsWith(b)))$('#bp-name').value=nm;
  /* posição sugerida: gateway logo a seguir ao QFV; contagem e interligação antes do quadro do cliente; cliente no fim */
  const cnt={};S.invs.forEach(i=>cnt[i.q]=(cnt[i.q]||0)+1);const qfv=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const ends=bpEnds();let sug='end';
  if(t==='GW'){const o=S.percs.find(p=>p.orig===qfv);if(o)sug=String(o.id);}
  else if(t!=='CLI'&&ends.length)sug=String(ends[ends.length-1].id);
  if(defaults)$('#bp-pos').value=sug;
  if(t==='GW'&&defaults){const invs=S.invs.filter(i=>i.q===qfv).map(invInfo);const n=invs.length,f1=n&&invs.every(x=>x.fases===1),Ib=invs.reduce((a,x)=>a+(x.iac||x.Ib),0);
    const sp=GWALL.find(g=>+g.fases===(f1?1:3)&&(g.ports||99)>=n&&g.In>=Ib-1e-9&&invs.every(x=>(x.iac||x.Ib)<=(g.portI||999)+1e-9));if(sp)$('#bp-gw').value=sp.modelo;}
  $('#bp-hint').textContent=t==='GW'?'Do QFV sai um cabo por inversor até à respetiva entrada do gateway; a saída do gateway liga ao quadro seguinte.':t==='CONT'?'O contador fica neste quadro (direto até 50 kW, indireto com TI acima) e deixa de aparecer nos outros.':'';}
function bpAdd(){const t=BP.type,name=$('#bp-name').value.trim();if(!name){toast('Indica o nome do quadro');return;}if(quadros().includes(name)){toast('Já existe um quadro com esse nome');return;}
  const L=parseFloat($('#bp-L').value)||5;S.btypes=S.btypes||{};
  if(t==='GW'){const g=GWALL.find(x=>x.modelo===$('#bp-gw').value);S.gws=S.gws||[];S.gws.push({id:uid++,nome:name,modelo:g?g.modelo:'',fases:g?+g.fases:3,In:g?+g.In:63,dimNom:true});}
  else S.btypes[name]=t;
  const pos=$('#bp-pos').value;
  if(pos==='end'){const ends=bpEnds();const from=ends.length?ends[ends.length-1].dest:(S.invs[0]?S.invs[0].q:'QFV');S.percs.push({id:uid++,orig:from,dest:name,L,S:'auto',split:t==='GW',...route('13','mono')});}
  else{const p=S.percs.find(x=>String(x.id)===pos);const d=p.dest;p.dest=name;if(t==='GW')p.split=true;const i=S.percs.indexOf(p);S.percs.splice(i+1,0,{id:uid++,orig:name,dest:d,L,S:'auto',...route('13','mono')});}
  $('#bpick').hidden=true;renderGwTable();renderPercTable();renderInvTable();render();toast(`${name} adicionado`);}
$('#bp-types').addEventListener('click',e=>{const b=e.target.closest('[data-bt2]');if(!b)return;BP.type=b.dataset.bt2;bpSync(true);});
$('#bp-add').addEventListener('click',bpAdd);$('#bp-close').addEventListener('click',()=>$('#bpick').hidden=true);
$('#bpick').addEventListener('click',e=>{if(e.target.id==='bpick')$('#bpick').hidden=true;});
