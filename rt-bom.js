/* ---------- lista de materiais e orçamento do projeto aberto (PDF) ----------
   Cabos: fases, neutro e terra em separado, metros = comprimento de cálculo (com folga) de cada circuito e €/m como em costPerM,
   de modo que o total dos cabos é igual a R.costTot. Proteções ABB: os mesmos aparelhos que R.brkTot (PVP com o desconto descABB).
   Quadros: a composição do separador Quadros (sem preço). */
const BOM_ROLE={QFV:'QFV',INT:'Quadro de interligação',CONT:'Quadro de contagem',CLI:'Quadro do cliente (existente)',GW:'Gateway'};
/* linhas de cabo de um circuito, com o mesmo modelo de custo de costPerM (rt-price.js) */
function bomCableLines(c){
  const o=c.res,L=c.Lc,loaded=c.loaded,type=(o.mat==='Cu'?'':'L')+(S.isol==='XLPE'?'XV':'VV');const out=[];
  if(o.cons==='multi'){
    if(loaded===2){const q3=pricePer('Cu','multi3',o.s),q5=pricePer('Cu','multi5',o.s);
      out.push({uso:'Multicondutor',des:`${type} 3G${fs(o.s)} mm²`,mat:'Cu',s:o.s,m:o.n*L,pm:q3?q3.p:q5?q5.p*0.6:null,est:q3?false:true});}
    else{const q=pricePer('Cu','multi5',o.s);out.push({uso:'Multicondutor',des:`${type} 5G${fs(o.s)} mm²`,mat:'Cu',s:o.s,m:o.n*L,pm:q?q.p:null,est:q?q.est:false});}
  }else{
    const {sn,spe}=condSizes(o,loaded),nf=loaded===2?1:3;
    const f=pricePer(o.mat,'mono',o.s),nn=pricePer(o.mat,'mono',sn),pe=pricePer(o.mat,'pe',spe)||pricePer(o.mat,'mono',spe);
    out.push({uso:'Fase',des:`${type} 1×${fs(o.s)} mm² ${o.mat}`,mat:o.mat,s:o.s,m:o.n*nf*L,pm:f?f.p:null,est:f?f.est:false},
             {uso:'Neutro',des:`${type} 1×${fs(sn)} mm² ${o.mat}`,mat:o.mat,s:sn,m:o.n*L,pm:nn?nn.p:null,est:nn?nn.est:false},
             {uso:'Terra',des:`1×${fs(spe)} mm² ${o.mat} verde/amarelo`,mat:o.mat,s:spe,m:L,pm:pe?pe.p:null,est:pe?pe.est:false});
  }
  /* sem preço para uma das partes: o circuito fica sem custo (como em costPerM) */
  if(out.some(x=>x.pm==null))out.forEach(x=>{x.pm=null;x.est=false;});
  return out;
}
const bomCircLabel=c=>(c.code?c.code+' · ':'')+(c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome);
function bomData(R){
  R=R||solveAll();const all=R.invC.concat(R.pC).filter(c=>c.res&&c.Ib>0);
  /* cabos agrupados por tipo, secção e função */
  const cm=new Map();
  all.forEach(c=>bomCableLines(c).forEach(x=>{const k=`${x.uso}|${x.des}|${x.pm}`;const g=cm.get(k);
    if(g){g.m+=x.m;g.circ.push(bomCircLabel(c));}else cm.set(k,{...x,circ:[bomCircLabel(c)]});}));
  const ord={Fase:0,Neutro:1,Terra:2,Multicondutor:3};
  const cabos=[...cm.values()].sort((a,b)=>a.mat.localeCompare(b.mat)||ord[a.uso]-ord[b.uso]||a.s-b.s)
    .map(x=>({...x,total:x.pm==null?null:x.m*x.pm}));
  /* terminais: os mesmos que entram em R.termTot (termLines/termCost de rt-price.js), agrupados por tipo e secção */
  const tm=new Map();
  all.forEach(c=>{if(!c.term)return;termLines(c.res,c.loaded).forEach(l=>{const k=l.mat+'|'+l.s,g=tm.get(k),lab=bomCircLabel(c);
    if(g){g.q+=l.q;if(!g.circ.includes(lab))g.circ.push(lab);}else{const p=pricePer(l.mat,'term',l.s);tm.set(k,{...l,pu:p.p,est:p.est,circ:[lab]});}});});
  const terms=[...tm.values()].sort((a,b)=>a.mat.localeCompare(b.mat)||a.s-b.s)
    .map(x=>({...x,des:`${x.mat==='Al'?'Terminal bimetálico Cu/Al':'Terminal de cravar Cu'} ${fs(x.s)} mm²`,total:x.q*x.pu}));
  /* disjuntores e diferenciais ABB: os mesmos que entram em R.brkTot */
  const desc=(+S.descABB||0)/100,bm=new Map();
  const add=(k,v)=>{const g=bm.get(k);if(g){g.qty++;g.circ.push(v.circ);}else bm.set(k,{...v,qty:1,circ:[v.circ]});};
  R.invC.concat(R.pC).forEach(c=>{if(!(c.res&&c.res.brk&&!c.split&&!gwOf(c.ref.dest)))return;const b=c.res.brk,lab=bomCircLabel(c);
    add('d|'+b.ref,{tipo:'Disjuntor',des:b.name||b.d,ref:b.ref,pvp:b.p,circ:lab});
    if(b.dif)add('f|'+b.dif.refs.join('+'),{tipo:'Diferencial',des:b.dif.name,ref:b.dif.refs.join(' + '),pvp:b.dif.p,circ:lab});});
  (R.central||[]).forEach(x=>{for(let i=0;i<x.n;i++)add('c|central',{tipo:'Diferencial',des:'Unidade central diferencial 4 E/S (CBS-4)',ref:BRK.acc.central[0],pvp:BRK.acc.central[1],circ:`${x.node} (${x.k} caixas moldadas)`});});
  const prot=[...bm.values()].sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.pvp-b.pvp).map(x=>({...x,net:x.pvp*(1-desc),total:x.qty*x.pvp*(1-desc)}));
  /* quadros: a mesma composição do separador Quadros */
  const quad=[];
  quadros().forEach(n=>{const Q=qfvParts(n,R);
    if(gwOf(n)){if(!Q)return;const sp=Q.spec;
      quad.push({node:n,role:BOM_ROLE.GW,env:'Equipamento do fabricante',items:[{nome:'Gateway',txt:sp?`${sp.marca} ${sp.modelo}`:(gwOf(n).modelo||'gateway'),dif:sp?`rede ${gwMainA(sp)} A · ${sp.ports} entrada${sp.ports===1?'':'s'} de inversor ${gwPortA(sp)} A`:''}]});return;}
    const b=boardFor(n,R);if(!b||b.isEnd)return;const e=b.best; /* o quadro do cliente (existente) não entra */
    quad.push({node:n,role:(r=>r===n?"":r)(BOM_ROLE[Q?Q.role:'CLI']||'Quadro'),env:b.isEnd?'Quadro existente':e?`Hager Orion plus ${e.ref} ou equivalente, ${e.H} × ${e.W} × ${e.Pf} mm`:'Armário de chão',
      items:b.devs.map(d=>({nome:d.nome,txt:d.txt,dif:d.dif}))});});
  const tCab=cabos.reduce((a,x)=>a+(x.total||0),0),tProt=prot.reduce((a,x)=>a+x.total,0),tTerm=terms.reduce((a,x)=>a+x.total,0);
  /* quadros novos: componentes, acessórios e montagem como a Indusmelec os orçamenta (rt-indus.js); as proteções de saída já estão em tProt */
  const qds=quadros().map(n=>indusParts(n,R)).filter(Boolean),tQd=qds.reduce((a,x)=>a+x.sub,0);
  return {rev:(S.obra&&S.obra.rev)||'A',aprov:(S.obra&&S.obra.aprov)||null,proj:S.proj||'',cliente:(S.obra&&S.obra.cliente)||'',morada:(S.obra&&S.obra.morada)||'',data:new Date().toLocaleDateString('pt-PT'),loc:S.loc,Ptot:R.Ptot,desc:+S.descABB||0,cabos,prot,quad,
    qds,tQd,terms,tTerm,tCab,tProt,total:tCab+tTerm+tProt+tQd,est:cabos.some(x=>x.est)||terms.some(x=>x.est),semPreco:cabos.filter(x=>x.pm==null)};
}

