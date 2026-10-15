/* lista de materiais e orçamento: abre o exemplo de origem, descarrega o Excel e o PDF pelos botões e confere os totais com solveAll().
   Repete com 25 % de desconto ABB. O .xlsx é lido com openpyxl (Python). Gera tests/orcamento.xlsx e tests/orcamento.pdf; tem de dar "ERR []". */
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const near=(a,b)=>Math.abs(a-b)<=0.01+1e-6*Math.abs(b);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900},acceptDownloads:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g/.test(m.text()))errs.push(m.text());});
await p.goto(require('url').pathToFileURL(path.resolve('cabos-rt.html')).href);
await p.evaluate(()=>{window.__bomPdfPlain=true;}); /* PDF sem compressão, para se ler o texto */
const get=async(sel,file)=>{const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click(sel)]);await d.saveAs(file);return d.suggestedFilename();};
for(const desc of [0,25]){
  await p.click('[data-tab=ac]');
  await p.evaluate(d=>{S.descABB=d;document.getElementById('descABB').value=d;render();},desc);
  const ref=await p.evaluate(()=>{const R=solveAll(),B=bomData(R);
    return {costTot:R.costTot,brkTot:R.brkTot,tCab:B.tCab,tProt:B.tProt,total:B.total,nCab:B.cabos.length,nProt:B.prot.length,nQuad:B.quad.length,
      metros:B.cabos.reduce((a,x)=>a+x.m,0),pdfTot:[B.tCab,B.tProt,B.total].map(v=>pdfTxt(eur2(v)))};});
  const fx=`tests/orcamento${desc?'_desc':''}.xlsx`,fp=`tests/orcamento${desc?'_desc':''}.pdf`;
  const nx=await get('[data-bom=xlsx]',fx);
  await p.click('[data-tab=brd]');await p.waitForTimeout(200);
  const np=await get('[data-pane=brd] [data-bom=pdf]',fp);
  /* Excel: valores das linhas de total e soma das linhas (metros × €/m e quantidade × PVP × (1 − desconto)) */
  const py=`import openpyxl,json,sys
wb=openpyxl.load_workbook(sys.argv[1],data_only=True);ws=wb['Orçamento'];rows=[[c.value for c in r] for r in ws.iter_rows()]
tot=lambda k:next(r[4] for r in rows if r and r[0]==k)
cab=0;prot=0;sec=None
for r in rows:
  if r[0]=='Cabos':sec='c'
  elif r[0]=='Disjuntores e diferenciais ABB':sec='p'
  elif r[0] in ('Função','Tipo') or r[0] is None or str(r[0]).startswith('Total'):continue
  elif sec=='c' and isinstance(r[3],(int,float)):cab+=r[2]*r[3]
  elif sec=='p' and isinstance(r[2],(int,float)):prot+=r[2]*r[3]*(1-${desc}/100)
print(json.dumps({'tCab':tot('Total cabos'),'tProt':tot('Total proteções'),'total':tot('Total geral'),'sumCab':cab,'sumProt':prot,'sheets':wb.sheetnames,'quadros':sum(1 for r in wb['Quadros'].iter_rows(values_only=True) if r[0]=='Envolvente')}))`;
  const X=JSON.parse(execFileSync('python',['-c',py,fx],{encoding:'utf8'}));
  const pdf=fs.readFileSync(fp).toString('latin1');
  const chk={
    'nomes':nx.endsWith('_orcamento.xlsx')&&np.endsWith('_orcamento.pdf'),
    'motor: cabos = costTot':near(ref.tCab,ref.costTot),'motor: proteções = brkTot':near(ref.tProt,ref.brkTot),
    'xlsx: total cabos':near(X.tCab,ref.costTot),'xlsx: total proteções':near(X.tProt,ref.brkTot),'xlsx: total geral':near(X.total,ref.costTot+ref.brkTot),
    'xlsx: linhas de cabo somam o total':near(X.sumCab,ref.costTot),'xlsx: linhas ABB somam o total':near(X.sumProt,ref.brkTot),
    'xlsx: folha Quadros':X.sheets.includes('Quadros')&&X.quadros===ref.nQuad&&ref.nQuad>0,
    'pdf: cabeçalho':pdf.startsWith('%PDF'),'pdf: totais':ref.pdfTot.every(t=>pdf.includes('('+t.replace(/€/g,'\x80')+')') /* € em WinAnsi */),
    'pdf: quadros':/Composi..o dos quadros/.test(pdf)};
  console.log(`desconto ${desc} %: cabos ${ref.costTot.toFixed(2)} € (${ref.nCab} linhas, ${ref.metros.toFixed(1)} m) · ABB ${ref.brkTot.toFixed(2)} € (${ref.nProt} linhas) · ${ref.nQuad} quadros`);
  Object.entries(chk).forEach(([k,v])=>{if(!v)errs.push('falhou: '+k);});
  if(Object.values(chk).some(v=>!v))console.log(JSON.stringify({ref,X},null,1));
}
console.log('ERR',errs);await b.close();if(errs.length)process.exitCode=1;})();
