/* ---------- sugestão de quadro: dimensões da envolvente e espaço para trabalhar o cabo ---------- */
/* diâmetro exterior aproximado (mm) de cabos 0,6/1 kV XLPE: monocondutor e multicondutor 5G/3G */
const DMONO={1.5:6,2.5:7,4:8,6:8.5,10:9.5,16:10.5,25:12,35:13,50:14.5,70:16.5,95:18.5,120:20,150:22,185:24.5,240:27.5,300:30.5};
const DMULTI={1.5:11,2.5:12.5,4:14,6:15.5,10:18.5,16:21,25:25,35:28,50:32,70:37,95:42};
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
   + DST tipo 2 (com porta-fusíveis gG acima de 125 A) + serviços auxiliares nos quadros com relés + barra de terra.
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
  if(outs.every(c=>c.split))return {node,gw:null,existing:false,feeders,out,outs,split:true,corte:null,meter:mk(),dst:{fus:null,per:true},aux:false,role};
  const corteIn=SECCI.find(x=>x>=out.res.In)||out.res.In;
  return {node,gw:null,existing:false,feeders,out,corte:{In:corteIn},meter:mk(),dst:{fus:corteIn>125?125:null},aux,role};
}
function boardFor(node,R){
  if(gwOf(node))return null;
  const ins=R.invC.filter(c=>c.para===node&&c.res).concat(R.pC.filter(c=>c.ref.dest.trim()===node&&c.res));
  if(!ins.length)return null;
  const out=R.pC.find(c=>c.ref.orig.trim()===node&&c.res);
  const devs=[],cables=[],notes=new Set();let mod=0;const plates=[];
  ins.forEach(c=>{const o=c.res,b=o.brk,P=c.loaded===2?2:4;const sp=devSpace(b,P);mod+=sp.mod;if(sp.plate)plates.push(sp.plate);
    devs.push({nome:c.kind==='inv'?`${c.nome} (${c.modelo})`:c.nome,txt:`${o.In} A ${P}P${b?' · '+b.name:''}`,dif:b&&b.dif?b.dif.name.replace(' + bobina de abertura',''):''});});
  let InSum=ins.reduce((a,c)=>a+c.res.In,0);
  const Q=qfvParts(node,R);
  if(Q&&Q.meter&&!Q.corte)devs.unshift({nome:Q.meterIn?'Contador':'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A${Q.meter.perCircuit?' em cada circuito':''}`:Q.meter.name,dif:Q.meterIn?'':'em quadro de contagem próprio'});
  if(Q&&Q.split){devs.push({nome:'Proteção contra sobretensões',txt:`${Q.feeders.length} × DST tipo 2 (um por circuito)`,dif:'cada inversor segue no seu cabo até ao gateway'});mod+=4*Q.feeders.length;
    const nr=Q.feeders.filter(f=>f.rele).length;if(nr){devs.push({nome:'Alimentação dos relés',txt:`${nr} × fusível 2 A`,dif:''});mod+=nr;}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});mod+=6;}}
  if(Q&&Q.corte){const s=SECCB.find(x=>x[0]>=Q.corte.In);devs.unshift({nome:'Corte geral',txt:`interruptor de corte ${Q.corte.In} A 4P`,dif:''});
    if(s){mod+=s[1];if(s[2])plates.push(s[2]);}else plates.push([300,450]);
    if(Q.meter)devs.splice(1,0,{nome:'Contagem',txt:Q.meter.type==='indireta'?`${Q.meter.name} com TI ${Q.meter.ti}/5 A`:Q.meter.name,dif:'em quadro de contagem próprio'});
    devs.push({nome:'Proteção contra sobretensões',txt:'DST tipo 2, 230/400 V, 3F+N',dif:Q.dst.fus?`porta-fusíveis 3F+N com fusíveis gG ${Q.dst.fus} A`:'protegido pelo corte geral'});mod+=4;
    if(Q.dst.fus)plates.push([130,150]);
    const nr=Q.feeders.filter(f=>f.rele).length;
    if(nr){devs.push({nome:'Alimentação dos relés',txt:`${nr} × fusível 2 A`,dif:''});mod+=nr;}
    if(Q.aux){devs.push({nome:'Serviços auxiliares',txt:'diferencial 25 A 300 mA + disjuntores 16 A e 10 A',dif:''});mod+=6;}
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
  return {node,ins,out,devs,cables,notes:[...notes],mod,plates,zone,rMax,glandW,best,dif,Ib:ins.reduce((a,c)=>a+(c.kind==='inv'&&c.fases===1?c.Ib/3:c.Ib),0),isEnd:!out};
}
function boardSVG(b){
  const e=b.best;if(!e)return '';
  const sc=Math.min(240/e.W,300/e.H),W=e.W*sc,H=e.H*sc,x0=10,y0=10;const o=[];
  o.push(`<rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="4" fill="#fff" stroke="#1A2028" stroke-width="1.5"/>`);
  let y=y0+40*sc;
  e.rows.forEach(r=>{let x=x0+50*sc;r.items.forEach(p=>{o.push(`<rect x="${x}" y="${y}" width="${p[0]*sc}" height="${(p[1]-20)*sc}" fill="#EEF2F5" stroke="#5A6672"/>`);x+=(p[0]+20)*sc;});y+=r.h*sc;});
  for(let i=0;i<e.mrows;i++){o.push(`<rect x="${x0+50*sc}" y="${y+40*sc}" width="${(e.W-100)*sc}" height="${70*sc}" fill="rgba(56,212,48,.15)" stroke="#2DB327"/>`);y+=150*sc;}
  const zt=y0+H-(b.zone+40)*sc;
  o.push(`<rect x="${x0+6}" y="${zt}" width="${W-12}" height="${b.zone*sc}" fill="none" stroke="#A96300" stroke-dasharray="4 3"/>`);
  const r=Math.min(b.rMax*sc,W/2-12,b.zone*sc-10);o.push(`<path d="M${x0+20} ${y0+H} L${x0+20} ${zt+r+4} A${r} ${r} 0 0 1 ${x0+20+r} ${zt+4}" fill="none" stroke="#1E8A19" stroke-width="2.5"/>`);
  o.push(`<text x="${x0+W/2}" y="${zt+b.zone*sc+12}" font-size="9" text-anchor="middle" fill="#A96300">zona de cabos ${b.zone} mm</text>`);
  o.push(`<text x="${x0+W/2}" y="${y0+H+16}" font-size="10" text-anchor="middle" fill="#5A6672">${e.W} mm</text><text x="${x0+W+6}" y="${y0+H/2}" font-size="10" fill="#5A6672">${e.H} mm</text>`);
  return `<svg width="${W+60}" height="${H+26}" viewBox="0 0 ${W+60} ${H+26}" font-family="Arial, sans-serif" role="img" aria-label="Esboço da envolvente">${o.join('')}</svg>`;
}
const DIFL=['Fácil','Normal','Exigente','Difícil','Muito difícil','Muito difícil'];
function renderBoards(R){
  const bs=quadros().map(n=>boardFor(n,R)).filter(Boolean);
  $('#boards').innerHTML=bs.map(b=>{const e=b.best;
    return `<div class="board"><div class="panel-head"><div><h3 class="bname">${esc(b.node)}${b.isEnd?' · ponto de injeção':''}</h3>
      <span class="hint">${b.isEnd?'Quadro existente: confirma que tem este espaço livre para a chegada. ':''}${b.ins.length} entrada${b.ins.length===1?'':'s'} · ${fmt(b.Ib,0)} A${b.out?` · sai para ${esc(b.out.ref.dest)}`:''}</span></div>
      <span class="pill ${b.dif>=3?'bad':b.dif>=1?'warn':'ok'}">Trabalho do cabo: ${DIFL[b.dif]}</span></div>
      <div class="bgrid"><div class="bsk">${e?boardSVG(b):''}<p class="bdim">${e?`<b>${e.H} × ${e.W} × ${e.Pf} mm</b> (a × l × p)<span class="sub">Hager Orion plus ${e.ref} ou equivalente</span>`:'<b>Armário de chão</b><span class="sub">Não cabe numa Orion plus de parede: aparelhagem ou cabos grandes demais.</span>'}</p></div>
      <div class="bcol"><h3>Aparelhagem</h3><table class="bom"><tbody>${b.devs.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.txt)}${d.dif?`<span class="sub">${esc(d.dif)}</span>`:''}</td></tr>`).join('')}</tbody></table>
      <h3>Cabos a ligar</h3><table class="bom"><thead><tr><th>Circuito</th><th>Cabo</th><th class="r">Ø aprox.</th><th class="r">Raio mín.</th><th class="r">Condutores</th></tr></thead><tbody>${b.cables.map(x=>`<tr><td>${esc(x.nome)}</td><td>${esc(x.cabo)}</td><td class="n r">${x.D} mm</td><td class="n r">${x.r} mm</td><td class="n r">${x.nCond}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Zona livre por baixo da aparelhagem: <b>${b.zone} mm</b> (maior raio de curvatura + terminal). Bucins: ${Math.round(b.glandW)} mm de largura${e?` em ${e.gRows} fila${e.gRows===1?'':'s'}`:''}.${e?` ${b.mod} módulos com 30% de reserva.`:''}</p>
      ${b.notes.length?`<ul class="bnotes">${b.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div></div></div>`;}).join('')||'<p class="hint">Liga inversores a um quadro para ver a sugestão.</p>';
}
HOOKS.push(R=>{if(TAB==='brd')renderBoards(R);});