/* zip sem compressão (Office Open XML): usado pelo relatório Word (rt-docx.js) */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function zipStore(files){ /* files: [[nome, texto ou Uint8Array]] → Uint8Array */
  const te=new TextEncoder(),loc=[],cen=[];let off=0;
  const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  files.forEach(([name,txt])=>{const nm=te.encode(name),d=txt instanceof Uint8Array?txt:te.encode(txt),crc=crc32(d);
    const h=[...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)];
    loc.push(Uint8Array.from(h),nm,d);
    cen.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=h.length+nm.length+d.length;});
  const csz=cen.reduce((a,x)=>a+x.length,0);
  const end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csz),...u32(off),...u16(0)]);
  const parts=loc.concat(cen,[end]),out=new Uint8Array(parts.reduce((a,x)=>a+x.length,0));let p=0;parts.forEach(x=>{out.set(x,p);p+=x.length;});return out;
}
/* ---------- PDF (jsPDF, A4 ao alto, fonte Helvetica) ---------- */
/* a Helvetica do PDF só tem o alfabeto WinAnsi: troca o que fica fora */
const pdfTxt=s=>String(s??'').replace(/→/g,'->').replace(/[−–—]/g,'-').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/ΔU/g,'dU').replace(/[^\n\x20-\x7E\xA0-\xFF€×]/g,'');
const eur2=v=>v==null?'sem preço':v.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
async function bomPdf(B){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4',compress:!window.__bomPdfPlain});
  const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),M=14;let y=M;
  const foot=()=>{pdf.setFontSize(7);pdf.setTextColor(120);pdf.text(pdfTxt(`Solcor · Lista de materiais e orçamento · ${B.proj||'Projeto sem nome'} · ${B.data}`),M,H-8);pdf.text(`${pdf.internal.getNumberOfPages()}`,W-M,H-8,{align:'right'});pdf.setTextColor(26,32,40);};
  const need=h=>{if(y+h>H-14){foot();pdf.addPage();y=M;}};
  const title=t=>{need(14);y+=3;pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(pdfTxt(t),M,y);y+=2;pdf.setDrawColor(56,212,48);pdf.setLineWidth(0.6);pdf.line(M,y,W-M,y);y+=5;};
  /* tabela: cols [{t, w, a:'r'}], linhas de texto; o texto longo parte-se na largura da coluna */
  const table=(cols,rows,opt={})=>{
    const head=()=>{pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setFillColor(227,247,225);pdf.rect(M,y-3.6,W-2*M,5.2,'F');
      let x=M;cols.forEach(c=>{pdf.text(pdfTxt(c.t),c.a==='r'?x+c.w-1:x+1,y,{align:c.a==='r'?'right':'left'});x+=c.w;});y+=4.8;};
    need(12);head();
    rows.forEach(row=>{pdf.setFont('helvetica',row.bold?'bold':'normal');pdf.setFontSize(8);
      const ls=row.cells.map((v,i)=>pdf.splitTextToSize(pdfTxt(v),cols[i].w-2));const h=Math.max(...ls.map(l=>l.length))*3.4+1.2;
      if(y+h>H-14){foot();pdf.addPage();y=M;head();pdf.setFont('helvetica',row.bold?'bold':'normal');pdf.setFontSize(8);}
      if(row.bold){pdf.setDrawColor(26,32,40);pdf.setLineWidth(0.2);pdf.line(M,y-3.4,W-M,y-3.4);}
      let x=M;ls.forEach((l,i)=>{const c=cols[i];pdf.text(l,c.a==='r'?x+c.w-1:x+1,y,{align:c.a==='r'?'right':'left'});x+=c.w;});y+=h;});
    y+=2;};
  /* cabeçalho como o do relatório de cálculo: faixa escura com o logótipo e linha verde */
  pdf.setFillColor(26,32,40);pdf.rect(0,0,W,34,'F');pdf.setFillColor(56,212,48);pdf.rect(0,34,W,1.2,'F');
  try{pdf.addImage(LOGO,'PNG',M,9,48,48*96/329);}catch(e){pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.setTextColor(255);pdf.text('SOLCOR',M,20);}
  pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.setTextColor(255);pdf.text('Lista de materiais e orçamento',W-M,16,{align:'right'});
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(200,208,214);pdf.text(pdfTxt(`${B.proj||'Projeto sem nome'} · Rev. ${B.rev}`),W-M,23,{align:'right'});
  y=44;pdf.setTextColor(26,32,40);pdf.setFont('helvetica','normal');pdf.setFontSize(9);
  pdf.text(pdfTxt(`Projeto: ${B.proj||'Projeto sem nome'}   ·   Cliente: ${B.cliente||'—'}   ·   Potência: ${fmt(B.Ptot,1)} kW   ·   ${B.data}`),M,y);y+=4;
  pdf.text(pdfTxt(`Morada: ${B.morada||'—'}   ·   Local (clima): ${B.loc||'—'}`),M,y);y+=4;
  title('Cabos');
  table([{t:'Função',w:22},{t:'Cabo',w:62},{t:'Metros',w:22,a:'r'},{t:'€/m',w:24,a:'r'},{t:'Total',w:52,a:'r'}],
    B.cabos.map(x=>({cells:[x.uso,x.des,fmt(x.m,1),x.pm==null?'sem preço':x.pm.toLocaleString('pt-PT',{minimumFractionDigits:4,maximumFractionDigits:4})+(x.est?' *':''),x.pm==null?'—':eur2(x.total)]}))
      .concat([{bold:true,cells:['Total cabos','','','',eur2(B.tCab)]}]));
  if(B.terms.length){title('Terminais');
    table([{t:'Tipo',w:22},{t:'Descrição',w:62},{t:'Qtd.',w:22,a:'r'},{t:'€/unid.',w:24,a:'r'},{t:'Total',w:52,a:'r'}],
      B.terms.map(x=>({cells:[x.mat==='Al'?'Bimetálico':'Cobre',x.des,String(x.q),x.pu.toLocaleString('pt-PT',{minimumFractionDigits:4,maximumFractionDigits:4})+(x.est?' *':''),eur2(x.total)]}))
        .concat([{bold:true,cells:['Total terminais','','','',eur2(B.tTerm)]}]));}
  title('Disjuntores e diferenciais ABB');
  table([{t:'Tipo',w:28},{t:'Descrição / referência',w:78},{t:'Qtd.',w:12,a:'r'},{t:'PVP unit.',w:24,a:'r'},{t:'Total',w:40,a:'r'}],
    B.prot.map(x=>({cells:[x.tipo,`${x.des}\n${x.ref}`,String(x.qty),eur2(x.pvp),eur2(x.total)]}))
      .concat([{bold:true,cells:['Total proteções',B.desc?`PVP com desconto de ${B.desc} %`:'PVP ABB, sem desconto','','',eur2(B.tProt)]}]));
  if(B.qds.length){title('Quadros elétricos (componentes e montagem)');
    B.qds.forEach(Q=>{need(16);pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.text(pdfTxt(`${Q.node} · ${BOM_ROLE[Q.role]||Q.role}`),M,y);y+=4;
      table([{t:'Função',w:30},{t:'Referência',w:32},{t:'Descrição',w:66},{t:'Qtd.',w:12,a:'r'},{t:'Total',w:42,a:'r'}],
        Q.items.map(x=>({cells:[x.papel,x.ref,x.des,String(x.q),x.prot?'em Proteções':x.total==null?(/incluído/.test(x.des)?'-':'sem preço'):eur2(x.total)]}))
          .concat([{bold:true,cells:[`Subtotal ${Q.node}`,'','','',eur2(Q.sub)]}]));});
    need(8);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(pdfTxt('Total quadros'),M+1,y);pdf.text(pdfTxt(eur2(B.tQd)),W-M-1,y,{align:'right'});y+=6;}
  need(10);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setFillColor(56,212,48);pdf.rect(M,y-4.5,W-2*M,7,'F');
  pdf.text('Total geral',M+1,y);pdf.text(pdfTxt(eur2(B.total)),W-M-1,y,{align:'right'});y+=8;
  pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
  const notes=[...(B.est?['* Preço estimado: sem compra deste cabo em 2026, interpolado entre as secções compradas da mesma família.']:[]),
    'Metros = comprimento de cálculo de cada circuito (com a folga de 20 % abaixo de 30 m e 10 % a partir de 30 m). Terra: um condutor por circuito. Quadros: referências e preços líquidos dos orçamentos Indusmelec de 2026 (indicativos; unidades univers estimadas); as proteções de saída contam em Disjuntores e diferenciais ABB; gateways sem preço. Sem quadro de interligação, o disjuntor de interligação instala-se no quadro do cliente (existente, fora do fornecimento).'];
  notes.forEach(n=>{const l=pdf.splitTextToSize(pdfTxt(n),W-2*M);need(l.length*3.4);pdf.text(l,M,y);y+=l.length*3.4;});
  const rest=B.quad.filter(Q=>!B.qds.some(x=>x.node===Q.node));if(rest.length)title('Gateways e quadros existentes');
  rest.forEach(Q=>{need(16);pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.text(pdfTxt(`${Q.node}${Q.role?" · "+Q.role:""}`),M,y);y+=4;
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(pdfTxt(Q.env),M,y);y+=4;
    table([{t:'Aparelho',w:40},{t:'Descrição',w:80},{t:'Nota',w:62}],Q.items.map(d=>({cells:[d.nome,d.txt,d.dif||'']})));});
  foot();return pdf.output('blob');
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-bom]');if(!b)return;
  try{const B=bomData(last);
    await saveFile(`${fileBase()}_orcamento.pdf`,await bomPdf(B));
  }catch(err){console.warn(err);toast('Não foi possível gerar o orçamento');}
});
