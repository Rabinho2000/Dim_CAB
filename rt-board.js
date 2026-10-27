/* ---------- sugestão de quadro: dimensões da envolvente e espaço para trabalhar o cabo ---------- */
/* secção máx. aproximada que o borne do aparelho aceita (mm², por condutor) */
const BORNE=b=>!b?95:/^S20/.test(b.s)?35:/^S80/.test(b.s)?95:/^XT1/.test(b.s)?95:/^XT3/.test(b.s)?185:/^XT5/.test(b.s)?240:400;
/* envolventes Hager Orion plus: [ref, alt., larg., prof., só modular] */
const ORION=[['FL213B',500,400,200,1],['FL216B',650,400,200,1],['FL221B',650,500,250,1],['FL229B',800,600,300,1],['FL126A',950,600,300,1],['FL128A',950,800,300,1],['FL130A',1250,800,300,1],
  ['FL300B',550,600,300,0],['FL301B',850,600,300,0],['FL302B',1150,600,300,0],['FL342B',1450,600,300,0],['FL344B',1750,600,300,0],['FL348B',2050,600,300,0],
  ['FL305B',550,850,300,0],['FL306B',850,850,300,0],['FL307B',1150,850,300,0],['FL352B',1450,850,300,0],['FL354B',1750,850,300,0],['FL358B',2050,850,300,0],
  ['FL310B',550,1100,300,0],['FL311B',850,1100,300,0],['FL312B',1150,1100,300,0],['FL362B',1450,1100,300,0],['FL364B',1750,1100,300,0],['FL368B',2050,1100,300,0]];
/* filas DIN dos kits modulares Hager de cada Orion plus só modular (orçamentos Indusmelec 2026: FL992A 3 × 16 M, FL366A/FL367A × 3) */
const ORION_ROWS={FL213B:3,FL216B:3,FL221B:3,FL229B:4,FL126A:5,FL128A:5,FL130A:7};
/* aparelho de proteção: módulos (DIN) ou platina [largura, altura de fila] */
function devSpace(b,poles){
  if(!b)return {mod:0,plate:[300,450]};
  if(b.mod){const big=/^S80/.test(b.s);return {mod:poles===2?(big?6:4):(big?12:8)};}
  const w=/^XT1/.test(b.s)?120:/^XT3/.test(b.s)?150:/^XT5/.test(b.s)?200:300,h=/^XT[13]/.test(b.s)?300:/^XT5/.test(b.s)?350:450;
  return {mod:4,plate:[w,h]}; /* +4 módulos para o relé diferencial */
}
const SECCB=[[40,4,null],[63,4,null],[100,4,null],[125,4,null],[160,0,[150,300]],[250,0,[150,300]],[400,0,[200,350]],[630,0,[200,350]],[800,0,[250,400]],[1250,0,[300,450]]];
/* composição de um quadro, conforme os esquemas tipo Solcor:
   QGFV novo = interruptor de corte geral 4P + (contagem) + barramento 3F+N + uma saída por inversor
   (bloco diferencial + disjuntor modular, ou disjuntor de caixa moldada + relé diferencial com toroide, bobine de emissão e fusível 2 A)
   + DST tipo 2 (protegido por disjuntor S800P 3P 100 A acima de 125 A, como a Indusmelec) + serviços auxiliares nos quadros com relés + barra de terra.
   Quadro de injeção existente: só as proteções das chegadas. Gateway: equipamento do fabricante. */
const SECCI=[40,63,100,125,160,250,400,630,800,1000,1250,1600];
const TIS=[100,150,200,250,300,400,500,600,800,1000,1250,1500,2000];
const meterFor=c=>c.p<=50+1e-9?{type:'direta',name:'Honeywell AS3000 (direta)'}:{type:'indireta',name:'Honeywell AS3500 (indireta)',ti:TIS.find(x=>x>=c.res.In)||c.res.In};
/* onde fica a contagem (sempre num quadro de contagem próprio):
   1) num quadro do tipo "Quadro de contagem", se existir; 2) havendo gateway, à saída do QFV que o alimenta;
   3) no quadro de interligação que liga ao cliente; 4) senão, à saída do QFV para o quadro do cliente */
