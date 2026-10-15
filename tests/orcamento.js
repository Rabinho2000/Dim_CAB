/* orçamento (PDF): abre o exemplo de origem, descarrega o PDF pelos botões dos separadores Cabos AC e Quadros e confere os totais com solveAll().
   Repete com 25 % de desconto ABB. Gera tests/orcamento.pdf; tem de dar "ERR []". */
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const near=(a,b)=>Math.abs(a-b)<=0.01+1e-6*Math.abs(b);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900},acceptDownloads:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g/.test(m.text()))errs.push(m.text());});
await p.goto(require('url').pathToFileURL(path.resolve('cabos-rt.html')).href);
await p.evaluate(()=>{window.__bomPdfPlain=true;}); /* PDF sem compressão, para se ler o texto */
const get=async(sel,file)=>{const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click(sel)]);await d.saveAs(file);return d.suggestedFilename();};
for(const desc of [0,25]){const hag=desc?30:0;
  await p.click('[data-tab=ac]');
  await p.evaluate(([d,h])=>{S.descABB=d;S.descHager=h;document.getElementById('descABB').value=d;document.getElementById('descHager').value=h;render();},[desc,hag]);
  const ref=await p.evaluate(()=>{const R=solveAll(),B=bomData(R);
    return {tEnv:B.tEnv,nEnv:B.envs.length,costTot:R.costTot,brkTot:R.brkTot,termTot:R.termTot,tCab:B.tCab,tProt:B.tProt,tTerm:B.tTerm,total:B.total,nCab:B.cabos.length,nProt:B.prot.length,nTerm:B.terms.length,nQuad:B.quad.length,
      metros:B.cabos.reduce((a,x)=>a+x.m,0),nTermUn:B.terms.reduce((a,x)=>a+x.q,0),pdfTot:[B.tCab,B.tTerm,B.tProt,B.total].map(v=>pdfTxt(eur2(v)))};});
  const fp=`tests/orcamento${desc?'_desc':''}.pdf`;
  const na=await get('[data-pane=ac] [data-bom=pdf]',fp);
  await p.click('[data-tab=brd]');await p.waitForTimeout(200);
  const np=await get('[data-pane=brd] [data-bom=pdf]',fp);
  const pdf=fs.readFileSync(fp).toString('latin1');
  const chk={
    'nomes':na.endsWith('_orcamento.pdf')&&np.endsWith('_orcamento.pdf'),
    'motor: cabos = costTot':near(ref.tCab,ref.costTot),'motor: proteções = brkTot':near(ref.tProt,ref.brkTot),
    'motor: terminais = termTot':near(ref.tTerm,ref.termTot)&&ref.termTot>0,
    'motor: total geral':near(ref.total,ref.costTot+ref.termTot+ref.brkTot+ref.tEnv),
    'envolventes: 2 quadros novos com preço Hager':ref.nEnv===2&&ref.tEnv>0,
    'sem botões Excel nem mapa de cabos':await p.evaluate(()=>!document.querySelector('[data-bom=xlsx],[data-cmap]')),
    'pdf: cabeçalho':pdf.startsWith('%PDF'),'pdf: totais':ref.pdfTot.every(t=>pdf.includes('('+t.replace(/€/g,'\x80')+')') /* € em WinAnsi */),
    'pdf: quadros':/Composi..o dos quadros/.test(pdf)};
  console.log(`desconto ABB ${desc} % · Hager ${hag} %: envolventes ${ref.tEnv.toFixed(2)} € (${ref.nEnv}) · cabos ${ref.costTot.toFixed(2)} € (${ref.nCab} linhas, ${ref.metros.toFixed(1)} m) · terminais ${ref.termTot.toFixed(2)} € (${ref.nTermUn} unid.) · ABB ${ref.brkTot.toFixed(2)} € (${ref.nProt} linhas) · ${ref.nQuad} quadros`);
  Object.entries(chk).forEach(([k,v])=>{if(!v)errs.push('falhou: '+k);});
  if(Object.values(chk).some(v=>!v))console.log(JSON.stringify({ref},null,1));
}
console.log('ERR',errs);await b.close();if(errs.length)process.exitCode=1;})();
