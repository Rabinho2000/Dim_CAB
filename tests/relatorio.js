/* relatório de cálculo em PDF: gera-o pelo botão para o exemplo de origem e para o caso sem secção possível (2 × 150 kW em tubo, ref. 3A).
   Grava tests/relatorio_exemplo.pdf e tests/relatorio_sem_solucao.pdf, lê o texto com o pdf.js e desenha as páginas em tests/relatorio_*_pN.png.
   Tem de dar "ERR []" (sai com código 1 se não). */
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const r=(ref,cons)=>({ref,cons,disp:'trevo',trays:1,sol:false});
const CASES=[
  {nome:'exemplo',st:null,tem:['Relatório de cálculo','Identificação da obra','52-C','Fator de agrupamento','Disjuntor ABB','Esquema unifilar','Todos os circuitos cumprem']},
  {nome:'sem_solucao',st:{invs:[1,2].map(()=>({modelo:'SUN2000-150K-MG0',pman:0,q:'QFV',L:5,S:'auto'})),rInv:r('3A','mono'),percs:[{orig:'QFV',dest:'Qentrada',L:5,S:'auto',...r('3A','mono')}],gws:[]},
   tem:['Relatório de cálculo','Nenhuma secção cumpre','Circuitos a rever','Esquema unifilar']}];
(async()=>{const b=await chromium.launch();const errs=[];
for(const k of CASES){
  const ctx=await b.newContext({acceptDownloads:true,viewport:{width:1400,height:900}});const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push(`${k.nome}: ${e.message}`));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(`${k.nome}: ${m.text()}`);});
  if(k.st)await p.addInitScript(s=>{try{localStorage.setItem('cabosrt.v1',s);}catch(e){}},JSON.stringify(k.st));
  await p.goto(url.pathToFileURL(path.resolve('cabos-rt.html')).href);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#report')]);
  const out=path.join('tests',`relatorio_${k.nome}.pdf`);await dl.saveAs(out);
  const buf=fs.readFileSync(out);if(buf.slice(0,4).toString()!=='%PDF')errs.push(`${k.nome}: o ficheiro não é um PDF`);
  /* texto e imagens das páginas com o pdf.js */
  const v=await ctx.newPage();await v.setContent('<!doctype html><meta charset=utf-8><body>');
  await v.addScriptTag({url:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'});
  const pages=await v.evaluate(async b64=>{const lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const data=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const doc=await lib.getDocument({data}).promise;const out=[];
    for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i);const tc=await pg.getTextContent();const vp=pg.getViewport({scale:1.6});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      out.push({txt:tc.items.map(t=>t.str).join(' '),png:cv.toDataURL('image/png').split(',')[1]});}
    return out;},buf.toString('base64'));
  pages.forEach((pg,i)=>fs.writeFileSync(path.join('tests',`relatorio_${k.nome}_p${i+1}.png`),Buffer.from(pg.png,'base64')));
  const txt=pages.map(x=>x.txt).join(' ').replace(/\s+/g,' ');
  k.tem.forEach(t=>{if(!txt.includes(t))errs.push(`${k.nome}: falta "${t}" no PDF`);});
  console.log(`${k.nome}: ${pages.length} páginas, ${(buf.length/1024).toFixed(0)} kB`);
  await ctx.close();}
console.log('ERR',errs);await b.close();process.exitCode=errs.length?1:0;})();