function meterHost(R){
  const ns=quadros();const c=ns.find(n=>btypeSet(n)==='CONT'&&!gwOf(n));if(c)return c;
  const g=R.pC.find(c=>gwOf(c.ref.dest));if(g)return g.ref.orig.trim();
  const toInj=R.pC.filter(c=>!percFrom(c.ref.dest));
  const i=toInj.find(c=>{const o=c.ref.orig.trim();return !R.invC.some(x=>x.para===o)&&!gwOf(o);});if(i)return i.ref.orig.trim();
  return toInj.length?toInj[0].ref.orig.trim():null;
}
function qfvParts(node,R){
  node=String(node).trim();const gw=gwOf(node);
  const invs=R.invC.filter(c=>c.para===node&&c.res),subs=R.pC.filter(c=>c.ref.dest.trim()===node&&c.res);
  const outs=R.pC.filter(c=>c.ref.orig.trim()===node&&c.res),out=outs[0]||null;
  if(!invs.length&&!subs.length)return null;
  const feeders=invs.concat(subs).map(c=>{const b=c.res.brk;return {c,b,In:c.res.In,poles:c.loaded===2?2:4,rele:!!(b&&!b.mod)};});
  if(gw)return {node,gw,spec:gwSpec(gw),existing:false,feeders,out,corte:null,meter:null,dst:null,aux:false,role:'GW'};
  const role=btypeSet(node)||(!out?'CLI':invs.length?'QFV':'INT');
  if(role==='CLI'||!out)return {node,gw:null,existing:true,feeders,out,corte:null,meter:null,dst:null,aux:false,role:'CLI'};
  const host=meterHost(R)===node;const kW=outs.reduce((a,c)=>a+c.p,0);
  const mk=()=>{if(!host)return null;const m=meterFor({p:kW,res:{In:Math.max(...outs.map(c=>c.res.In))}});
    /* vários circuitos para o gateway: um só trio de TI no QFV, por onde passam todos (decisão do utilizador, out. 2026); TI pela soma dos In */
    if(outs.length>1){const sum=outs.reduce((a,c)=>a+c.res.In,0),ti=TIS.find(x=>x>=sum)||TIS[TIS.length-1];return {type:'indireta',name:'Honeywell AS3500 (indireta)',ti,shared:outs.length};}return m;};
  const aux=feeders.some(f=>f.rele&&f.c.kind==='inv');
  if(role==='CONT')return {node,gw:null,existing:false,feeders,out,corte:null,meter:meterFor({p:kW,res:{In:out.res.In}}),meterIn:true,dst:null,aux:false,role};
  /* QFV antes de um gateway: cada inversor segue no seu cabo até à entrada do gateway; não há corte geral nem barramento comum */
  /* sem DST no QFV que alimenta um gateway: o gateway já tem DST (decisão do utilizador, out. 2026) */
  if(outs.every(c=>c.split))return {node,gw:null,existing:false,feeders,out,outs,split:true,corte:null,meter:mk(),dst:null,aux:false,role};
  const corteIn=SECCI.find(x=>x>=out.res.In)||out.res.In;
  return {node,gw:null,existing:false,feeders,out,corte:{In:corteIn},meter:mk(),dst:outs.some(c=>gwOf(c.ref.dest))?null:{brk:corteIn>125?100:null},aux,role};
}
/* proteção de interface (desacoplamento): só se o utilizador indicar a potência a partir da qual se aplica (S.pint, kW).
   Fica no quadro de interligação; sem interligação, no primeiro QFV. A regra e o aparelho são da responsabilidade do projetista. */
/* relés diferenciais de um quadro: uma unidade central 4 E/S por cada 4 caixas moldadas (XT) e um relé por E1.2 */
function relays(feeders){const cen=feeders.filter(f=>f.rele&&f.b&&f.b.dif&&f.b.dif.central).length,ind=feeders.filter(f=>f.rele&&!(f.b&&f.b.dif&&f.b.dif.central)).length;
  return {cen,nCen:Math.ceil(cen/4),ind,n:Math.ceil(cen/4)+ind};}
