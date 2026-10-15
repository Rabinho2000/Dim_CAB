/* ---------- lista de materiais e orçamento do projeto aberto: Excel (.xlsx) e PDF ----------
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
const bomCircLabel=c=>c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome;
function bomData(R){
  R=R||solveAll();const all=R.invC.concat(R.pC).filter(c=>c.res&&c.Ib>0);
  /* cabos agrupados por tipo, secção e função */
  const cm=new Map();
  all.forEach(c=>bomCableLines(c).forEach(x=>{const k=`${x.uso}|${x.des}|${x.pm}`;const g=cm.get(k);
    if(g){g.m+=x.m;g.circ.push(bomCircLabel(c));}else cm.set(k,{...x,circ:[bomCircLabel(c)]});}));
  const ord={Fase:0,Neutro:1,Terra:2,Multicondutor:3};
  const cabos=[...cm.values()].sort((a,b)=>a.mat.localeCompare(b.mat)||ord[a.uso]-ord[b.uso]||a.s-b.s)
    .map(x=>({...x,total:x.pm==null?null:x.m*x.pm}));
  /* disjuntores e diferenciais ABB: os mesmos que entram em R.brkTot */
  const desc=(+S.descABB||0)/100,bm=new Map();
  const add=(k,v)=>{const g=bm.get(k);if(g){g.qty++;g.circ.push(v.circ);}else bm.set(k,{...v,qty:1,circ:[v.circ]});};
  R.invC.concat(R.pC).forEach(c=>{if(!(c.res&&c.res.brk&&!c.split&&!gwOf(c.ref.dest)))return;const b=c.res.brk,lab=bomCircLabel(c);
    add('d|'+b.ref,{tipo:'Disjuntor',des:b.name||b.d,ref:b.ref,pvp:b.p,circ:lab});
    if(b.dif)add('f|'+b.dif.refs.join('+'),{tipo:'Diferencial',des:b.dif.name,ref:b.dif.refs.join(' + '),pvp:b.dif.p,circ:lab});});
  const prot=[...bm.values()].sort((a,b)=>a.tipo.localeCompare(b.tipo)||a.pvp-b.pvp).map(x=>({...x,net:x.pvp*(1-desc),total:x.qty*x.pvp*(1-desc)}));
  /* quadros: a mesma composição do separador Quadros */
  const quad=[];
  quadros().forEach(n=>{const Q=qfvParts(n,R);
    if(gwOf(n)){if(!Q)return;const sp=Q.spec;
      quad.push({node:n,role:BOM_ROLE.GW,env:'Equipamento do fabricante',items:[{nome:'Gateway',txt:sp?`${sp.marca} ${sp.modelo}`:(gwOf(n).modelo||'gateway'),dif:sp?`rede ${gwMainA(sp)} A · ${sp.ports} entrada${sp.ports===1?'':'s'} de inversor ${gwPortA(sp)} A`:''}]});return;}
    const b=boardFor(n,R);if(!b)return;const e=b.best;
    quad.push({node:n,role:(r=>r===n?"":r)(BOM_ROLE[Q?Q.role:'CLI']||'Quadro'),env:b.isEnd?'Quadro existente':e?`Hager Orion plus ${e.ref} ou equivalente, ${e.H} × ${e.W} × ${e.Pf} mm`:'Armário de chão',
      items:b.devs.map(d=>({nome:d.nome,txt:d.txt,dif:d.dif}))});});
  const tCab=cabos.reduce((a,x)=>a+(x.total||0),0),tProt=prot.reduce((a,x)=>a+x.total,0);
  return {proj:S.proj||'',data:new Date().toLocaleDateString('pt-PT'),loc:S.loc,Ptot:R.Ptot,desc:+S.descABB||0,cabos,prot,quad,
    tCab,tProt,total:tCab+tProt,est:cabos.some(x=>x.est),semPreco:cabos.filter(x=>x.pm==null)};
}

