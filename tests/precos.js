/* preços a partir do Excel de compras, lido na página:
   1) jmm/base.xlsx dá exatamente o mesmo que mkprice.py (jmm/prices.json);
   2) no servidor próprio, carregar tests/fixtures/compras_teste.xlsx mostra o que muda, guarda só os novos/mais recentes
      e os cálculos passam a usar o preço novo. Tem de dar "ERR []". */
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const {createServer}=require('../server/server.js');
(async()=>{
const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const srv=createServer({dbPath:':memory:',admins:''});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${srv.address().port}/`;
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:900}});
await ctx.addInitScript(()=>{try{localStorage.setItem('cabosrt.user','Ana');}catch(e){}});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#pj-save').disabled);

/* 1) igual a mkprice.py */
const b64=fs.readFileSync(path.join(__dirname,'..','jmm','base.xlsx')).toString('base64');
const got=await p.evaluate(async b64=>{const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));return pricesFromSheets(await readXlsx(u.buffer));},b64);
const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'..','jmm','prices.json'),'utf8'));
check(JSON.stringify(got)===JSON.stringify(ref),`jmm/base.xlsx lido na página = jmm/prices.json de mkprice.py (${got.length} preços)`);
if(JSON.stringify(got)!==JSON.stringify(ref))console.log('   página:',JSON.stringify(got).slice(0,400),'\n   python:',JSON.stringify(ref).slice(0,400));

/* 2) carregar um Excel novo */
const cost0=await p.evaluate(()=>last.costTot);
await p.click('[data-tab=eq]');await p.click('[data-eq=pr]');
await p.setInputFiles('#eq-xlsx',path.join(__dirname,'fixtures','compras_teste.xlsx'));
await p.waitForSelector('#pi-save');
const st=await p.$$eval('#eq-preview tbody tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' ').trim()));console.log('   '+st.join('\n   '));
check(st.length===4,'4 preços de 2026 (a compra de 2025 não conta)');
check(st.some(r=>/1×?120|120/.test(r)&&/mais recente/i.test(r))&&st.some(r=>/185/.test(r)&&/novo/i.test(r))&&st.some(r=>/240/.test(r)&&/mais antigo/i.test(r))&&st.some(r=>/^Alumínio.* 50 /.test(r)&&/já está/i.test(r)),'estados: 120 mais recente, 185 novo, 240 mais antigo, 50 já está');
check(/Guardar 2 preços/.test(await p.$eval('#pi-save',e=>e.textContent)),'guarda só os 2 que mudam');
await p.screenshot({path:path.join(__dirname,'precos.png'),fullPage:false});
await p.click('#pi-save');
const upd=await p.waitForFunction(()=>{const r=PRICES.find(x=>x[0]==='Al'&&x[1]==='mono'&&x[2]===120);return r&&r[3]===1.95&&r[4]==='2026-09-30'&&PRICES.some(x=>x[0]==='Al'&&x[2]===185);},null,{timeout:10000}).then(()=>true,()=>false);
check(upd,'os preços em uso passam a ter LXV 120 a 1,95 €/m (30/09/2026) e LXV 185');
const r240=await p.evaluate(()=>PRICES.find(x=>x[0]==='Al'&&x[1]==='mono'&&x[2]===240));
check(r240[3]===4.1825,'o LXV 240 mantém a compra mais recente (4,1825 €/m), não a mais antiga do Excel');
const cost1=await p.evaluate(()=>last.costTot);
check(cost1<cost0,`o custo dos cabos desce com o preço novo (${cost0.toFixed(2)} → ${cost1.toFixed(2)} €)`);
check(await p.$eval('#eq-table',e=>/1,9500/.test(e.innerText)),'a tabela de preços mostra 1,9500');

console.log('ERR',errs);await b.close();srv.close();process.exit(errs.length?1:0);})();
