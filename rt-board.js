/* ---------- sugestão de quadro: dimensões da envolvente e espaço para trabalhar o cabo ---------- */
/* secção máx. aproximada que o borne do aparelho aceita (mm², por condutor) */
const BORNE=b=>!b?95:/^S20/.test(b.s)?35:/^S80/.test(b.s)?95:/^XT1/.test(b.s)?95:/^XT3/.test(b.s)?185:/^XT5/.test(b.s)?240:400;
/* envolventes Hager Orion plus: [ref, alt., larg., prof., só modular] */
const ORION=[['FL213B',500,400,200,1],['FL216B',650,400,200,1],['FL221B',650,500,250,1],['FL229B',800,600,300,1],['FL126A',950,600,300,1],['FL128A',950,800,300,1],['FL130A',1250,800,300,1],
  ['FL300B',550,600,300,0],['FL301B',850,600,300,0],['FL302B',1150,600,300,0],['FL342B',1450,600,300,0],['FL344B',1750,600,300,0],['FL348B',2050,600,300,0],
  ['FL305B',550,850,300,0],['FL306B',850,850,300,0],['FL307B',1150,850,300,0],['FL352B',1450,850,300,0],['FL354B',1750,850,300,0],['FL358B',2050,850,300,0],
  ['FL310B',550,1100,300,0],['FL311B',850,1100,300,0],['FL312B',1150,1100,300,0],['FL362B',1450,1100,300,0],['FL364B',1750,1100,300,0],['FL368B',2050,1100,300,0]];
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
    if(outs.length>1){const ti=TIS.find(x=>x>=Math.max(...outs.map(c=>c.res.In)))||100;return {type:'indireta',name:'Honeywell AS3500 (indireta)',ti,perCircuit:true};}return m;};
  const aux=feeders.some(f=>f.rele&&f.c.kind==='inv');
  if(role==='CONT')return {node,gw:null,existing:false,feeders,out,corte:null,meter:meterFor({p:kW,res:{In:out.res.In}}),meterIn:true,dst:null,aux:false,role};
  /* QFV antes de um gateway: cada inversor segue no seu cabo até à entrada do gateway; não há corte geral nem barramento comum */
  if(outs.every(c=>c.split))return {node,gw:null,existing:false,feeders,out,outs,split:true,corte:null,meter:mk(),dst:{brk:null,per:true},aux:false,role};
  const corteIn=SECCI.find(x=>x>=out.res.In)||out.res.In;
  return {node,gw:null,existing:false,feeders,out,corte:{In:corteIn},meter:mk(),dst:{brk:corteIn>125?100:null},aux,role};
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
  const addMod=(n,kind,tag,txt,poles)=>{if(!n)return;mod+=n;mitems.push({n,kind,tag,txt,poles});};
  const addPlate=(pl,kind,tag,txt)=>{const a=pl.slice();a.tag=tag;a.kind=kind;a.txt=txt;plates.push(a);};
  /* saída/disjuntor: modular (bloco DIN) ou caixa moldada (platina + relé diferencial de 4 módulos) */
  const addBrk=(b,P,sp,label)=>{const tag=tg('Q');if(sp.plate){addPlate(sp.plate,'mccb',tag,b?b.name:label);addMod(sp.mod,'rele',tg('K'),'relé diferencial');}else addMod(sp.mod,'brk',tag,b?b.name:label,P);};
  ins.forEach(c=>{const o=c.res,b=o.brk,P=c.loaded===2?2:4;const sp=devSpace(b,P);addBrk(b,P,sp,c.nome);
    devs.push({nome:c.kind==='inv'?`${c.nome} (${c.modelo})`:c.nome,txt:`${o.In} A ${P}P${b?' · '+b.name:''}`,dif:b&&b.dif?b.dif.name.replace(' + bobina de abertura',''):'',from:c.kind==='perc'?c.ref.orig.trim():null});});
  let InSum=ins.reduce((a,c)=>a+c.res.In,0);
  const Q=qfvParts(node,R);
  /* disjuntor de interligação: no quadro de interligação, se existir; senão fica no quadro do cliente (existente, não é nosso) */
  if(Q&&Q.role==='INT'&&Q.out&&!percFrom(Q.out.ref.dest)){const c=Q.out,o=c.res,b=o.brk,P=c.loaded===2?2:4,sp=devSpace(b,P);addBrk(b,P,sp,'interligação');InSum+=o.In;
    devs.push({nome:'Disjuntor de interligação',txt:`${c.nome} · ${o.In} A ${P}P${b?' · '+b.name:''}`,dif:b&&b.dif?b.dif.name.replace(' + bobina de abertura',''):''});}
  if(Q&&Q.meter&&!Q.corte)devs.unshift({nome:Q.meterIn?'Contador':'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A${Q.meter.perCircuit?' em cada circuito':''}`:Q.meter.name,dif:Q.meterIn?'':'em quadro de contagem próprio'});
  if(Q&&Q.split){devs.push({nome:'Proteção contra sobretensões',txt:`${Q.feeders.length} × DST tipo 2 (um por circuito)`,dif:'cada inversor segue no seu cabo até ao gateway'});addMod(4*Q.feeders.length,'dst',tg('L'),'DST tipo 2');
    const rl=relays(Q.feeders);if(rl.nCen){devs.push({nome:'Relés diferenciais',txt:`${rl.nCen} × unidade central diferencial 4 E/S (CBS-4)`,dif:`${rl.cen} toroide${rl.cen===1?'':'s'} WGC, um por caixa moldada`});addMod(6*rl.nCen,'rele',tg('K'),'unidade central diferencial 4 E/S');}if(rl.n){devs.push({nome:'Alimentação dos relés',txt:`${rl.n} × fusível 2 A`,dif:''});addMod(2*rl.n,'fus',tg('F'),'fusível 2 A');}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});addMod(6,'aux',tg('Q'),'serviços auxiliares');}}
  if(Q&&Q.corte){const s=SECCB.find(x=>x[0]>=Q.corte.In);devs.unshift({nome:'Corte geral',txt:`interruptor de corte ${Q.corte.In} A 4P`,dif:''});
    if(s){addMod(s[1],'corte','S1','interruptor de corte '+Q.corte.In+' A',4);if(s[2])addPlate(s[2],'corte','S1','interruptor de corte '+Q.corte.In+' A');}else addPlate([300,450],'corte','S1','interruptor de corte '+Q.corte.In+' A');
    if(Q.meter)devs.splice(1,0,{nome:'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A`:Q.meter.name,dif:'em quadro de contagem próprio'});
    devs.push({nome:'Proteção contra sobretensões',txt:'DST tipo 2, 230/400 V, 3F+N',dif:Q.dst.brk?`protegido por disjuntor S800P 3P ${Q.dst.brk} A`:'protegido pelo corte geral'});addMod(4,'dst',tg('L'),'DST tipo 2');
    if(Q.dst.brk)addMod(4.5,'brk',tg('Q'),'S800P 3P '+Q.dst.brk+' A',3);
    const rl=relays(Q.feeders);if(rl.nCen){devs.push({nome:'Relés diferenciais',txt:`${rl.nCen} × unidade central diferencial 4 E/S (CBS-4)`,dif:`${rl.cen} toroide${rl.cen===1?'':'s'} WGC, um por caixa moldada`});addMod(6*rl.nCen,'rele',tg('K'),'unidade central diferencial 4 E/S');}if(rl.n){devs.push({nome:'Alimentação dos relés',txt:`${rl.n} × fusível 2 A`,dif:''});addMod(2*rl.n,'fus',tg('F'),'fusível 2 A');}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});addMod(6,'aux',tg('Q'),'serviços auxiliares');}
    if(pintNode(R)===node){devs.push({nome:'Proteção de interface',txt:'relé de proteção de interface (desacoplamento), atuando no corte geral por bobina ou contactor',dif:'a especificar conforme as condições de ligação do operador de rede'});addMod(8,'int',tg('K'),'proteção de interface');
      notes.add(`Proteção de interface: instalação com ${fmt(R.Ptot,1)} kW ≥ ${fs(S.pint)} kW (limite indicado nos Critérios).`);}
    if(false)notes.add(`Sem quadro de interligação: a contagem (${meterFor(Q.out).name}${meterFor(Q.out).ti?` com TI ${meterFor(Q.out).ti}/5 A`:''}) e a proteção de interligação ficam no quadro do cliente.`);
    if(Q.meter&&!Q.meterIn)notes.add(`Contagem num quadro de contagem próprio, junto à entrada: ${Q.meter.name}${Q.meter.ti?` com TI ${Q.meter.ti}/5 A${Q.meter.perCircuit?' em cada circuito':''}`:''}.`);
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
  const zone=Math.max(200,rMax+100); /* espaço livre por baixo da aparelhagem: raio de curvatura + terminal */
  const glandW=cables.reduce((a,x)=>a+x.nCond*(x.D+15),0);
  let best=null;
  for(const [ref,H,W,Pf,onlyMod] of ORION){
    if(onlyMod&&plates.length)continue;const use=W-100;if(plates.some(p=>p[0]>use))continue;
    const rows=[];plates.slice().sort((a,b)=>b[1]-a[1]).forEach(p=>{const r=rows.find(r=>r.w+p[0]+20<=use);if(r){r.items.push(p);r.w+=p[0]+20;r.h=Math.max(r.h,p[1]);}else rows.push({w:p[0],h:p[1],items:[p]});});
    const mpr=Math.floor(use/18),mrows=Math.ceil(mod*1.3/mpr);
    const hDev=rows.reduce((a,r)=>a+r.h,0)+mrows*150;
    const gRows=Math.ceil(glandW/use),gMax=Pf>=300?(Dmax<=35?3:2):(Dmax<=20?2:1);
    if(gRows>gMax)continue;
    if(H<hDev+zone+80)continue;
    const area=H*W;if(!best||area<best.area)best={ref,H,W,Pf,area,rows,mrows,mpr,hDev,gRows};}
  const dif=(rMax>=300?2:0)+(cables.some(x=>x.mat==='Al'&&x.s>=150)?1:0)+(cables.some(x=>!x.multi&&x.n>=2)?1:0)+(cables.some(x=>x.s>x.cap)?1:0);
  return {node,ins,out,devs,cables,notes:[...notes],mod,plates,mitems,bus:plates.some(p=>p.kind==='mccb')?'cu':(ins.length>1||InSum>63?'td':null),zone,rMax,glandW,best,dif,Ib:ins.reduce((a,c)=>a+(c.kind==='inv'&&c.fases===1?c.Ib/3:c.Ib),0),isEnd:!out};
}
/* desenho da frente do quadro, no estilo dos desenhos do configurador Hager: envolvente com montantes, calhas DIN com os aparelhos
   (etiquetas Q/S/L/K/F), aparelhos de platina, barramento 3F+N em cobre (quadros com caixas moldadas) ou repartidor TD 125 A,
   zona de cabos e cotas. Escala aproximada: a envolvente e os aparelhos seguem as dimensões usadas no dimensionamento. */
