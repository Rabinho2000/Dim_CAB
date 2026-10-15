/* resumo dos projetos e acompanhamento em obra, no servidor próprio: a Ana guarda e aprova; o Rui marca cabos como lançados/ligados
   numa revisão aprovada; a Ana vê quem marcou; o resumo soma por estado e mostra €/kW. Gera tests/obra.png. Tem de dar "ERR []". */
const { chromium } = require('playwright');const {createServer}=require('../server/server.js');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const srv=createServer({dbPath:':memory:',admins:''});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${srv.address().port}/`;const b=await chromium.launch();
const open=async n=>{const ctx=await b.newContext({viewport:{width:1300,height:1000}});await ctx.addInitScript(n=>{try{localStorage.setItem('cabosrt.user',n);}catch(e){}},n);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(`${n}: ${e.message}`));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#pj-save').disabled);return p;};
const until=(p,fn,a)=>p.waitForFunction(fn,a,{timeout:10000}).then(()=>true,()=>false);
const ana=await open('Ana'),rui=await open('Rui');
await ana.fill('#proj','Obra em curso');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
await until(ana,()=>document.querySelector('#pj-body').innerText.includes('Obra em curso'));
await ana.click('#obra-aprov');await ana.click('[data-ap=ok]');await until(ana,()=>!document.querySelector('#lockbar').hidden);
/* resumo */
await rui.click('[data-tab=proj]');
check(await until(rui,()=>/aprovado\s*1\s*500 kW AC/i.test(document.querySelector('#pj-sum').innerText)),'resumo: 1 aprovado com 500 kW AC');
check(await until(rui,()=>/€\/kW/.test(document.querySelector('#pj-sum').innerText)),'resumo: custo por kW');
/* acompanhamento numa revisão aprovada */
await rui.click('[data-popen]');await rui.click('[data-tab=proj]');await rui.click('.trkbox summary');
check((await rui.$$('#trk-body tr')).length===6,'6 cabos para acompanhar (C1…C6)');
await rui.check('[data-trk="C1|lan"]');await until(rui,()=>/Rui/.test(document.querySelector('#trk-body tr').innerText));
await rui.check('[data-trk="C1|lig"]');await until(rui,()=>/2 de 18/.test(document.querySelector('#trk-prog').innerText));
check(/2 de 18 passos \(11 %\)/.test(await rui.$eval('#trk-prog',e=>e.innerText)),'progresso: 2 de 18 passos');
check(await rui.evaluate(()=>!!S.obra.aprov),'a revisão continua aprovada');
await rui.screenshot({path:__dirname+'/obra.png'});
/* a Ana abre e vê as marcas do Rui */
await ana.click('[data-tab=proj]');await ana.click('.trkbox summary'); /* sem reabrir: as marcas do Rui chegam pela atualização da lista */
check(await until(ana,()=>/Lançado[\s\S]*Rui/.test(document.querySelector('#trk-body tr').innerText)),'a Ana vê "Lançado · Rui"');
await ana.uncheck('[data-trk="C1|lig"]');
check(await until(rui,()=>true)&&await until(ana,()=>/1 de 18/.test(document.querySelector('#trk-prog').innerText)),'desmarcar volta a 1 de 18');
console.log('ERR',errs);await b.close();srv.close();process.exit(errs.length?1:0);})();