function pintNode(R){
  if(!(+S.pint>0)||!R||R.Ptot<+S.pint-1e-9)return null;const qs=quadros(),role=n=>(qfvParts(n,R)||{}).role;
  return qs.find(n=>role(n)==='INT')||qs.find(n=>role(n)==='QFV')||null;
}
function boardFor(node,R){
  if(gwOf(node))return null;
  const ins=R.invC.filter(c=>c.para===node&&c.res).concat(R.pC.filter(c=>c.ref.dest.trim()===node&&c.res));
  if(!ins.length)return null;
  const out=R.pC.find(c=>c.ref.orig.trim()===node&&c.res);
  const devs=[],cables=[],notes=new Set();let mod=0;const plates=[];
  /* aparelhos para o desenho da frente: módulos DIN (mitems) e aparelhos de platina (plates, com etiqueta) */
  const mitems=[],cnt={},tg=p=>p+(cnt[p]=(cnt[p]||0)+1);
  const addMod=(n,kind,tag,txt,poles,dif)=>{if(!n)return;mod+=n;mitems.push({n,kind,tag,txt,poles,dif});};
  const addPlate=(pl,kind,tag,txt)=>{const a=pl.slice();a.tag=tag;a.kind=kind;a.txt=txt;plates.push(a);};
  /* saída/disjuntor: modular (bloco DIN) ou caixa moldada (platina + relé diferencial de 4 módulos) */
  const addBrk=(b,P,sp,label)=>{const tag=tg('Q');if(sp.plate){addPlate(sp.plate,'mccb',tag,b?b.name:label);addMod(sp.mod,'rele',tg('K'),'relé diferencial');}else addMod(sp.mod,'brk',tag,b?b.name:label,P,!!(b&&b.dif));};
  ins.forEach(c=>{const o=c.res,b=o.brk,P=c.loaded===2?2:4;const sp=devSpace(b,P);addBrk(b,P,sp,c.nome);
    devs.push({nome:c.kind==='inv'?`${c.nome} (${c.modelo})`:c.nome,txt:`${o.In} A ${P}P${b?' · '+b.name:''}`,dif:b&&b.dif?b.dif.name.replace(' + bobina de abertura',''):'',from:c.kind==='perc'?c.ref.orig.trim():null});});
  let InSum=ins.reduce((a,c)=>a+c.res.In,0);
  const Q=qfvParts(node,R);
  /* disjuntor de interligação: no quadro de interligação, se existir; senão fica no quadro do cliente (existente, não é nosso) */
  if(Q&&Q.role==='INT'&&Q.out&&!percFrom(Q.out.ref.dest)){const c=Q.out,o=c.res,b=o.brk,P=c.loaded===2?2:4,sp=devSpace(b,P);addBrk(b,P,sp,'interligação');InSum+=o.In;
    devs.push({nome:'Disjuntor de interligação',txt:`${c.nome} · ${o.In} A ${P}P${b?' · '+b.name:''}`,dif:b&&b.dif?b.dif.name.replace(' + bobina de abertura',''):''});}
  if(Q&&Q.meter&&!Q.corte)devs.unshift({nome:Q.meterIn?'Contador':'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A${Q.meter.shared?` no QFV (os ${Q.meter.shared} circuitos passam no mesmo trio)`:''}`:Q.meter.name,dif:Q.meterIn?'':'contador em quadro de contagem próprio'});
  if(Q&&Q.split){devs.push({nome:'Proteção contra sobretensões',txt:'sem DST no QFV',dif:'o gateway já tem DST; cada inversor segue no seu cabo até ao gateway'});
    const rl=relays(Q.feeders);if(rl.nCen){devs.push({nome:'Relés diferenciais',txt:`${rl.nCen} × unidade central diferencial 4 E/S (CBS-4)`,dif:`${rl.cen} toroide${rl.cen===1?'':'s'} WGC, um por caixa moldada`});addMod(6*rl.nCen,'rele',tg('K'),'unidade central diferencial 4 E/S');}if(rl.n){devs.push({nome:'Alimentação dos relés',txt:`${rl.n} × fusível 2 A`,dif:''});addMod(2*rl.n,'fus',tg('F'),'fusível 2 A');}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});addMod(6,'aux',tg('Q'),'serviços auxiliares');}}
  if(Q&&Q.corte){const s=SECCB.find(x=>x[0]>=Q.corte.In);devs.unshift({nome:'Corte geral',txt:`interruptor de corte ${Q.corte.In} A 4P`,dif:''});
    if(s){addMod(s[1],'corte','S1','interruptor de corte '+Q.corte.In+' A',4);if(s[2])addPlate(s[2],'corte','S1','interruptor de corte '+Q.corte.In+' A');}else addPlate([300,450],'corte','S1','interruptor de corte '+Q.corte.In+' A');
    if(Q.meter)devs.splice(1,0,{nome:'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A`:Q.meter.name,dif:'em quadro de contagem próprio'});
    if(Q.dst){devs.push({nome:'Proteção contra sobretensões',txt:'DST tipo 2, 230/400 V, 3F+N',dif:Q.dst.brk?`protegido por disjuntor S800P 3P ${Q.dst.brk} A`:'protegido pelo corte geral'});addMod(4,'dst',tg('L'),'DST tipo 2');
      if(Q.dst.brk)addMod(4.5,'brk',tg('Q'),'S800P 3P '+Q.dst.brk+' A',3);}
    else devs.push({nome:'Proteção contra sobretensões',txt:'sem DST no QFV',dif:'o gateway já tem DST'});
    const rl=relays(Q.feeders);if(rl.nCen){devs.push({nome:'Relés diferenciais',txt:`${rl.nCen} × unidade central diferencial 4 E/S (CBS-4)`,dif:`${rl.cen} toroide${rl.cen===1?'':'s'} WGC, um por caixa moldada`});addMod(6*rl.nCen,'rele',tg('K'),'unidade central diferencial 4 E/S');}if(rl.n){devs.push({nome:'Alimentação dos relés',txt:`${rl.n} × fusível 2 A`,dif:''});addMod(2*rl.n,'fus',tg('F'),'fusível 2 A');}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});addMod(6,'aux',tg('Q'),'serviços auxiliares');}
    if(pintNode(R)===node){devs.push({nome:'Proteção de interface',txt:'relé de proteção de interface (desacoplamento), atuando no corte geral por bobina ou contactor',dif:'a especificar conforme as condições de ligação do operador de rede'});addMod(8,'int',tg('K'),'proteção de interface');
      notes.add(`Proteção de interface: instalação com ${fmt(R.Ptot,1)} kW ≥ ${fs(S.pint)} kW (limite indicado nos Critérios).`);}
    if(false)notes.add(`Sem quadro de interligação: a contagem (${meterFor(Q.out).name}${meterFor(Q.out).ti?` com TI ${meterFor(Q.out).ti}/5 A`:''}) e a proteção de interligação ficam no quadro do cliente.`);
    if(Q.meter&&!Q.meterIn)notes.add(`Contagem num quadro de contagem próprio, junto à entrada: ${Q.meter.name}${Q.meter.ti?` com TI ${Q.meter.ti}/5 A${Q.meter.shared?` no QFV (os ${Q.meter.shared} circuitos passam no mesmo trio)`:''}`:''}.`);
    if(Q.meter&&Q.meter.type==='indireta')notes.add(`Transformadores de intensidade ${Q.meter.ti}/5 A no barramento de entrada: prever espaço junto ao corte geral.`);}
  /* cabos que entram no quadro: os que chegam e o que sai */
  const OUTS=R.pC.filter(c=>c.ref.orig.trim()===node&&c.res);ins.concat(OUTS).forEach(c=>{const isOut=OUTS.includes(c);const o=c.res,P=cableParts(o,c.loaded);
    const multi=P.multi,D=multi?(DMULTI[o.s]||45):(DMONO[o.s]||32);
    const nCond=multi?o.n:o.n*((c.loaded===2?1:3)+1)+1;const r=Math.round(10*D/5)*5;
    const brk=isOut?null:o.brk;const cap=BORNE(brk);
    cables.push({nome:isOut?`${c.nome} (saída)`:(c.kind==='inv'?c.nome:c.nome),cabo:multi?P.cabo:`${o.n>1?o.n+' × ':''}${o.mat==='Al'?'LXV':'XV'} 1×${fs(o.s)} por fase`,D,r,nCond,mat:o.mat,s:o.s,n:o.n,cap,multi});
    if(o.mat==='Al')notes.add('Alumínio: terminais bimetálicos Cu/Al, escovar e aplicar massa de contacto; reapertar ao binário indicado pelo fabricante.');
    if(!multi&&o.n>=2&&!isOut)notes.add(`${c.nome}: ${o.n} cabos por fase no mesmo borne; prever terminais de expansão ou repartidor à saída do aparelho.`);
    if(!isOut&&o.s>cap)notes.add(`${c.nome}: ${fs(o.s)} mm² excede o borne do ${brk?brk.s:'aparelho'} (≈ ${cap} mm²); usar borne de passagem/repartidor ou terminal de redução (confirmar no catálogo).`);
    if(o.s>=185&&!multi)notes.add(`Cabo de ${fs(o.s)} mm² é rígido e pesado: entrar por baixo, alinhado com os bornes, e amarrar à calha antes de ligar.`);});
  if(ins.some(c=>c.res.brk&&/^E1/.test(c.res.brk.s)))notes.add('Disjuntor aberto (E1.2): normalmente vai num armário de chão; a envolvente abaixo é só indicativa.');
  const Dmax=Math.max(...cables.map(x=>x.D)),rMax=Math.max(...cables.map(x=>x.r));
  const zone=Math.max(150,rMax); /* espaço livre por baixo da aparelhagem: o raio de curvatura do maior cabo, pelo menos 150 mm (tampa univers a.150) */
  /* transformadores de intensidade da contagem indireta no quadro que a tem: 3 por circuito contado, nos cabos de saída, na zona de cabos
     (como os T1/T2 por baixo da aparelhagem nos desenhos Indusmelec; não ocupam altura própria); TI de barra (> 250 A) mais largos */
  const tiN=Q&&Q.meter&&Q.meter.type==='indireta'?3:0,tiW=Q&&Q.meter&&Q.meter.ti>250?100:60;
  const glandW=cables.reduce((a,x)=>a+x.nCond*(x.D+15),0);
  let best=null;
  for(const [ref,H,W,Pf,onlyMod] of ORION){
    if(onlyMod&&plates.length)continue;const use=W-100;if(plates.some(p=>p[0]>use))continue;
    const rows=[];plates.slice().sort((a,b)=>b[1]-a[1]).forEach(p=>{const r=rows.find(r=>r.w+p[0]+20<=use);if(r){r.items.push(p);r.w+=p[0]+20;r.h=Math.max(r.h,p[1]);}else rows.push({w:p[0],h:p[1],items:[p]});});
    const mpr=Math.floor(use/18),mrows=Math.ceil(mod*1.3/mpr);
    /* só modular: filas de 100 mm como nos kits Hager dos orçamentos Indusmelec 2026 (FL213B 500 × 400 com o kit 3 × 16 M; FL216B 650 × 400
       com 3 tampas de 16 M), até ORION_ROWS filas; com platinas (caixas moldadas): filas de 150 mm e 80 mm de margem */
    const hDev=rows.reduce((a,r)=>a+r.h,0)+mrows*(onlyMod?100:150);
    const gRows=Math.ceil(glandW/use),gMax=Pf>=300?(Dmax<=35?3:2):(Dmax<=20?2:1);
    if(gRows>gMax)continue;
    if(onlyMod&&mrows>(ORION_ROWS[ref]||Math.floor(H/150)))continue;
    /* margens: 20 mm em cima e em baixo nas só modulares, 40 mm com platinas (calibrado: 2 × S804P + XT1 cabe em 850 × 600 como no
       orçamento Escola Secundária do Cadaval; 3 filas na FL213B 500 × 400) */
    if(H<hDev+zone+(onlyMod?40:80))continue;
    /* a mais pequena; acima de 1150 mm de altura conta 30 % a mais (a Indusmelec prefere alargar: 1150 × 850 com 3–6 caixas moldadas) */
    const area=H*W*(H>1150?1.3:1);if(!best||area<best.area)best={ref,H,W,Pf,area,rows,mrows,mpr,hDev,gRows};}
  const dif=(rMax>=300?2:0)+(cables.some(x=>x.mat==='Al'&&x.s>=150)?1:0)+(cables.some(x=>!x.multi&&x.n>=2)?1:0)+(cables.some(x=>x.s>x.cap)?1:0);
  return {node,ins,out,devs,cables,notes:[...notes],mod,plates,mitems,bus:plates.some(p=>p.kind==='mccb')?'cu':(ins.length>1||InSum>63?'td':null),zone,rMax,glandW,best,dif,InSum,ti:tiN?{n:tiN,w:tiW,A:Q.meter.ti}:null,Ib:ins.reduce((a,c)=>a+(c.kind==='inv'&&c.fases===1?c.Ib/3:c.Ib),0),isEnd:!out};
}
/* desenho da frente do quadro no estilo das vistas frontais do configurador Hager que a Indusmelec envia com os orçamentos (2026):
   Orion plus só modular = montantes amarelos com calhas DIN igualmente espaçadas (kit FL992A ou tampas FL366A/FL367A), aparelhos
   com a etiqueta na vertical; com platinas = Orion plus com univers por dentro, em colunas de unidades funcionais (UD12B4A modular,
   UK22LH1 caixas moldadas, UK21S1 corte, UE21D3 barramento vertical, UZ02B3 calha dos TI, tampas UD11F1/UD12F1 e UD01F1/UD02F1 nos
   topos), cada uma com a referência. Escala aproximada: as dimensões são as do dimensionamento, não o desenho do fabricante. */
