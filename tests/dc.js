/* separador Strings DC: sugestão de strings (DC/AC ≈ 1,2 sem erros), erros ao mudar a string, fusíveis, e o lado DC no orçamento,
   no mapa de cabos e no relatório PDF. Gera tests/dc.png. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000},acceptDownloads:true});p.on('pageerror',e=>errs.push(e.message));
await p.goto(require('url').pathToFileURL(path.resolve(__dirname,'..','cabos-rt.html')).href);
await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});await p.reload();
await p.click('[data-tab=dc]');
check(/Ainda não há strings/.test(await p.$eval('#dc-body',e=>e.innerText)),'começa sem strings');
await p.click('#dc-fill');
const R=await p.evaluate(()=>{const R=solveDC();return {n:R.rows.length,bad:R.bad,ratios:R.invs.map(g=>g.ratio),pdc:R.pdc};});
check(R.n>0&&R.bad===0,`sugestão: ${R.n} MPPT, nenhum a rever`);
check(R.ratios.every(x=>x>=1.15&&x<=1.4),`DC/AC perto de 1,2 (${R.ratios.map(x=>x.toFixed(2)).join(', ')})`);
check(/kWp DC · todas verificadas/.test(await p.$eval('#dc-sum',e=>e.innerText)),'resumo: todas verificadas');
/* erro: string comprida demais */
await p.fill('#dc-body tr:first-child input[data-d=nser]','21');
check(/Voc a -3 °C = .* > 1100 V do inversor: no máximo 20 módulos por string/.test(await p.$eval('#dc-res-body tr:first-child',e=>e.innerText)),'21 módulos: Voc acima de 1100 V, a rever');
await p.fill('#dc-body tr:first-child input[data-d=nser]','20');
/* temperatura mínima mais baixa (Bragança) reduz os módulos por string */
await p.click('[data-tab=ac]');await p.selectOption('#loc','Bragança');await p.click('[data-tab=dc]');
const vb=await p.evaluate(()=>solveDC().rows[0].voc);
check(await p.$eval('#dc-tmin',e=>e.value)==='-12'&&vb>1090&&vb<1100,`Bragança (−12 °C): a temperatura mínima muda e o Voc de 20 módulos sobe para ${vb.toFixed(0)} V (ainda < 1100 V)`);
await p.click('[data-tab=ac]');await p.selectOption('#loc','Porto');await p.click('[data-tab=dc]');
/* fusíveis: 3 strings em paralelo num MPPT do 150K-MG0 */
const k=await p.evaluate(()=>S.dc.arr.findIndex(a=>S.invs[a.ii].modelo==='SUN2000-150K-MG0'));
await p.fill(`#dc-body tr:nth-child(${k+1}) input[data-d=npar]`,'3');
check(/gPV 25 A\s*6 fusíveis/.test(await p.$eval(`#dc-res-body tr:nth-child(${k+1})`,e=>e.innerText)),'3 strings em paralelo: 6 fusíveis gPV 25 A');
await p.screenshot({path:path.join(__dirname,'dc.png')});
/* orçamento, mapa de cabos, relatório */
const B=await p.evaluate(()=>{const B=bomData(last),R=solveDC();return {m:B.dcCab.reduce((a,x)=>a+x.m,0),metros:R.metros,fus:B.dcFus.reduce((a,x)=>a+x.q,0),fusR:R.rows.reduce((a,r)=>a+(r.fuse?r.fuse.n:0),0),map:cableMapData(last).filter(x=>/^D\d+$/.test(x.code)).length,rows:R.rows.length};});
check(Math.abs(B.m-B.metros)<1e-6&&B.m>0,`orçamento: ${B.m.toFixed(0)} m de cabo solar = soma das strings`);
check(B.fus===B.fusR&&B.fus>=6,`orçamento: ${B.fus} fusíveis gPV, os mesmos das strings`);
check(B.map===B.rows,`mapa de cabos: ${B.map} linhas D (uma por MPPT)`);
const [d]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click('#report')]);const fp=path.join(__dirname,'relatorio_dc.pdf');await d.saveAs(fp);
check(fs.readFileSync(fp).toString('latin1').startsWith('%PDF'),'relatório com lado DC gera sem erros');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