/* ---------- .xlsx gerado aqui (Office Open XML num zip sem compressão): sem bibliotecas nem rede, abre no Excel com números e fórmulas ---------- */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function zipStore(files){ /* files: [[nome, texto]] → Uint8Array */
  const te=new TextEncoder(),loc=[],cen=[];let off=0;
  const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  files.forEach(([name,txt])=>{const nm=te.encode(name),d=te.encode(txt),crc=crc32(d);
    const h=[...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)];
    loc.push(Uint8Array.from(h),nm,d);
    cen.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=h.length+nm.length+d.length;});
  const csz=cen.reduce((a,x)=>a+x.length,0);
  const end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csz),...u32(off),...u16(0)]);
  const parts=loc.concat(cen,[end]),out=new Uint8Array(parts.reduce((a,x)=>a+x.length,0));let p=0;parts.forEach(x=>{out.set(x,p);p+=x.length;});return out;
}
const xesc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colL=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
/* estilos: 0 normal · 1 negrito · 2 € · 3 € negrito · 4 metros 0,0 · 5 €/m 0,0000 · 6 título · 7 cabeçalho de tabela */
const XSTYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="165" formatCode="#,##0.0"/><numFmt numFmtId="166" formatCode="0.0000\\ &quot;€&quot;"/></numFmts>
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3F7E1"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">${[[0,0,0],[0,1,0],[164,0,0],[164,1,0],[165,0,0],[166,0,0],[0,2,0],[0,1,2]].map(([n,f,l])=>`<xf numFmtId="${n}" fontId="${f}" fillId="${l}" borderId="0" xfId="0"${n?' applyNumberFormat="1"':''}${f?' applyFont="1"':''}${l?' applyFill="1"':''}/>`).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
/* rows: [[célula]] com célula = texto | número | {v, s, f} */
function xSheet(rows,widths){
  const cell=(c,r,x)=>{if(x==null||x==='')return '';const o=typeof x==='object'?x:{v:x};const ref=colL(c)+(r+1),s=o.s?` s="${o.s}"`:'';
    if(o.f!=null)return `<c r="${ref}"${s}><f>${xesc(o.f)}</f><v>${+o.v||0}</v></c>`;
    return typeof o.v==='number'?`<c r="${ref}"${s}><v>${o.v}</v></c>`:`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xesc(o.v)}</t></is></c>`;};
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${
    rows.map((row,r)=>`<row r="${r+1}">${(row||[]).map((x,c)=>cell(c,r,x)).join('')}</row>`).join('')}</sheetData></worksheet>`;
}
function xlsxBlob(sheets){ /* sheets: [[nome, xml]] */
  const f=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xesc(s[0])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',XSTYLES]].concat(sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,s[1]]));
  return new Blob([zipStore(f)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function bomXlsx(B){
  const r=[],b=v=>({v,s:1}),h=v=>({v,s:7}),E=v=>v==null?'sem preço':{v,s:2};
  r.push([{v:'Lista de materiais e orçamento',s:6}],[b('Projeto'),B.proj||'Projeto sem nome'],[b('Data'),B.data],[b('Local'),B.loc||'—'],[b('Potência'),`${fmt(B.Ptot,1)} kW`],[]);
  r.push([{v:'Cabos',s:6}],[h('Função'),h('Cabo'),h('Metros'),h('€/m'),h('Total'),h('Preço'),h('Circuitos')]);
  const c0=r.length;B.cabos.forEach(x=>r.push([x.uso,x.des,{v:x.m,s:4},x.pm==null?'sem preço':{v:x.pm,s:5},x.pm==null?'':{v:x.total,s:2,f:`C${r.length+1}*D${r.length+1}`},x.pm==null?'sem compra':x.est?'estimado *':'compra 2026',x.circ.join('; ')]));
  const rCab=r.length+1;r.push([b('Total cabos'),'','','',{v:B.tCab,s:3,f:B.cabos.length?`SUM(E${c0+1}:E${r.length})`:'0'},B.est?'* com preços estimados':'']);
  r.push([],[{v:'Disjuntores e diferenciais ABB',s:6}],[h('Tipo'),h('Descrição'),h('Quantidade'),h('PVP unit.'),h('Total'),h('Referência'),h('Circuitos')]);
  const p0=r.length;B.prot.forEach(x=>r.push([x.tipo,x.des,x.qty,E(x.pvp),{v:x.total,s:2,f:`C${r.length+1}*D${r.length+1}*(1-${B.desc}/100)`},x.ref,x.circ.join('; ')]));
  const rProt=r.length+1;r.push([b('Total proteções'),B.desc?`PVP com desconto de ${B.desc} %`:'PVP ABB, sem desconto','','',{v:B.tProt,s:3,f:B.prot.length?`SUM(E${p0+1}:E${r.length})`:'0'}]);
  r.push([],[b('Total geral'),'','','',{v:B.total,s:3,f:`E${rCab}+E${rProt}`}]);
  if(B.est)r.push([],['* Preço estimado: sem compra deste cabo em 2026, interpolado entre as secções compradas da mesma família.']);
  r.push(['Metros = comprimento de cálculo de cada circuito (com a folga de 20 % abaixo de 30 m e 10 % a partir de 30 m). Terra: um condutor por circuito.']);
  const q=[[{v:'Composição dos quadros',s:6}],[]];
  B.quad.forEach(Q=>{q.push([{v:`${Q.node}${Q.role?" · "+Q.role:""}`,s:1}],['Envolvente',Q.env],[h('Aparelho'),h('Descrição'),h('Nota')]);Q.items.forEach(d=>q.push([d.nome,d.txt,d.dif||'']));q.push([]);});
  return xlsxBlob([['Orçamento',xSheet(r,[16,48,12,12,14,22,60])],['Quadros',xSheet(q,[28,70,50])]]);
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
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(200,208,214);pdf.text(pdfTxt(B.proj||'Projeto sem nome'),W-M,23,{align:'right'});
  y=44;pdf.setTextColor(26,32,40);pdf.setFont('helvetica','normal');pdf.setFontSize(9);
  pdf.text(pdfTxt(`Projeto: ${B.proj||'Projeto sem nome'}   ·   Local: ${B.loc||'—'}   ·   Potência: ${fmt(B.Ptot,1)} kW   ·   ${B.data}`),M,y);y+=4;
  title('Cabos');
  table([{t:'Função',w:22},{t:'Cabo',w:62},{t:'Metros',w:22,a:'r'},{t:'€/m',w:24,a:'r'},{t:'Total',w:52,a:'r'}],
    B.cabos.map(x=>({cells:[x.uso,x.des,fmt(x.m,1),x.pm==null?'sem preço':x.pm.toLocaleString('pt-PT',{minimumFractionDigits:4,maximumFractionDigits:4})+(x.est?' *':''),x.pm==null?'—':eur2(x.total)]}))
      .concat([{bold:true,cells:['Total cabos','','','',eur2(B.tCab)]}]));
  title('Disjuntores e diferenciais ABB');
  table([{t:'Tipo',w:28},{t:'Descrição / referência',w:78},{t:'Qtd.',w:12,a:'r'},{t:'PVP unit.',w:24,a:'r'},{t:'Total',w:40,a:'r'}],
    B.prot.map(x=>({cells:[x.tipo,`${x.des}\n${x.ref}`,String(x.qty),eur2(x.pvp),eur2(x.total)]}))
      .concat([{bold:true,cells:['Total proteções',B.desc?`PVP com desconto de ${B.desc} %`:'PVP ABB, sem desconto','','',eur2(B.tProt)]}]));
  need(10);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setFillColor(56,212,48);pdf.rect(M,y-4.5,W-2*M,7,'F');
  pdf.text('Total geral',M+1,y);pdf.text(pdfTxt(eur2(B.total)),W-M-1,y,{align:'right'});y+=8;
  pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
  const notes=[...(B.est?['* Preço estimado: sem compra deste cabo em 2026, interpolado entre as secções compradas da mesma família.']:[]),
    'Metros = comprimento de cálculo de cada circuito (com a folga de 20 % abaixo de 30 m e 10 % a partir de 30 m). Terra: um condutor por circuito. Quadros e envolventes sem preço.'];
  notes.forEach(n=>{const l=pdf.splitTextToSize(pdfTxt(n),W-2*M);need(l.length*3.4);pdf.text(l,M,y);y+=l.length*3.4;});
  title('Composição dos quadros');
  B.quad.forEach(Q=>{need(16);pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.text(pdfTxt(`${Q.node}${Q.role?" · "+Q.role:""}`),M,y);y+=4;
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(pdfTxt(Q.env),M,y);y+=4;
    table([{t:'Aparelho',w:40},{t:'Descrição',w:80},{t:'Nota',w:62}],Q.items.map(d=>({cells:[d.nome,d.txt,d.dif||'']})));});
  foot();return pdf.output('blob');
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-bom]');if(!b)return;
  try{const B=bomData(last);
    if(b.dataset.bom==='xlsx')await saveFile(`${fileBase()}_orcamento.xlsx`,bomXlsx(B));
    else await saveFile(`${fileBase()}_orcamento.pdf`,await bomPdf(B));
  }catch(err){console.warn(err);toast('Não foi possível gerar o orçamento');}
});
