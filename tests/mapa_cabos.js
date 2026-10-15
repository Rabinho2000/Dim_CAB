/* mapa de cabos: identificação C1…Cn na tabela, no unifilar e no orçamento; Excel e PDF pelos botões; etiquetas (2 por cabo, 24 por folha).
   O Excel é lido com a própria página (readXlsx de rt-pimport.js). Gera tests/mapa_cabos.xlsx/.pdf e tests/etiquetas.pdf; tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900},acceptDownloads:true});p.on('pageerror',e=>errs.push(e.message));
await p.goto(require('url').pathToFileURL(path.resolve(__dirname,'..','cabos-rt.html')).href);
const get=async(sel,file)=>{const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click(sel)]);await d.saveAs(file);return d.suggestedFilename();};
const rows=await p.evaluate(()=>cableMapData(last));
check(rows.length===6&&rows.map(r=>r.code).join()==='C1,C2,C3,C4,C5,C6','6 cabos, C1 a C6');
check(await p.$eval('#res-body',e=>/C1\s*Inversor 1 → QFV/.test(e.innerText)&&/C6\s*QInterligação → Qentrada/.test(e.innerText)),'a tabela de resultados mostra a identificação');
await p.click('[data-tab=sld]');
check(await p.waitForFunction(()=>/C5 · Cabo \(LXV\)/.test(document.querySelector('#sld').innerHTML),null,{timeout:5000}).then(()=>true,()=>false),'o unifilar mostra "C5 · Cabo (LXV)"');
await p.click('[data-tab=ac]');
check(await p.evaluate(()=>bomData(last).cabos.every(x=>x.circ.every(c=>/^C\d+ · /.test(c)))),'o orçamento indica os circuitos pela identificação');
/* Excel */
const fx=path.join(__dirname,'mapa_cabos.xlsx');check((await get('[data-cmap=xlsx]',fx)).endsWith('_mapa_cabos.xlsx'),'descarrega o Excel');
const X=await p.evaluate(async b64=>{const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));return (await readXlsx(u.buffer))['Mapa de cabos'];},fs.readFileSync(fx).toString('base64'));
const head=X.findIndex(r=>r[0]==='Código'),data=X.slice(head+1).filter(r=>/^C\d+$/.test(r[0]||''));
check(head>0&&data.length===6,`Excel com cabeçalho e 6 linhas (${data.length})`);
const c5=data.find(r=>r[0]==='C5')||[];
check(c5[1]==='QFV'&&c5[2]==='QInterligação'&&/^\(LXV\) 3x\(3x240\)\+1x\(3x120\)\+1G120 mm²$/.test(c5[3])&&c5[7]===140&&Math.abs(c5[8]-154)<1e-9,`C5: QFV → QInterligação, (LXV) 3x(3x240)+1x(3x120)+1G120, 140 m, 154 m a prever (${c5.slice(0,9).join(' | ')})`);
/* PDF e etiquetas */
const fp=path.join(__dirname,'mapa_cabos.pdf'),fl=path.join(__dirname,'etiquetas.pdf');
check((await get('[data-cmap=pdf]',fp)).endsWith('_mapa_cabos.pdf')&&fs.readFileSync(fp).toString('latin1').startsWith('%PDF'),'descarrega o PDF');
check((await get('[data-cmap=lbl]',fl)).endsWith('_etiquetas.pdf'),'descarrega as etiquetas');
const pages=(fs.readFileSync(fl).toString('latin1').match(/\/Type \/Page[^s]/g)||[]).length;
check(pages===1,`12 etiquetas (2 por cabo) numa folha de 24 (${pages} página)`);
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
