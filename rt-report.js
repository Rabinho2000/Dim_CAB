/* ---------- relatório de cálculo em PDF (base da memória descritiva de licenciamento) ----------
   Texto vetorial com as fontes base do jsPDF: o Helvetica só tem Latin-1, por isso Δ, φ, ≤, → … saem na fonte Symbol
   e os índices (I₂, k₂) em tamanho menor. Usa solveAll() (rt-engine.js), verdict() (rt-app.js), sldSVG/svgToPng (rt-sld.js). */
const RSYM={'Δ':'D','φ':'f','≤':'£','≥':'³','→':'®','≈':'»','Ω':'W','√':'Ö','ρ':'r','−':'-','π':'p'};
/* larguras da fonte Symbol (AFM, /1000 em): as do jsPDF não correspondem ao que se desenha */
const RSW={'D':612,'f':521,'£':549,'³':549,'®':987,'»':549,'W':768,'Ö':549,'r':549,'-':549,'p':549};
const RSUB={'₀':'0','₁':'1','₂':'2','₃':'3'};
const LOGO='__LOGO__';
const RC={ink:[26,32,40],mut:[90,102,114],line:[214,220,226],acc:[56,212,48],accD:[30,138,25],red:[191,51,40],soft:[244,246,248],redS:[252,236,234]};
function reportPDF(R){
  const {jsPDF}=window.jspdf;const mk=()=>new jsPDF({unit:'mm',format:'a4',compress:true});const doc=mk();let pdf=doc,dry=false;
  const PW=210,PH=297,M=16,CW=PW-2*M,TOP=30,BOT=PH-16;let y=TOP;
  /* ----- texto com troca de fonte nos símbolos ----- */
  const runs=s=>{const out=[];for(const ch of String(s)){const k=RSYM[ch]!=null?'s':RSUB[ch]!=null?'i':'h',t=k==='s'?RSYM[ch]:k==='i'?RSUB[ch]:ch;
    const l=out[out.length-1];if(l&&l.k===k)l.t+=t;else out.push({k,t});}return out;};
  const setF=(k,o)=>{if(k==='s')pdf.setFont('symbol','normal');else pdf.setFont('helvetica',o.b?'bold':o.i?'italic':'normal');pdf.setFontSize(k==='i'?o.fs*0.72:o.fs);};
  const rw=(r,o)=>{setF(r.k,o);return r.k==='s'?[...r.t].reduce((a,ch)=>a+(RSW[ch]||600),0)/1000*o.fs/pdf.internal.scaleFactor:pdf.getTextWidth(r.t);};
  const width=(s,o)=>runs(s).reduce((a,r)=>a+rw(r,o),0);
  const T=(s,x,yy,o={})=>{o={fs:9,...o};const w=width(s,o);let cx=o.a==='r'?x-w:o.a==='c'?x-w/2:x;pdf.setTextColor(...(o.c||RC.ink));
    runs(s).forEach(r=>{const d=rw(r,o);pdf.text(r.t,cx,r.k==='i'?yy+o.fs*0.06:yy);cx+=d;});return w;};
  const wrap=(s,w,o)=>{o={fs:9,...o};const L=[];String(s).split('\n').forEach(par=>{let cur='';par.split(' ').forEach(wd=>{const t=cur?cur+' '+wd:wd;if(cur&&width(t,o)>w){L.push(cur);cur=wd;}else cur=t;});L.push(cur);});return L;};
  const lh=fsz=>fsz*0.42;
  const need=h=>{if(!dry&&y+h>BOT){pdf.addPage('a4','portrait');y=TOP;}};
  /* altura de um bloco: desenha-o num documento de rascunho */
  const measure=fn=>{const keep=[pdf,y];pdf=mk();y=0;dry=true;try{fn();}finally{dry=false;}const h=y;[pdf,y]=keep;return h;};
  const block=fn=>{const h=measure(fn);need(h);fn();};
  const para=(s,o={})=>{o={fs:9,...o};const x=o.x??M,w=o.w??CW;wrap(s,w,o).forEach(l=>{need(lh(o.fs));T(l,x,y+lh(o.fs)*0.8,o);y+=lh(o.fs);});};
  const h2=(s,more=0)=>{need(16+more);y+=4;pdf.setFillColor(...RC.acc);pdf.rect(M,y,1.4,5.2,'F');T(s,M+4,y+4.2,{fs:12.5,b:1});y+=9;};
  /* tabela de pares rótulo / valor; cada linha [rótulo, valor] ou [rótulo, valor, rótulo, valor] */
  const kv=(rows,o={})=>{const lw=o.lw||40,half=CW/2,fsz=8.6;
    rows.forEach((r,i)=>{const cells=r.length>2?[[r[0],r[1],M,half],[r[2],r[3],M+half,half]]:[[r[0],r[1],M,CW]];
      const ls=cells.map(([l,v,x,w])=>({l:wrap(l,lw-3,{fs:fsz,c:RC.mut}),v:wrap(v,w-lw-3,{fs:fsz,b:o.bold}),x}));
      const h=Math.max(...ls.map(c=>Math.max(c.l.length,c.v.length)))*lh(fsz)+2.4;need(h);
      if(i%2===0){pdf.setFillColor(...RC.soft);pdf.rect(M,y,CW,h,'F');}
      ls.forEach(c=>{c.l.forEach((t,j)=>T(t,c.x+2,y+1.2+lh(fsz)*(j+0.8),{fs:fsz,c:RC.mut}));c.v.forEach((t,j)=>T(t,c.x+lw,y+1.2+lh(fsz)*(j+0.8),{fs:fsz}));});
      y+=h;});};
  const n0=v=>fmt(v,0),n1=v=>fmt(v,1),n2=v=>fmt(v,2);
  const metLab=m=>({EF:'E/F',D61:'D'}[m]||m);
  const all=R.invC.concat(R.pC).filter(c=>c.Ib>0);
  const dt=new Date().toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'});

  /* ----- 1. identificação ----- */
  pdf.setFillColor(...RC.ink);pdf.rect(0,0,PW,44,'F');pdf.setFillColor(...RC.acc);pdf.rect(0,44,PW,1.4,'F');
  try{pdf.addImage(LOGO,'PNG',M,11,58,58*96/329);}catch(e){T('SOLCOR',M,22,{fs:18,b:1,c:[255,255,255]});}
  T('Relatório de cálculo',PW-M,19,{fs:17,b:1,c:[255,255,255],a:'r'});
  T('Cabos AC e proteções · instalação fotovoltaica',PW-M,26,{fs:9.5,c:[200,208,214],a:'r'});
  T('RTIEBT (Portaria 949-A/2006)',PW-M,32,{fs:9.5,c:[200,208,214],a:'r'});
  y=54;
  h2('1. Identificação da obra');
  const ob=S.obra||{};kv([['Projeto',S.proj||'—','Cliente',ob.cliente||'—'],['Morada',ob.morada||'—','Nº do desenho',ob.desenho||'—'],['Revisão',`${ob.rev||'A'} · ${ob.aprov?`aprovada por ${ob.aprov.nome||''} em ${dtxt(ob.aprov.em)}`:'não aprovada'}`],['Local (clima)',S.loc||'—','Data',dt],['Potência AC',`${n1(R.Ptot)} kW`,'Inversores',String(S.invs.length)],
    ['Corrente total',`${n0(R.IbTot)} A`,'Circuitos',String(all.length)]],{lw:34});

  /* ----- 2. dados gerais ----- */
  h2('2. Dados gerais e critérios');
  const e6=E6.find(x=>x[0]===+S.rsolo);
  const matTxt=S.mat==='auto'?`Automático: alumínio quando L > ${fs(+S.alThr||0)} m e P > ${fs(+S.alPmin||0)} kW (sempre monocondutor, nunca abaixo de 16 mm²); nos restantes, cobre`:S.mat==='Cu'?'Sempre cobre':'Sempre alumínio (monocondutor, mínimo 16 mm²)';
  kv([['Temperatura do ar',`${S.tair} °C`,'Temperatura do solo',`${S.tsoil} °C`],
    ['Resistividade do solo',e6?`${fs(e6[0])} K·m/W · ${e6[2]} (52-E6: ${n2(e6[1])})`:String(S.rsolo),'Isolamento',S.isol==='XLPE'?'XLPE / EPR (90 °C)':'PVC (70 °C)'],
    ['Material',matTxt],
    ['ΔU máx. por troço',`${fs(S.limT)} % (verificada só por troço, não acumulada)`,'cos φ',n2(Math.min(Math.max(+S.cos||1,0.5),1))],
    ['Comprimento de cálculo',S.folga===false?"L' = L (sem folga)":"L' = L + 20 % (L < 30 m) ou L + 10 % (L ≥ 30 m)"]],{lw:38});
  y+=2;
  [`Corrente admissível: Iz = Iz tabelado × n × fT × fsolo × fagrup, com Iz tabelado nos quadros 52-C da RTIEBT para o método de referência da instalação, fT nos quadros 52-D1 (ar) / 52-D2 (solo), fsolo no 52-E6 e fagrup nos quadros 52-E1 a 52-E5; n = nº de cabos em paralelo por fase (máximo 3).`,
   `Proteção contra sobrecargas: Ib ≤ In ≤ Iz e I₂ ≤ 1,45·Iz, com I₂ = k₂·In (k₂ = 1,45 nos disjuntores modulares até 125 A e 1,30 nos de caixa moldada). Ib dos inversores = corrente AC máxima da ficha técnica.`,
   `Queda de tensão: u = b·(ρ·L'/S·cos φ + X·L'·sin φ)·Ib/n e ΔU % = u/230 × 100, com b = 1 em trifásico e 2 em monofásico, ρ = 0,0225 (Cu) e 0,036 (Al) Ω·mm²/m e X a reatância linear do cabo.`,
   `Neutro segundo a RTIEBT 524.2 (igual à fase até 16 mm² Cu / 25 mm² Al e em monofásico; acima, metade da fase) e condutor de proteção segundo o quadro 54F.`]
   .forEach(t=>{para(t,{fs:8.6,c:RC.mut});y+=1.2;});

  /* ----- 3. quadro resumo ----- */
  h2('3. Quadro resumo dos circuitos');
  const cols=[['Circuito',50],['P kW',13,'r'],['Ib A',13,'r'],['Cabo',50],['In A',12,'r'],['ΔU %',13,'r'],['Estado',27]];
  const hdr=()=>{need(7);pdf.setFillColor(...RC.ink);pdf.rect(M,y,CW,6,'F');let x=M;cols.forEach(([t,w,a])=>{T(t,a?x+w-1.5:x+1.5,y+4.2,{fs:8,b:1,c:[255,255,255],a:a?'r':undefined});x+=w;});y+=6;};
  hdr();
  all.forEach((c,i)=>{const o=c.res,v=verdict(c);const cd=o?cableDwg(c).replace(/^Cabo /,''):'—';
    const cells=[(c.code?c.code+' · ':'')+(c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome),n1(c.p),n1(c.Ib),cd,o?String(o.In):'—',o?n2(o.du):'—',v.st==='ok'?'OK':`A rever: ${v.why}`];
    const ls=cells.map((t,j)=>wrap(t,cols[j][1]-3,{fs:7.8}));const h=Math.max(...ls.map(l=>l.length))*lh(7.8)+2.2;
    if(y+h>BOT){pdf.addPage('a4','portrait');y=TOP;hdr();}
    if(v.st!=='ok'){pdf.setFillColor(...RC.redS);pdf.rect(M,y,CW,h,'F');}else if(i%2){pdf.setFillColor(...RC.soft);pdf.rect(M,y,CW,h,'F');}
    let x=M;ls.forEach((l,j)=>{const [,w,a]=cols[j];l.forEach((t,k)=>T(t,a?x+w-1.5:x+1.5,y+1.1+lh(7.8)*(k+0.8),{fs:7.8,a:a?'r':undefined,c:j===6?(v.st==='ok'?RC.accD:RC.red):RC.ink,b:j===6}));x+=w;});
    y+=h;pdf.setDrawColor(...RC.line);pdf.setLineWidth(0.15);pdf.line(M,y,M+CW,y);});

  /* ----- 3.1 lado DC (strings), se houver ----- */
  const DCR=typeof solveDC==='function'?solveDC():null;
  if(DCR&&DCR.rows.length){
    h2('3.1 Lado DC (strings)');
    para(`Voc corrigido à temperatura mínima (${fs(DCR.D.tmin)} °C) e Vmp à temperatura da célula a quente (${fs(DCR.D.tcell)} °C) com o coeficiente kVoc do módulo. Cabo solar H1Z2Z2-K por string (+ e −): corrente de projeto 1,25 × Isc (IEC 60364-7-712); a corrente admissível usa o quadro RTIEBT do cobre XLPE com 2 condutores carregados (não há quadro para o cabo solar; do lado da segurança). ΔU DC máx. ${fs(DCR.D.lim)} %. Fusíveis gPV quando (strings em paralelo − 1) × 1,25 × Isc > ${DCR.D.ifuse} A (fusível máx. do módulo).`,{fs:8.6,c:RC.mut});y+=1.2;
    const dc=[['String',36],['Módulos',19,'r'],['Voc / máx. V',21,'r'],['Isc / máx. A',21,'r'],['Fusíveis',21],['Cabo por string',36],['ΔU %',12,'r'],['Estado',14]];
    const WARN=[176,110,0],msgs=new Map();
    const dh=()=>{need(7);pdf.setFillColor(...RC.ink);pdf.rect(M,y,CW,6,'F');let x=M;dc.forEach(([t,w,a])=>{T(t,a?x+w-1.5:x+1.5,y+4.2,{fs:8,b:1,c:[255,255,255],a:a?'r':undefined});x+=w;});y+=6;};
    dh();
    DCR.rows.forEach((r,i)=>{const st=r.errs.length?'bad':r.warns.length?'warn':'ok',d=r.inv||{};
      const cells=[`${r.code} · Inversor ${+r.a.ii+1} · MPPT ${r.a.mppt}\n${r.a.pan||''}`,r.pdc?`${r.ns} × ${r.np}\n${n1(r.pdc)} kWp`:'—',r.voc?`${n0(r.voc)} / ${d.vmax}`:'—',r.voc?`${n1(r.isc)} / ${d.isc||'—'}`:'—',
        r.fuse?`gPV ${r.fuse.In} A\n× ${r.fuse.n}`:'—',r.cab&&r.voc?`2 × 1×${fs(r.cab.s)} mm², ${n0(r.cab.L)} m\nIz ${n0(r.cab.Iz)} A ≥ ${n1(r.cab.Ib)} A`:'—',r.cab&&r.voc?n2(r.cab.du):'—',st==='bad'?'A rever':st==='warn'?'Aviso':'OK'];
      const ls=cells.map((t,j)=>String(t).split('\n').flatMap(s=>wrap(s,dc[j][1]-3,{fs:7.6})));const h=Math.max(...ls.map(l=>l.length))*lh(7.6)+2.2;
      if(y+h>BOT){pdf.addPage('a4','portrait');y=TOP;dh();}
      if(st==='bad'){pdf.setFillColor(...RC.redS);pdf.rect(M,y,CW,h,'F');}else if(i%2){pdf.setFillColor(...RC.soft);pdf.rect(M,y,CW,h,'F');}
      let x=M;ls.forEach((l,j)=>{const [,w,a]=dc[j];l.forEach((t,k)=>T(t,a?x+w-1.5:x+1.5,y+1.1+lh(7.6)*(k+0.8),{fs:7.6,a:a?'r':undefined,c:j===7?(st==='bad'?RC.red:st==='warn'?WARN:RC.accD):RC.ink,b:j===7}));x+=w;});
      y+=h;pdf.setDrawColor(...RC.line);pdf.setLineWidth(0.15);pdf.line(M,y,M+CW,y);
      /* mensagens iguais juntam-se no fim da tabela, com as strings a que se aplicam */
      r.errs.forEach(m=>{const g=msgs.get(m)||{err:true,codes:[]};g.codes.push(r.code);msgs.set(m,g);});
      r.warns.forEach(m=>{const g=msgs.get(m)||{err:false,codes:[]};g.codes.push(r.code);msgs.set(m,g);});});
    y+=1.5;const rng=cs=>cs.length>2&&cs.every((c,i)=>i===0||+c.slice(1)===+cs[i-1].slice(1)+1)?`${cs[0]}–${cs[cs.length-1]}`:cs.join(', ');
    msgs.forEach((g,m)=>para(`${rng(g.codes)}: ${m}`,{fs:7.8,c:g.err?RC.red:WARN}));
    y+=2;para(`Total: ${n1(DCR.pdc)} kWp DC · ${DCR.invs.map(g=>`Inversor ${g.ii+1}: DC/AC ${g.ratio!=null?n2(g.ratio):'—'}`).join(' · ')} · ${n0(DCR.metros)} m de cabo solar.`,{fs:8.4});
  }

  /* ----- 4. cálculo por circuito ----- */
  const circ=c=>{const o=c.res,v=verdict(c),r=c.r,mode=MODE[r.ref],ti=c.ti;
    y+=1;
    pdf.setFillColor(...RC.ink);pdf.rect(M,y,CW,7.5,'F');
    T((c.code?c.code+' · ':'')+(c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome),M+2.5,y+5.1,{fs:10,b:1,c:[255,255,255]});
    const pill=v.st==='ok'?'OK':'A rever';pdf.setFillColor(...(v.st==='ok'?RC.acc:RC.red));const pw=width(pill,{fs:8,b:1})+6;pdf.roundedRect(M+CW-pw-2,y+1.4,pw,4.7,1.2,1.2,'F');
    T(pill,M+CW-2-pw/2,y+4.75,{fs:8,b:1,a:'c',c:v.st==='ok'?RC.ink:[255,255,255]});y+=7.5;
    const sub=[c.kind==='inv'?c.modelo:`${c.nInv} inversor${c.nInv===1?'':'es'} a montante`,`${n1(c.p)} kW`,c.fases===1?'monofásico 230 V':'trifásico 400 V',
      `L = ${fs(c.L)} m${c.Lc!==c.L?` (cálculo L' = ${n1(c.Lc)} m)`:''}`].join(' · ');
    y+=1;para(sub,{fs:8.6,c:RC.mut,x:M+2.5,w:CW-5});y+=1;
    if(!o){para('Sem valores tabelados para este modo de instalação e cabo.',{fs:9,c:RC.red});y+=3;return;}
    const lay=o.cons==='multi'?'multicondutor':`monocondutores${mode.m==='EF'?` em ${({trevo:'trevo',esteira:'esteira sem afastamento',afh:'esteira com afastamento (H)',afv:'esteira com afastamento (V)'})[r.disp]||'trevo'}`:''}`;
    const trays=mode.m==='EF'?`, ${o.trays} esteira${o.trays>1?'s':''}`:'';
    const ibSrc=c.kind==='inv'?c.ibSrc:c.gw&&c.gw.dimNom!==false&&c.Ib>c.IbInv?`corrente nominal do gateway ${c.gw.In} A`:c.split?'inversor servido por este cabo':'soma dos inversores a jusante';
    const P=cableParts(o,c.loaded);
    const gwInt=c.split||gwOf(c.ref.dest);
    const tSrc=ti.buried?`52-D2, solo a ${ti.t} °C`:`52-D1, ar a ${ti.t} °C${r.sol?' (exposto ao sol: +10 °C)':''}`;
    kv([['Modo de instalação',`Ref. ${r.ref} · método de referência ${metLab(mode.m)} — ${mode.d}`],
      ['Tipo de cabo',`${o.mat==='Cu'?'Cobre':'Alumínio'} · ${S.isol} · ${lay}${trays}`,'Condutores carregados',String(c.loaded)],
      ['Quadro RTIEBT',`${o.q} col. ${o.qcol}`,'Iz tabelado',`${n0(o.iz0)} A (${fs(o.s)} mm²)`],
      ['Fator de temperatura',`${n2(ti.ft)} (${tSrc})`,'Fator de solo',ti.buried?`${n2(ti.fsolo)} (52-E6)${ti.ftubo!==1?` · em tubo × ${n2(ti.ftubo)}`:''}`:'1,00 (ao ar)'],
      ['Fator de agrupamento',`${n2(o.fg)} (${o.fgSrc}; ${o.nEff} circuito${o.nEff>1?'s':''}${o.trays>1?`, ${o.perTray} por esteira`:''})`,'Fator total f',n2(o.f)],
      ['Iz',`${n0(o.iz0)} × ${o.n} × ${n2(o.f)} = ${n0(o.Iz)} A`,'Ib',`${n1(c.Ib)} A (${ibSrc})`],
      ['In',`${o.In} A · Ib ≤ In ≤ Iz: ${n1(c.Ib)} ≤ ${o.In} ≤ ${n0(o.Iz)} ${o.term?'cumpre':'NÃO cumpre'}`,'I₂ ≤ 1,45·Iz',`I₂ = ${n2(k2(o.In))} × ${o.In} = ${n0(o.I2)} A ≤ ${n0(1.45*o.Iz)} A ${o.sob?'cumpre':'NÃO cumpre'}`],
      ['Queda de tensão',`ΔU = ${n2(o.du*2.3)} V · ${n2(o.du)} % (limite ${fs(S.limT)} %)`,'ΔU até à injeção',`${n2(c.acc||0)} %`+(c.kind==='inv'&&+S.lim>0&&(c.acc||0)>+S.lim?` > aviso ${fs(S.lim)} %`:' (informativa)')],
      ['Cabo',P.multi?`${P.cabo} mm² (${P.nota})`:`Fases: ${P.fase}${P.fases>1?' (por fase)':''}\nNeutro: ${P.neutro}\nTerra: ${P.terra}`],
      ['Designação no unifilar',cableDwg(c)],
      ['Disjuntor ABB',gwInt?`${o.In} A, proteção interna do gateway${o.brk?` (referência equivalente: ${o.brk.name})`:''}`:o.brk?`${o.brk.name} · ${c.loaded===2?2:4}P · In ${o.In} A · Icu ${o.brk.icu} kA`+(o.ikmax==null?'':o.icuOk!==false?` ≥ Icc no local ${n1(o.ikmax)} kA`:` < Icc no local ${n1(o.ikmax)} kA: ${o.icuAlt?`usar ${o.icuAlt.name} (${o.icuAlt.icu} kA)`:'escolher série de maior poder de corte'}`):`${o.In} A (sem referência no catálogo)`]],{lw:36});
    const notes=[c.gwErr,c.noFitMsg,v.st!=='ok'&&!c.gwErr&&!c.noFitMsg?`A rever: ${v.why}.`:null].filter(Boolean);
    notes.forEach(t=>{const ls=wrap(t,CW-8,{fs:8.6});const h=ls.length*lh(8.6)+3;need(h);pdf.setFillColor(...RC.redS);pdf.rect(M,y,CW,h,'F');pdf.setFillColor(...RC.red);pdf.rect(M,y,1.2,h,'F');
      ls.forEach((l,j)=>T(l,M+4,y+1.5+lh(8.6)*(j+0.8),{fs:8.6,c:RC.red}));y+=h;});
    y+=5;};
  h2('4. Cálculo por circuito',all.length?measure(()=>circ(all[0])):0);
  all.forEach(c=>block(()=>circ(c)));

  /* ----- 5. circuitos a rever ----- */
  h2('5. Circuitos a rever');
  const bad=all.filter(c=>verdict(c).st!=='ok');
  if(!bad.length)para('Todos os circuitos cumprem Ib ≤ In ≤ Iz, I₂ ≤ 1,45·Iz e a queda de tensão máxima por troço.',{fs:9});
  else bad.forEach(c=>{const v=verdict(c);para(`${c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome}: ${c.noFitMsg||c.gwErr||v.why}`,{fs:9,c:RC.red});y+=1.5;});
  return doc;
}
/* esquema unifilar numa página A3 no fim do relatório (a mesma imagem do PDF do separador Esquema unifilar) */
async function reportSld(pdf,R){
  const cv=await svgToPng(sldSVG(R),2);const land=cv.width>=cv.height;pdf.addPage('a3',land?'landscape':'portrait');
  const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),m=12,top=22;
  pdf.setFont('helvetica','bold');pdf.setFontSize(12.5);pdf.setTextColor(...RC.ink);pdf.setFillColor(...RC.acc);pdf.rect(m,12,1.4,5.2,'F');pdf.text('6. Esquema unifilar',m+4,16.2);
  const r=Math.min((pw-2*m)/cv.width,(ph-top-m-6)/cv.height);pdf.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',m,top,cv.width*r,cv.height*r);
}
function reportFooter(pdf){const n=pdf.getNumberOfPages();
  for(let i=1;i<=n;i++){pdf.setPage(i);const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(...RC.line);pdf.setLineWidth(0.2);pdf.line(16,ph-11,pw-16,ph-11);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(...RC.mut);
    pdf.text(`Solcor · Relatório de cálculo de cabos AC · ${S.proj||'Projeto sem nome'} · Rev. ${(S.obra&&S.obra.rev)||'A'}`,16,ph-7);pdf.text(`Página ${i} de ${n}`,pw-16,ph-7,{align:'right'});}}
async function makeReport(){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const R=solveAll();const pdf=reportPDF(R);await reportSld(pdf,R);reportFooter(pdf);return pdf;
}
document.addEventListener('click',async e=>{if(!e.target.closest('#report'))return;
  try{const pdf=await makeReport();await saveFile(`${fileBase()}_relatorio_calculo.pdf`,pdf.output('blob'));}
  catch(err){console.warn(err);toast('Não foi possível gerar o relatório');}
});
