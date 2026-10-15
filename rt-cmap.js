/* ---------- mapa de cabos para a obra: identificação C1…Cn (solveAll), Excel, PDF e etiquetas ----------
   A identificação segue a ordem da tabela de resultados (inversores e depois percursos) e aparece também no unifilar,
   no relatório e no orçamento. Usa xSheet/xlsxBlob e pdfTxt de rt-bom.js, cableDwg de rt-sld.js. */
function cableMapData(R){
  return R.invC.concat(R.pC).filter(c=>c.res&&c.Ib>0).map(c=>{const o=c.res,P=cableParts(o,c.loaded),m=MODE[c.r.ref];
    const orig=c.kind==='inv'?c.nome:c.ref.orig,dest=c.kind==='inv'?c.para:c.split?`${c.ref.dest} (entrada ${c.sub.nome})`:c.ref.dest;
    return {code:c.code,orig,dest,modelo:c.kind==='inv'?c.modelo:'',cabo:cableDwg(c).replace(/^Cabo /,''),
      fases:P.multi?P.cabo:P.fase,neutro:P.multi?'no mesmo cabo':P.neutro,terra:P.multi?'no mesmo cabo':P.terra,
      L:c.L,Lc:c.Lc,pass:`Ref. ${m.ref} · ${m.d}`,brk:o.brk?`${o.In} A ${c.loaded===2?'2P':'4P'} · ${o.brk.name}`:`${o.In} A ${c.loaded===2?'2P':'4P'}`,
      du:o.du,ok:verdict(c).st==='ok'};});
}
const cmapHead=()=>{const o=S.obra||{};return [S.proj||'Projeto sem nome',o.cliente,`Rev. ${o.rev||'A'}`].filter(Boolean).join(' · ');};
function cmapXlsx(rows){
  const b=v=>({v,s:1}),h=v=>({v,s:7}),r=[[{v:'Mapa de cabos',s:6}],[b('Projeto'),cmapHead()],[b('Data'),new Date().toLocaleDateString('pt-PT')],[]];
  r.push(['Código','Origem','Destino','Cabo (designação do unifilar)','Fases','Neutro','Terra','Comprimento (m)','A prever c/ folga (m)','Passagem','Disjuntor','ΔU %','Estado'].map(h));
  rows.forEach(x=>r.push([b(x.code),x.orig+(x.modelo?` (${x.modelo})`:''),x.dest,x.cabo,x.fases,x.neutro,x.terra,{v:x.L,s:4},{v:Math.round(x.Lc*10)/10,s:4},x.pass,x.brk,{v:Math.round(x.du*100)/100},x.ok?'OK':'A rever']));
  r.push([],['“A prever c/ folga”: comprimento de cálculo (+20 % abaixo de 30 m, +10 % a partir de 30 m). A identificação Cn é a do unifilar.']);
  return xlsxBlob([['Mapa de cabos',xSheet(r,[8,26,26,34,26,24,20,14,16,44,36,8,10])]]);
}
async function cmapPdf(rows){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'});
  const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),M=10;let y=M;
  const cols=[{t:'Cód.',w:12},{t:'Origem',w:34},{t:'Destino',w:34},{t:'Cabo',w:60},{t:'L (m)',w:14,a:'r'},{t:'Prever (m)',w:17,a:'r'},{t:'Passagem',w:52},{t:'Disjuntor',w:42},{t:'dU %',w:12,a:'r'}];
  const foot=()=>{pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(120);pdf.text(pdfTxt(`Solcor · Mapa de cabos · ${cmapHead()}`),M,H-6);pdf.text(String(pdf.internal.getNumberOfPages()),W-M,H-6,{align:'right'});pdf.setTextColor(26,32,40);};
  const head=()=>{pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setFillColor(227,247,225);pdf.rect(M,y-3.8,W-2*M,5.4,'F');let x=M;
    cols.forEach(c=>{pdf.text(pdfTxt(c.t),c.a==='r'?x+c.w-1:x+1,y,{align:c.a==='r'?'right':'left'});x+=c.w;});y+=5;};
  pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.setTextColor(26,32,40);pdf.text('Mapa de cabos',M,y+3);
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(pdfTxt(`${cmapHead()} · ${new Date().toLocaleDateString('pt-PT')}`),W-M,y+3,{align:'right'});
  pdf.setDrawColor(56,212,48);pdf.setLineWidth(0.6);pdf.line(M,y+5.5,W-M,y+5.5);y+=12;head();
  rows.forEach(x=>{const cells=[x.code,x.orig+(x.modelo?` (${x.modelo})`:''),x.dest,x.cabo,fmt(x.L,0),fmt(x.Lc,1),x.pass,x.brk,fmt(x.du,2)];
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);const ls=cells.map((t,i)=>pdf.splitTextToSize(pdfTxt(t),cols[i].w-2));const h=Math.max(...ls.map(l=>l.length))*3.4+1.6;
    if(y+h>H-12){foot();pdf.addPage();y=M+4;head();pdf.setFont('helvetica','normal');pdf.setFontSize(8);}
    let cx=M;ls.forEach((l,i)=>{const c=cols[i];if(i===0)pdf.setFont('helvetica','bold');pdf.text(l,c.a==='r'?cx+c.w-1:cx+1,y,{align:c.a==='r'?'right':'left'});if(i===0)pdf.setFont('helvetica','normal');cx+=c.w;});
    if(!x.ok){pdf.setTextColor(198,40,40);pdf.text('A rever',W-M,y,{align:'right'});pdf.setTextColor(26,32,40);}
    pdf.setDrawColor(216,222,228);pdf.setLineWidth(0.2);pdf.line(M,y+h-3.2,W-M,y+h-3.2);y+=h;});
  y+=3;pdf.setFontSize(7.5);pdf.setTextColor(90);pdf.text(pdfTxt('"Prever": comprimento de cálculo (+20 % abaixo de 30 m, +10 % a partir de 30 m). A identificação Cn é a do esquema unifilar.'),M,Math.min(y,H-12));
  foot();return pdf.output('blob');
}
/* etiquetas: duas por cabo (uma em cada ponta), folha A4 de 24 etiquetas 70 × 37 mm (3 × 8, sem margens) */
async function cmapLabels(rows){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4'});const LW=70,LH=37.125;
  const labels=rows.flatMap(x=>[[x,x.orig],[x,x.dest]]);
  labels.forEach(([x,ponta],i)=>{const k=i%24;if(i&&!k)pdf.addPage();const X=(k%3)*LW,Y=Math.floor(k/3)*LH;
    pdf.setDrawColor(220);pdf.setLineWidth(0.1);pdf.rect(X+1,Y+1,LW-2,LH-2);
    pdf.setFont('helvetica','bold');pdf.setFontSize(20);pdf.setTextColor(26,32,40);pdf.text(x.code,X+5,Y+11);
    pdf.setFontSize(7.5);pdf.setFont('helvetica','normal');pdf.setTextColor(90);pdf.text(pdfTxt(`ponta: ${ponta}`),X+LW-5,Y+7.5,{align:'right',maxWidth:38});
    pdf.setTextColor(26,32,40);pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text(pdfTxt(`${x.orig} -> ${x.dest}`),X+5,Y+18,{maxWidth:LW-10});
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.8);pdf.text(pdf.splitTextToSize(pdfTxt(x.cabo),LW-10).slice(0,2),X+5,Y+24);
    pdf.text(pdfTxt(`${fmt(x.L,0)} m · ${x.brk.split(' · ')[0]}`),X+5,Y+33);});
  return pdf.output('blob');
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-cmap]');if(!b)return;
  try{const rows=cableMapData(last);if(!rows.length)return toast('Sem cabos para o mapa');const k=b.dataset.cmap;
    if(k==='xlsx')await saveFile(`${fileBase()}_mapa_cabos.xlsx`,cmapXlsx(rows));
    else if(k==='pdf')await saveFile(`${fileBase()}_mapa_cabos.pdf`,await cmapPdf(rows));
    else await saveFile(`${fileBase()}_etiquetas.pdf`,await cmapLabels(rows));
  }catch(err){console.warn(err);toast('Não foi possível gerar o mapa de cabos');}
});