const BSK_ORDER=['corte','dst','brk','rele','fus','aux','int'];
function boardSVG(b){
  const e=b.best;if(!e)return '';
  const sc=Math.min(330/e.W,470/e.H),W=e.W*sc,H=e.H*sc,x0=14,y0=40,S=v=>v*sc,o=[];
  const fsz=Math.max(7,Math.min(10,sc*26)),f1=v=>v.toFixed(1);
  const T=(x,y,s,sz=fsz,a='middle',fill='#1A2028',extra='')=>o.push(`<text x="${f1(x)}" y="${f1(y)}" font-size="${sz}" text-anchor="${a}" fill="${fill}"${extra}>${esc(s)}</text>`);
  const R=(x,y,w,h,fill,stroke='#222',sw=0.8,extra='')=>o.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0.5,w))}" height="${f1(Math.max(0.5,h))}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`);
  const tip=s=>o.push(`<title>${esc(s)}</title>`);
  T(x0+W/2,y0-16,e.ref,15,'middle','#1A2028',' font-weight="600"');
  /* envolvente, placa de montagem e montantes */
  R(x0,y0,W,H,'#E3E7EA','#59636D',1.4,' rx="2"');R(x0+S(12),y0+S(12),W-S(24),H-S(24),'#D2D8DC','#333',0.7);
  [x0+S(14),x0+W-S(50)].forEach(x=>{R(x,y0+S(14),S(36),H-S(28),'#F5B800','#A87800',0.7);
    for(let y=y0+S(40);y<y0+H-S(30);y+=S(45))o.push(`<circle cx="${f1(x+S(18))}" cy="${f1(y)}" r="${f1(Math.max(0.8,S(5)))}" fill="#fff" stroke="#8A6200" stroke-width="0.4"/>`);});
  const cx0=x0+S(50),cx1=x0+W-S(50);
  /* aparelhos de platina (caixas moldadas e interruptores grandes), por fila, com o barramento de cobre por trás */
  let y=y0+S(40);
  e.rows.forEach(r=>{
    if(r.items.some(p=>p.kind==='mccb')){const by=y+S(14);R(cx0,by,cx1-cx0,S(36),'#C98A4B','#7A4A1C',0.6);
      for(let k=1;k<4;k++)o.push(`<line x1="${f1(cx0)}" x2="${f1(cx1)}" y1="${f1(by+S(36)*k/4)}" y2="${f1(by+S(36)*k/4)}" stroke="#7A4A1C" stroke-width="0.4"/>`);}
    let x=cx0;
    r.items.forEach(p=>{const w=S(p[0]),h=S(p[1]-20);
      if(p.kind==='corte'){R(x,y,w,h,'#F1F2F3','#222',0.9);R(x,y+h*0.62,w,h*0.38,'#4A4F55','#222',0.6);R(x+w*0.1,y+h*0.2,w*0.66,Math.max(2,h*0.1),'#111','#000',0.6);
        o.push(`<circle cx="${f1(x+w*0.3)}" cy="${f1(y+h*0.25)}" r="${f1(Math.max(2,w*0.14))}" fill="#C0392B" stroke="#111" stroke-width="0.6"/>`);}
      else{R(x,y,w,h,'#F4F5F6','#222',0.9);R(x,y,w,h*0.13,'#4A4F55','#222',0.5);R(x,y+h*0.87,w,h*0.13,'#4A4F55','#222',0.5);
        R(x+w*0.34,y+h*0.34,w*0.32,h*0.15,'#111','#000',0.5);R(x+w*0.12,y+h*0.58,w*0.76,h*0.1,'#D5D9DD','#666',0.4);}
      T(x+w/2,y-3,p.tag||'',fsz);tip((p.tag||'')+' · '+(p.txt||''));x+=w+S(20);});
    y+=S(r.h);});
  /* aparelhos modulares nas calhas DIN, por fila (30 % de reserva no dimensionamento) */
  const its=b.mitems.slice().sort((a,c)=>BSK_ORDER.indexOf(a.kind)-BSK_ORDER.indexOf(c.kind));
  const mpr=e.mpr,rowsM=[];let cur=null;
  its.forEach(it=>{if(!cur||cur.n+it.n>mpr+1e-9){cur={n:0,items:[]};rowsM.push(cur);}cur.items.push(it);cur.n+=it.n;});
  rowsM.forEach((row,ri)=>{const ry=y+ri*S(150);
    R(cx0,ry+S(55),cx1-cx0,S(26),'#DAD0B0','#8A8266',0.5);
    let x=cx0;
    row.items.forEach(it=>{const w=S(it.n*18),h=S(90),yy=ry+S(22);
      R(x,yy,w,h,it.kind==='int'?'#EADFC4':'#F4F5F6','#222',0.8);R(x,yy,w,h*0.14,'#4A4F55','#222',0.4);
      if(it.kind==='corte')R(x+w*0.1,yy+h*0.3,w*0.8,h*0.14,'#111','#000',0.4);
      else if(it.kind==='brk'){const k=Math.max(1,Math.min(it.poles||4,Math.floor(it.n)));for(let j=0;j<k;j++)R(x+w*(j+0.25)/k,yy+h*0.3,w*0.5/k,h*0.22,'#111','#000',0.3);}
      else if(it.kind==='dst'){for(let j=0;j<4;j++)R(x+w*(j+0.2)/4,yy+h*0.32,w*0.6/4,h*0.2,'#2DB327','#1E7A19',0.3);}
      else if(it.kind==='rele')R(x+w*0.15,yy+h*0.25,w*0.7,h*0.3,'#BCE0E8','#4A6B73',0.4);
      else if(it.kind==='fus')R(x+w*0.2,yy+h*0.3,w*0.6,h*0.4,'#E8E0C8','#6B6350',0.4);
      T(x+w/2,yy-3,it.tag||'',Math.max(6.5,fsz-1));tip((it.tag||'')+' · '+(it.txt||''));x+=w;});
    /* repartidor TD 125 A no que sobrar da última fila (quadros modulares com várias saídas) */
    if(ri===rowsM.length-1&&b.bus==='td'&&mpr-row.n>=6.5){const w=S(6*18),tx=x+S(18);R(tx,ry+S(22),w,S(90),'#3B4249','#111',0.8);
      for(let j=0;j<4;j++)R(tx+w*(j+0.2)/4,ry+S(82),w*0.14,S(14),'#C98A4B','#7A4A1C',0.3);T(tx+w/2,ry+S(19),'TD 125 A',Math.max(6.5,fsz-1));tip('repartidor tetrapolar TD 125 A');}});
  /* zona de cabos por baixo da aparelhagem e raio de curvatura do maior cabo */
  const zt=y0+H-S(b.zone+40);
  o.push(`<rect x="${f1(x0+S(14))}" y="${f1(zt)}" width="${f1(W-S(28))}" height="${f1(S(b.zone))}" fill="rgba(169,99,0,.06)" stroke="#A96300" stroke-dasharray="4 3" stroke-width="0.8"/>`);
  const rad=Math.min(b.rMax*sc,W/2-12,S(b.zone)-10),ax=x0+S(60);
  o.push(`<path d="M${f1(ax)} ${f1(y0+H-S(14))} L${f1(ax)} ${f1(zt+rad+4)} A${f1(rad)} ${f1(rad)} 0 0 1 ${f1(ax+rad)} ${f1(zt+4)}" fill="none" stroke="#1E8A19" stroke-width="2.4"/>`);
  T(x0+W/2,zt+S(b.zone)-4,`zona de cabos ${b.zone} mm`,8,'middle','#A96300');
  /* cotas */
  const dy=y0+H+16,dx=x0+W+16,xr=x0+W,yb=y0+H;
  o.push(`<g stroke="#1A2028" stroke-width="0.8" fill="#1A2028"><line x1="${x0}" y1="${f1(yb)}" x2="${x0}" y2="${dy+6}"/><line x1="${f1(xr)}" y1="${f1(yb)}" x2="${f1(xr)}" y2="${dy+6}"/>
    <line x1="${x0}" y1="${dy}" x2="${f1(xr)}" y2="${dy}"/><path d="M${x0} ${dy}l7 -3v6z M${f1(xr)} ${dy}l-7 -3v6z"/>
    <line x1="${f1(xr)}" y1="${y0}" x2="${dx+6}" y2="${y0}"/><line x1="${f1(xr)}" y1="${f1(yb)}" x2="${dx+6}" y2="${f1(yb)}"/>
    <line x1="${dx}" y1="${y0}" x2="${dx}" y2="${f1(yb)}"/><path d="M${dx} ${y0}l-3 7h6z M${dx} ${f1(yb)}l-3 -7h6z"/></g>`);
  o.push(`<rect x="${f1(x0+W/2-26)}" y="${dy-8}" width="52" height="16" fill="#fff"/>`);T(x0+W/2,dy+4,`${e.W} mm`,11);
  o.push(`<rect x="${dx-8}" y="${f1(y0+H/2-26)}" width="16" height="52" fill="#fff"/>`);T(dx,y0+H/2+4,`${e.H} mm`,11,'middle','#1A2028',` transform="rotate(-90 ${dx} ${f1(y0+H/2)})"`);
  const tw=Math.ceil(x0+W+34),th=Math.ceil(dy+14);
  return `<svg viewBox="0 0 ${tw} ${th}" width="${tw}" height="${th}" font-family="Arial, sans-serif" role="img" aria-label="Frente do quadro ${esc(e.ref)}">${o.join('')}</svg>`;
}
const DIFL=['Fácil','Normal','Exigente','Difícil','Muito difícil','Muito difícil'];
function renderBoards(R){
  /* o quadro do cliente (existente) não é nosso: não tem cartão. O disjuntor de interligação que lá fica (sem quadro de interligação) vem à parte. */
  const all=quadros().map(n=>boardFor(n,R)).filter(Boolean),bs=all.filter(b=>!b.isEnd);
  const cli=all.filter(b=>b.isEnd).flatMap(b=>b.devs.filter(d=>d.from&&(qfvParts(d.from,R)||{}).role!=='INT'));
  $('#boards').innerHTML=bs.map(b=>{const e=b.best;
    return `<div class="board"><div class="panel-head"><div><h3 class="bname">${esc(b.node)}</h3>
      <span class="hint">${b.ins.length} entrada${b.ins.length===1?'':'s'} · ${fmt(b.Ib,0)} A${b.out?` · sai para ${esc(b.out.ref.dest)}`:''}</span></div>
      <span class="pill ${b.dif>=3?'bad':b.dif>=1?'warn':'ok'}">Trabalho do cabo: ${DIFL[b.dif]}</span></div>
      <div class="bgrid"><div class="bsk">${e?boardSVG(b):''}<p class="bdim">${e?`<b>${e.H} × ${e.W} × ${e.Pf} mm</b> (a × l × p)<span class="sub">Hager Orion plus ${e.ref}${INDUS[e.ref]?` · PVP ${eur0(INDUS[e.ref][1])}`:''}</span>`:'<b>Armário de chão</b><span class="sub">Não cabe num quadro de parede: aparelhagem ou cabos grandes demais.</span>'}</p></div>
      <div class="bcol"><h3>Aparelhagem</h3><table class="bom"><tbody>${b.devs.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.txt)}${d.dif?`<span class="sub">${esc(d.dif)}</span>`:''}</td></tr>`).join('')}</tbody></table>
      <h3>Cabos a ligar</h3><table class="bom"><thead><tr><th>Circuito</th><th>Cabo</th><th class="r">Ø aprox.</th><th class="r">Raio mín.</th><th class="r">Condutores</th></tr></thead><tbody>${b.cables.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.cabo)}</td><td class="n r">${x.D} mm</td><td class="n r">${x.r} mm</td><td class="n r">${x.nCond}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Zona livre por baixo da aparelhagem: <b>${b.zone} mm</b> (maior raio de curvatura + terminal). Bucins: ${Math.round(b.glandW)} mm de largura${e?` em ${e.gRows} fila${e.gRows===1?'':'s'}`:''}.${e?` ${b.mod} módulos com 30% de reserva.`:''}</p>
      ${b.notes.length?`<ul class="bnotes">${b.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div></div>
      ${(P=>P?`<div class="bind"><h3>Componentes e montagem <span class="hint">como a Indusmelec orçamenta (2025–2026)</span></h3>${indusTable(P)}${P.notes.length?`<ul class="bnotes">${P.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div>`:'')(indusParts(b.node,R))}</div>`;}).join('')
    +(cli.length?`<div class="board"><div class="panel-head"><div><h3 class="bname">Disjuntor de interligação · no quadro do cliente</h3><span class="hint">Sem quadro de interligação, o disjuntor de interligação instala-se no quadro do cliente (existente, fora do nosso fornecimento). Já está no custo das proteções.</span></div></div>
      <div class="bcol"><table class="bom"><tbody>${cli.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.txt)}${d.dif?`<span class="sub">${esc(d.dif)}</span>`:''}</td></tr>`).join('')}</tbody></table></div></div>`:'')
    ||'<p class="hint">Liga inversores a um quadro para ver a sugestão.</p>';
}
HOOKS.push(R=>{if(TAB==='brd')renderBoards(R);});
