/* ---------- relatório de cálculo em Word (.docx), editável: o mesmo conteúdo do PDF (idRows, critRows, REPORT_NOTES, circRows
   de rt-report.js, solveDC de rt-dc.js) e o unifilar como imagem. Office Open XML num zip sem compressão (zipStore de rt-bom.js). ---------- */
const DX=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* parágrafo: texto com \n → quebra de linha; o: {style, b, sz (meios-pontos), color, i, align, keep} */
function dP(text,o={}){
  const rPr=`${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}${o.color?`<w:color w:val="${o.color}"/>`:''}${o.sz?`<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`:''}`;
  const runs=String(text??'').split('\n').map((l,i)=>`<w:r>${rPr?`<w:rPr>${rPr}</w:rPr>`:''}${i?'<w:br/>':''}<w:t xml:space="preserve">${DX(l)}</w:t></w:r>`).join('');
  const pPr=`${o.style?`<w:pStyle w:val="${o.style}"/>`:''}${o.keep?'<w:keepNext/>':''}${o.align?`<w:jc w:val="${o.align}"/>`:''}`;
  return `<w:p>${pPr?`<w:pPr>${pPr}</w:pPr>`:''}${runs}</w:p>`;
}
/* tabela: widths em twips; rows = [[texto|{t,b,color,fill}]]; head = 1ª linha é cabeçalho */
function dT(rows,widths,o={}){
  const cell=(x,w,hd,fill)=>{const c=typeof x==='object'&&x!==null?x:{t:x};const sh=c.fill||fill;
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${sh?`<w:shd w:val="clear" w:color="auto" w:fill="${sh}"/>`:''}</w:tcPr>${dP(c.t,{b:hd||c.b,sz:o.sz||18,color:hd?'FFFFFF':c.color,align:c.a})}</w:tc>`;};
  const bd=['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D8DEE4"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${
    rows.map((r,i)=>`<w:tr>${i===0&&o.head?'<w:trPr><w:tblHeader/></w:trPr>':''}${r.map((x,j)=>cell(x,widths[j],i===0&&o.head,i===0&&o.head?'1A2028':(!o.head||i%2)&&o.zebra?'F4F6F8':null)).join('')}</w:tr>`).join('')}</w:tbl>${dP('',{sz:8})}`;
}
/* pares rótulo / valor (2 ou 4 colunas), como o kv do PDF */
const dKV=rows=>dT(rows.map(r=>r.length>2?[{t:r[0],color:'5A6672'},r[1],{t:r[2],color:'5A6672'},r[3]]:[{t:r[0],color:'5A6672'},r[1],'','']),[1900,2900,1900,2900],{zebra:true});
async function reportDocx(R){
  const all=R.invC.concat(R.pC).filter(c=>c.Ib>0),dt=new Date().toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}),n2=v=>fmt(v,2),n1=v=>fmt(v,1),n0=v=>fmt(v,0);
  const B=[];const H1=t=>B.push(dP(t,{style:'Heading1',keep:true})),H2=t=>B.push(dP(t,{style:'Heading2',keep:true})),Pm=t=>B.push(dP(t,{sz:18,color:'5A6672'}));
  B.push(dP('Relatório de cálculo',{style:'Title'}),dP('Cabos AC e proteções · instalação fotovoltaica · RTIEBT (Portaria 949-A/2006)',{color:'5A6672'}));
  H1('1. Identificação da obra');B.push(dKV(idRows(R,all.length,dt)));
  H1('2. Dados gerais e critérios');B.push(dKV(critRows()));REPORT_NOTES.forEach(Pm);
  H1('3. Quadro resumo dos circuitos');
  B.push(dT([['Circuito','P kW','Ib A','Cabo','In A','ΔU %','Estado']].concat(all.map(c=>{const o=c.res,v=verdict(c);
    return [(c.code?c.code+' · ':'')+(c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome),{t:n1(c.p),a:'right'},{t:n1(c.Ib),a:'right'},o?cableDwg(c).replace(/^Cabo /,''):'—',{t:o?String(o.In):'—',a:'right'},{t:o?n2(o.du):'—',a:'right'},
      v.st==='ok'?{t:'OK',b:1,color:'1E8A19'}:{t:`A rever: ${v.why}`,b:1,color:'BF3328'}];})),[2600,800,800,2700,700,700,1300],{head:true,zebra:true}));
  const D=typeof solveDC==='function'?solveDC():null;
  if(D&&D.rows.length){H2('3.1 Lado DC (strings)');
    Pm(`Voc à temperatura mínima (${fs(D.D.tmin)} °C) e Vmp à temperatura da célula a quente (${fs(D.D.tcell)} °C). Cabo solar H1Z2Z2-K por string (+ e −): corrente de projeto 1,25 × Isc; corrente admissível pelo quadro RTIEBT do cobre XLPE com 2 condutores carregados (do lado da segurança). ΔU DC máx. ${fs(D.D.lim)} %.`);
    B.push(dT([['String','Módulos','Voc / máx. V','Isc / máx. A','Fusíveis','Cabo por string','ΔU %','Estado']].concat(D.rows.map(r=>{const d=r.inv||{},st=r.errs.length?'bad':r.warns.length?'warn':'ok';
      return [`${r.code} · Inversor ${+r.a.ii+1} · MPPT ${r.a.mppt}\n${r.a.pan||''}`,r.pdc?`${r.ns} × ${r.np}\n${n1(r.pdc)} kWp`:'—',r.voc?`${n0(r.voc)} / ${d.vmax}`:'—',r.voc?`${n1(r.isc)} / ${d.isc||'—'}`:'—',
        r.fuse?`gPV ${r.fuse.In} A × ${r.fuse.n}`:'—',r.cab&&r.voc?`2 × 1×${fs(r.cab.s)} mm², ${n0(r.cab.L)} m`:'—',r.cab&&r.voc?n2(r.cab.du):'—',
        {t:st==='bad'?'A rever':st==='warn'?'Aviso':'OK',b:1,color:st==='bad'?'BF3328':st==='warn'?'B06E00':'1E8A19'}];})),[2100,1100,1100,1100,1100,1700,600,800],{head:true,zebra:true}));
    const msgs=new Map();D.rows.forEach(r=>r.errs.concat(r.warns).forEach(m=>{(msgs.get(m)||msgs.set(m,[]).get(m)).push(r.code);}));
    msgs.forEach((cs,m)=>B.push(dP(`${cs.join(', ')}: ${m}`,{sz:17,color:'B06E00'})));}
  H1('4. Cálculo por circuito');
  all.forEach(c=>{const X=circRows(c),v=verdict(c);
    H2(`${c.code?c.code+' · ':''}${c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome} — ${v.st==='ok'?'OK':'A rever'}`);Pm(X.sub);
    if(!X.rows){B.push(dP('Sem valores tabelados para este modo de instalação e cabo.',{color:'BF3328'}));return;}
    B.push(dKV(X.rows));X.notes.forEach(t=>B.push(dP(t,{color:'BF3328',b:1})));});
  H1('5. Circuitos a rever');const bad=all.filter(c=>verdict(c).st!=='ok');
  if(!bad.length)B.push(dP('Todos os circuitos cumprem Ib ≤ In ≤ Iz, I₂ ≤ 1,45·Iz e a queda de tensão máxima por troço.'));
  else bad.forEach(c=>B.push(dP(`${c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome}: ${c.noFitMsg||c.gwErr||verdict(c).why}`,{color:'BF3328'})));
  /* unifilar: imagem PNG na largura útil da página (16 cm) */
  const cv=await svgToPng(sldSVG(R),2),png=new Uint8Array(await (await new Promise(r=>cv.toBlob(r,'image/png'))).arrayBuffer());
  const cx=Math.round(16*360000),cy=Math.round(cx*cv.height/cv.width);
  B.push(dP('6. Esquema unifilar',{style:'Heading1'}),`<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Esquema unifilar"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="unifilar.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
  const foot=`Solcor · Relatório de cálculo de cabos AC · ${S.proj||'Projeto sem nome'} · Rev. ${(S.obra&&S.obra.rev)||'A'}`;
  const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${B.join('')}<w:sectPr><w:footerReference w:type="default" r:id="rIdFoot"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}>${dP(foot,{sz:15,color:'5A6672'})}</w:ftr>`;
  const st=(id,name,rpr,ppr,base)=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${base?`<w:basedOn w:val="${base}"/><w:next w:val="Normal"/>`:''}<w:qFormat/>${ppr?`<w:pPr>${ppr}</w:pPr>`:''}<w:rPr>${rpr}</w:rPr></w:style>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:lang w:val="pt-PT"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${
    /* ordem dos elementos como no esquema (o Word recusa o ficheiro se não estiver): pPr = keepNext, pBdr, spacing, outlineLvl; rPr = b, color, sz */
    st('Normal','Normal','','')}${st('Title','Title','<w:b/><w:color w:val="1A2028"/><w:sz w:val="40"/>','<w:spacing w:after="60"/>','Normal')}${
    st('Heading1','heading 1','<w:b/><w:color w:val="1A2028"/><w:sz w:val="26"/>','<w:keepNext/><w:pBdr><w:left w:val="single" w:sz="24" w:space="6" w:color="38D430"/></w:pBdr><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/>','Normal')}${
    st('Heading2','heading 2','<w:b/><w:color w:val="1A2028"/><w:sz w:val="21"/>','<w:keepNext/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="1"/>','Normal')}</w:styles>`;
  const files=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/unifilar.png"/></Relationships>`],
    ['word/document.xml',doc],['word/styles.xml',styles],['word/footer1.xml',footer],['word/media/unifilar.png',png]];
  return new Blob([zipStore(files)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
document.addEventListener('click',async e=>{if(!e.target.closest('#report-docx'))return;
  try{await saveFile(`${fileBase()}_relatorio_calculo.docx`,await reportDocx(solveAll()));}
  catch(err){console.warn(err);toast('Não foi possível gerar o relatório Word');}
});