const BSK_ORDER=['corte','dst','brk','rele','fus','aux','int'];
function boardSVG(b){
  const e=b.best;if(!e)return '';
  const sc=Math.min(330/e.W,470/e.H),W=e.W*sc,H=e.H*sc,x0=14,y0=40,S=v=>v*sc,o=[];
  const fsz=Math.max(6.5,Math.min(9,sc*24)),f1=v=>v.toFixed(1),INK='#2A2F35';
  const T=(x,y,s,sz=fsz,a='middle',fill=INK,extra='')=>o.push(`<text x="${f1(x)}" y="${f1(y)}" font-size="${f1(sz)}" text-anchor="${a}" fill="${fill}"${extra}>${esc(s)}</text>`);
  const TV=(x,y,s,sz=fsz)=>T(x,y,s,sz,'start',INK,` transform="rotate(-90 ${f1(x)} ${f1(y)})"`); /* etiqueta na vertical, como nos desenhos Hager */
  const R=(x,y,w,h,fill,stroke='#333',sw=0.6,extra='')=>o.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0.5,w))}" height="${f1(Math.max(0.5,h))}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`);
  const L=(x1,y1,x2,y2,c='#333',sw=0.5)=>o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${c}" stroke-width="${sw}"/>`);
  const tip=s=>o.push(`<title>${esc(s)}</title>`);
  T(x0+W/2,y0-14,e.ref,13,'middle',INK,' letter-spacing="1"');
  /* envolvente: caixa cinzenta com aro duplo e placa de fundo */
  R(x0,y0,W,H,'#E7EAEC','#6B737A',1);R(x0+S(10),y0+S(10),W-S(20),H-S(20),'#E7EAEC','#6B737A',0.6);R(x0+S(18),y0+S(18),W-S(36),H-S(36),'#D9DEE1','#555',0.6);
  /* aparelho modular (n módulos de 18 mm) com o centro vertical em yc */
  const dev=(x,yc,it)=>{const w=S(it.n*18),h=S(88),y=yc-h/2,p=Math.max(1,Math.round(it.poles||(it.kind==='dst'?4:it.kind==='fus'?1:Math.min(4,it.n))));
    const body=(bx,bw,np,toggle)=>{R(bx,y,bw,h,'#F8F8F8','#333',0.6);R(bx,y,bw,h*0.1,'#E0E3E5','#333',0.4);R(bx,y+h*0.9,bw,h*0.1,'#E0E3E5','#333',0.4);
      for(let j=0;j<np;j++){const px=bx+bw*j/np;if(j)L(px,y+h*0.1,px,y+h*0.9,'#999',0.3);if(toggle)R(px+bw/np*0.28,y+h*0.36,bw/np*0.44,h*0.14,'#1A1A1A','#000',0.3);}
      L(bx,y+h*0.55,bx+bw,y+h*0.55,'#777',0.4);};
    if(it.kind==='brk'&&it.dif){const bw=w/2;body(x,bw,p,true);R(x+bw,y,bw,h,'#F1F2F3','#333',0.6);R(x+bw,y+h*0.1,bw,h*0.12,'#BFC5CA','#555',0.4);
      R(x+bw+bw*0.15,y+h*0.62,bw*0.18,h*0.07,'#2C6FB7','#1B4A7A',0.3);L(x+bw,y+h*0.55,x+w,y+h*0.55,'#777',0.4);}
    else if(it.kind==='dst'){R(x,y,w,h,'#F8F8F8','#333',0.6);for(let j=0;j<4;j++){const px=x+w*j/4;if(j)L(px,y,px,y+h,'#777',0.4);R(px+w/4*0.2,y+h*0.12,w/4*0.6,h*0.5,'#ECEDEE','#666',0.3);R(px+w/4*0.25,y+h*0.72,w/4*0.5,h*0.07,'#2DB327','#1E7A19',0.3);}}
    else if(it.kind==='rele'){R(x,y,w,h,'#F8F8F8','#333',0.6);R(x+w*0.12,y+h*0.22,w*0.76,h*0.22,'#BCE0E8','#4A6B73',0.4);for(let j=0;j<3;j++)R(x+w*(0.18+j*0.24),y+h*0.56,w*0.14,h*0.08,'#555','#222',0.3);}
    else if(it.kind==='fus'){const np=Math.max(1,Math.round(it.n));for(let j=0;j<np;j++){const px=x+w*j/np;R(px,y,w/np,h,'#F8F8F8','#333',0.6);R(px+w/np*0.2,y+h*0.18,w/np*0.6,h*0.3,'#3B4249','#111',0.3);}}
    else if(it.kind==='int'){R(x,y,w,h,'#F3EEDD','#333',0.6);R(x+w*0.1,y+h*0.2,w*0.8,h*0.25,'#BCE0E8','#4A6B73',0.4);}
    else body(x,w,p,true);
    TV(x+Math.min(w*0.5,S(10))+3,y-3,it.tag||'');tip((it.tag||'')+' · '+(it.txt||''));return w;};
  const rail=(xa,xb,yc)=>{R(xa,yc-S(17),xb-xa,S(34),'#D8CCA8','#8A8266',0.5);L(xa,yc-S(9),xb,yc-S(9),'#A99E7C',0.4);L(xa,yc+S(9),xb,yc+S(9),'#A99E7C',0.4);};
  const its=b.mitems.slice().sort((a,c)=>BSK_ORDER.indexOf(a.kind)-BSK_ORDER.indexOf(c.kind));
  /* filas de aparelhos modulares: a primeira com o corte à esquerda e o DST à direita, como nos desenhos; depois as saídas */
  const packRows=cap=>{const first=its.filter(i=>i.kind==='corte'),dst=its.filter(i=>i.kind==='dst'),rest=its.filter(i=>i.kind!=='corte'&&i.kind!=='dst');const rows=[];
    let r={left:first.slice(),right:[],n:first.reduce((a,i)=>a+i.n,0)};
    dst.forEach(d=>{if(r.n+d.n<=cap+1e-9){r.right.push(d);r.n+=d.n;}else rest.unshift(d);});rows.push(r);r=null;
    rest.forEach(it=>{if(!r||r.n+it.n>cap+1e-9){r={left:[],right:[],n:0};rows.push(r);}r.left.push(it);r.n+=it.n;});
    if(!rows[0].left.length&&!rows[0].right.length)rows.shift();return rows;};
  const drawRow=(row,xa,xb,yc)=>{let x=xa+S(8);row.left.forEach(it=>{x+=dev(x,yc,it);});let xr=xb-S(8);row.right.slice().reverse().forEach(it=>{const w=S(it.n*18);dev(xr-w,yc,it);xr-=w;});return x;};
  const td=()=>b.InSum<=80?80:b.InSum<=125?125:160;
  if(!e.rows.length){
    /* Orion plus só modular: montantes amarelos e calhas DIN igualmente espaçadas */
    const xa=x0+S(32),xb=x0+W-S(32);
    [xa,xb-S(30)].forEach(x=>{R(x,y0+S(22),S(30),H-S(44),'#F5B800','#A87800',0.5);for(let yy=y0+S(40);yy<y0+H-S(30);yy+=S(25))o.push(`<circle cx="${f1(x+S(15))}" cy="${f1(yy)}" r="${f1(Math.max(0.6,S(2.2)))}" fill="#7A5A00"/>`);});
    const nR=Math.max(ORION_ROWS[e.ref]||Math.floor((e.H-80)/150),e.mrows||1),pit=(H-S(80))/nR,cap=e.mpr||Math.floor((e.W-100)/18);
    const rows=packRows(cap),acc=(ORION_ACC[e.ref]||[]).map(x=>x[0]).find(r=>/^FL9|^FL36/.test(r));
    for(let i=0;i<nR;i++){const yc=y0+S(40)+pit*(i+0.55);rail(xa+S(4),xb-S(4),yc);
      if(rows[i]){const x=drawRow(rows[i],xa+S(30),xb-S(30),yc);
        if(i===rows.length-1&&b.bus==='td'&&cap-rows[i].n>=6.5){const w=S(6*18),tx=x+S(14),h=S(88);R(tx,yc-h/2,w,h,'#3B4249','#111',0.6);for(let j=0;j<4;j++)R(tx+w*(j+0.2)/4,yc+h*0.22,w*0.14,S(12),'#C98A4B','#7A4A1C',0.3);TV(tx+S(10)+3,yc-h/2-3,'TD '+td());tip('repartidor tetrapolar TD '+td()+' A');}}
      if(acc&&(/^FL36/.test(acc)||i===nR-1))T(x0+W/2,yc+pit*0.42,acc,fsz+1,'middle',INK,' letter-spacing="0.6"');}
  }else{
    /* Orion plus com univers: colunas de unidades funcionais (l.250 / l.500) entre montantes univers */
    const use=e.W-100,cols=use>=1000?[500,500]:use>=750?[250,500]:[500];
    const top=75,avail=e.H-100-2*top,units=cols.map(()=>[]),used=cols.map(()=>0);
    const put=(u,pref)=>{let c=pref<cols.length?pref:cols.length-1;if(cols[c]<u.w)c=cols.findIndex(w=>w>=u.w);if(used[c]+u.h>avail+1e-9){const k=cols.findIndex((w,j)=>j!==c&&w>=u.w&&used[j]+u.h<=avail+1e-9);if(k>=0)c=k;}units[c].push(u);used[c]+=u.h;};
    const narrow=cols.indexOf(250),wide=cols.length-1,side=narrow>=0?narrow:0;
    /* corte e barramento vertical na coluna estreita (como no desenho Summerberry), aparelhagem modular, caixas moldadas e TI na larga */
    const cor=b.plates.filter(p=>p.kind==='corte'),mc=b.plates.filter(p=>p.kind==='mccb');
    cor.forEach(p=>put({w:narrow>=0?250:500,h:p[1]>350?450:300,ref:Q_CORTE(p),kind:'corte',items:[p]},side));
    if(mc.length)put({w:narrow>=0?250:500,h:300,ref:b.InSum>250?'UE21D3':'UE21D2',kind:'bus'},side);
    const m24=its.length?packRows(cols[wide]===500?24:12):[];m24.forEach(r=>put({w:cols[wide],h:225,ref:cols[wide]===500?'UD12B4A':'UD11B4A',kind:'mod',row:r},wide));
    const big=mc.filter(p=>p[0]>150),small=mc.filter(p=>p[0]<=150);
    for(let i=0;i<small.length;i+=2)put({w:500,h:300,ref:'UK22LH1',kind:'mccb',items:small.slice(i,i+2)},wide);
    for(let i=0;i<big.length;i+=2)put({w:500,h:450,ref:'UK32LH34',kind:'mccb',items:big.slice(i,i+2)},wide);
    if(b.ti)put({w:cols[wide],h:150,ref:'UZ02B3',kind:'ti'},wide);
    let cx=x0+S(50);
    cols.forEach((cw,ci)=>{const X=cx,Wc=S(cw);
      /* topos (tampas de extremidade) e tampas cegas a preencher a coluna */
      const blank=cw===500?'UD12F1':'UD11F1',end=cw===500?'UD02F1':'UD01F1';let free=avail-used[ci];while(free>=150-1e-9){units[ci].push({w:cw,h:150,ref:blank,kind:'blank'});free-=150;}
      /* se a coluna não couber na altura (a envolvente é dimensionada com outras regras), as unidades encolhem para caber no desenho */
      const kf=free<0?avail/used[ci]:1,extra=Math.max(0,free);let y=y0+S(50);
      const box=(h,ref,fill='#E9ECEE')=>{R(X,y,Wc,S(h),fill,'#555',0.6);T(X+Wc/2,y+S(h)-S(10),ref,fsz,'middle',INK,' letter-spacing="0.5"');};
      box(top+extra/2,end);y+=S(top+extra/2);
      units[ci].forEach(u=>{u.h*=kf;const h=S(u.h);
        if(u.kind==='blank')box(u.h,u.ref);
        else if(u.kind==='mod'){box(u.h,u.ref);const yc=y+h*0.45;rail(X+S(6),X+Wc-S(6),yc);drawRow(u.row,X+S(6),X+Wc-S(6),yc);}
        else if(u.kind==='bus'){box(u.h,u.ref,'#E9E2C8');for(let j=0;j<4;j++){const bx=X+Wc*(0.2+j*0.17);R(bx,y+S(14),Wc*0.07,h-S(40),'#C98A4B','#7A4A1C',0.5);}
          for(let k=0;k<3;k++)R(X+Wc*0.12,y+S(30)+k*(h-S(80))/2,Wc*0.76,S(12),'#F5D33A','#A87800',0.4);tip('barramento vertical '+(u.ref==='UE21D3'?'400 A':'250 A'));}
        else if(u.kind==='ti'){box(u.h,u.ref);const yc=y+h*0.4;rail(X+S(6),X+Wc-S(6),yc);let tx=X+S(20);const w=S(b.ti.w),hh=S(50);
          for(let k=0;k<b.ti.n&&tx+w<X+Wc;k++){R(tx,yc-hh/2,w,hh,'#3B4249','#111',0.6,' rx="2"');if(b.ti.w>60)R(tx+w*0.15,yc-hh*0.12,w*0.7,hh*0.24,'#C98A4B','#7A4A1C',0.4);else o.push(`<circle cx="${f1(tx+w/2)}" cy="${f1(yc)}" r="${f1(Math.min(w,hh)*0.28)}" fill="#D9DEE1" stroke="#111" stroke-width="0.5"/>`);
            TV(tx+w/2+3,yc-hh/2-3,'T'+(k+1));tip(`T${k+1} · TI ${b.ti.A}/5 A da contagem`);tx+=w+S(12);}}
        else{box(u.h,u.ref,'#E2E6E9');const n=u.items.length,slot=Wc/Math.max(2,n);
          u.items.forEach((p,k)=>{const w=Math.min(S(p[0]),slot*0.85),hh=Math.min(S(p[1]-40),h-S(70)),px=X+slot*k+(slot-w)/2,py=y+S(30);
            R(px-S(10),py-S(8),w+S(20),hh+S(16),'#C9CED2','#777',0.4); /* platina */
            if(u.kind==='corte'){R(px,py,w,hh,'#F4F5F6','#222',0.7);R(px,py+hh*0.72,w,hh*0.28,'#D5D9DD','#444',0.4);R(px+w*0.12,py+hh*0.38,w*0.76,hh*0.1,'#111','#000',0.5);
              o.push(`<circle cx="${f1(px+w/2)}" cy="${f1(py+hh*0.43)}" r="${f1(Math.max(2.5,Math.min(w,hh)*0.16))}" fill="#1A1A1A" stroke="#000" stroke-width="0.5"/>`);}
            else{R(px,py,w,hh,'#F4F5F6','#222',0.7);R(px,py,w,hh*0.14,'#4A4F55','#222',0.4);R(px,py+hh*0.86,w,hh*0.14,'#4A4F55','#222',0.4);
              R(px+w*0.36,py+hh*0.32,w*0.28,hh*0.2,'#1A1A1A','#000',0.4);R(px+w*0.14,py+hh*0.58,w*0.72,hh*0.1,'#D5D9DD','#666',0.3);}
            T(px+w/2,py-S(12),p.tag||'',fsz);tip((p.tag||'')+' · '+(p.txt||''));});}
        y+=h;});
      box(top+extra-extra/2,end);
      cx+=Wc;});
    /* montantes univers nos lados e entre colunas */
    const post=x=>{R(x-S(9),y0+S(30),S(18),H-S(60),'#EFE8D2','#8A8266',0.5);for(let yy=y0+S(60);yy<y0+H-S(40);yy+=S(75))R(x-S(7),yy,S(14),S(18),'#D8CCA8','#8A8266',0.4);};
    let px=x0+S(50);post(px-S(4));cols.forEach(cw=>{px+=S(cw);post(px+(px>x0+W-S(60)?S(4):0));});
  }
  /* cotas, como nos desenhos Hager: linhas de chamada longas e setas cheias */
  const dy=y0+H+30,dx=x0+W+20,xr=x0+W,yb=y0+H;
  o.push(`<g stroke="${INK}" stroke-width="0.6" fill="${INK}"><line x1="${x0}" y1="${f1(yb)}" x2="${x0}" y2="${dy+6}"/><line x1="${f1(xr)}" y1="${f1(yb)}" x2="${f1(xr)}" y2="${dy+6}"/>
    <line x1="${x0}" y1="${dy}" x2="${f1(xr)}" y2="${dy}"/><path d="M${x0} ${dy}l9 -3v6z M${f1(xr)} ${dy}l-9 -3v6z"/>
    <line x1="${f1(xr)}" y1="${y0}" x2="${dx+6}" y2="${y0}"/><line x1="${f1(xr)}" y1="${f1(yb)}" x2="${dx+6}" y2="${f1(yb)}"/>
    <line x1="${dx}" y1="${y0}" x2="${dx}" y2="${f1(yb)}"/><path d="M${dx} ${y0}l-3 9h6z M${dx} ${f1(yb)}l-3 -9h6z"/></g>`);
  o.push(`<rect x="${f1(x0+W/2-26)}" y="${dy-8}" width="52" height="16" fill="#fff"/>`);T(x0+W/2,dy+4,`${e.W} mm`,11,'middle',INK,' letter-spacing="0.6"');
  o.push(`<rect x="${dx-8}" y="${f1(y0+H/2-26)}" width="16" height="52" fill="#fff"/>`);T(dx,y0+H/2+4,`${e.H} mm`,11,'middle',INK,` letter-spacing="0.6" transform="rotate(-90 ${dx} ${f1(y0+H/2)})"`);
  const tw=Math.ceil(x0+W+34),th=Math.ceil(dy+14);
  return `<svg viewBox="0 0 ${tw} ${th}" width="${tw}" height="${th}" font-family="'Arial Narrow', Arial, sans-serif" role="img" aria-label="Frente do quadro ${esc(e.ref)}">${o.join('')}</svg>`;
}
/* unidade univers do corte geral: UK21A3 (x160) até 160 A, UK21S1 (HA 250 A) até 250 A; acima, unidade a.450 (referência a escolher) */
const Q_CORTE=p=>{const In=+(String(p.txt||'').match(/(\d+) A/)||[0,0])[1];return In<=160?'UK21A3':In<=250?'UK21S1':'UK31 (corte '+In+' A)';};
const DIFL=['Fácil','Normal','Exigente','Difícil','Muito difícil','Muito difícil'];
function renderBoards(R){
  /* o quadro do cliente (existente) não é nosso: não tem cartão. O disjuntor de interligação que lá fica (sem quadro de interligação) vem à parte. */
  const all=quadros().map(n=>boardFor(n,R)).filter(Boolean),bs=all.filter(b=>!b.isEnd);
  const cli=all.filter(b=>b.isEnd).flatMap(b=>b.devs.filter(d=>d.from&&(qfvParts(d.from,R)||{}).role!=='INT'));
  $('#boards').innerHTML=bs.map(b=>{const e=b.best;
    return `<div class="board"><div class="panel-head"><div><h3 class="bname">${esc(b.node)}</h3>
      <span class="hint">${b.ins.length} entrada${b.ins.length===1?'':'s'} · ${fmt(b.Ib,0)} A${b.out?` · sai para ${esc(b.out.ref.dest)}`:''}</span></div>
      <span class="pill ${b.dif>=3?'bad':b.dif>=1?'warn':'ok'}">Trabalho do cabo: ${DIFL[b.dif]}</span></div>
      <div class="bgrid"><div class="bsk">${e?boardSVG(b):''}<p class="bdim">${e?`<b>${e.H} × ${e.W} × ${e.Pf} mm</b> (a × l × p)<span class="sub">Hager Orion plus ${e.ref}${INDUS[e.ref]?` · ${eur0(INDUS[e.ref][1])} líq.`:''}</span>`:'<b>Armário de chão</b><span class="sub">Não cabe num quadro de parede: aparelhagem ou cabos grandes demais.</span>'}</p></div>
      <div class="bcol"><h3>Aparelhagem</h3><table class="bom"><tbody>${b.devs.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.txt)}${d.dif?`<span class="sub">${esc(d.dif)}</span>`:''}</td></tr>`).join('')}</tbody></table>
      <h3>Cabos a ligar</h3><table class="bom"><thead><tr><th>Circuito</th><th>Cabo</th><th class="r">Ø aprox.</th><th class="r">Raio mín.</th><th class="r">Condutores</th></tr></thead><tbody>${b.cables.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.cabo)}</td><td class="n r">${x.D} mm</td><td class="n r">${x.r} mm</td><td class="n r">${x.nCond}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Zona livre por baixo da aparelhagem: <b>${b.zone} mm</b> (maior raio de curvatura + terminal). Bucins: ${Math.round(b.glandW)} mm de largura${e?` em ${e.gRows} fila${e.gRows===1?'':'s'}`:''}.${e?` ${b.mod} módulos com 30% de reserva.`:''}</p>
      ${b.notes.length?`<ul class="bnotes">${b.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div></div>
      ${(P=>P?`<div class="bind"><h3>Componentes e montagem <span class="hint">como a Indusmelec orçamenta (orçamentos 2026)</span></h3>${indusTable(P)}${P.notes.length?`<ul class="bnotes">${P.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div>`:'')(indusParts(b.node,R))}</div>`;}).join('')
    +(cli.length?`<div class="board"><div class="panel-head"><div><h3 class="bname">Disjuntor de interligação · no quadro do cliente</h3><span class="hint">Sem quadro de interligação, o disjuntor de interligação instala-se no quadro do cliente (existente, fora do nosso fornecimento). Já está no custo das proteções.</span></div></div>
      <div class="bcol"><table class="bom"><tbody>${cli.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.txt)}${d.dif?`<span class="sub">${esc(d.dif)}</span>`:''}</td></tr>`).join('')}</tbody></table></div></div>`:'')
    ||'<p class="hint">Liga inversores a um quadro para ver a sugestão.</p>';
}
HOOKS.push(R=>{if(TAB==='brd')renderBoards(R);});
