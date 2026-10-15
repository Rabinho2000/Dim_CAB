/* aprovação e revisões no servidor próprio, com a Ana e o Rui:
   não se aprova com circuitos a rever; a Ana aprova a revisão A; fica só de leitura para os dois (barra no topo, campos fechados,
   "Guardar" abre a explicação); o Rui passa o estado para "Em obra"; o Rui cria a revisão B, que volta a rascunho e grava;
   as versões mostram a A aprovada; o relatório e o unifilar levam a revisão. Gera tests/aprovacao.png. Tem de dar "ERR []". */
const { chromium } = require('playwright');
const {createServer}=require('../server/server.js');
(async()=>{
const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const srv=createServer({dbPath:':memory:',admins:''});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${srv.address().port}/`;const b=await chromium.launch();
const open=async name=>{const ctx=await b.newContext({viewport:{width:1300,height:900}});
  await ctx.addInitScript(n=>{try{localStorage.setItem('cabosrt.user',n);}catch(e){}},name);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(`${name}: ${e.message}`));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#pj-save').disabled);return p;};
const until=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:10000}).then(()=>true,()=>false);
const toastHas=(p,re)=>until(p,s=>new RegExp(s,'i').test(document.querySelector('#toast').textContent),re);

const ana=await open('Ana'),rui=await open('Rui');
await ana.fill('#proj','Obra Aprovação');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
await until(ana,()=>document.querySelector('#pj-body').innerText.includes('Obra Aprovação'));

/* com circuitos a rever não se aprova */
await ana.click('[data-tab=ac]');await ana.fill('#limT','0.1');await ana.click('[data-tab=proj]');await ana.click('#obra-aprov');
check(await toastHas(ana,'a rever.*antes de aprovar')&&await ana.$eval('#pjdlg',e=>e.hidden),'com circuitos a rever, não deixa aprovar');
await ana.click('[data-tab=ac]');await ana.fill('#limT','3');await ana.click('[data-tab=proj]');

/* a Ana aprova */
check(/Aprovar revisão A/.test(await ana.$eval('#obra-aprov',e=>e.textContent)),'botão "Aprovar revisão A"');
await ana.click('#obra-aprov');await ana.click('[data-ap=ok]');
check(await until(ana,()=>!document.querySelector('#lockbar').hidden&&/Revisão A aprovada por Ana/.test(document.querySelector('#lockbar').innerText)),'barra no topo: "Revisão A aprovada por Ana"');
check(await ana.$eval('[data-obra=cliente]',e=>e.disabled),'os dados da obra ficam fechados');
check(!(await ana.$('#pj-body [data-pdel]'))&&!(await ana.$eval('#pj-save',e=>e.classList.contains('pri'))),'nem a autora tem "Apagar"; "Guardar" deixa de ser o botão principal');
check(JSON.stringify(await ana.$$eval('[data-obra=estado] option',o=>o.map(x=>x.value)))==='["aprovado","obra","concluido"]','estados possíveis: aprovado, em obra, concluído');
await ana.screenshot({path:__dirname+'/aprovacao.png'});
await ana.click('[data-tab=ac]');await ana.fill('#proj','Mudança depois de aprovar');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
check(await until(ana,()=>!document.querySelector('#pjdlg').hidden&&/só de leitura/.test(document.querySelector('#pjdlg').innerText)),'"Guardar" numa revisão aprovada explica que é só de leitura');
await ana.click('[data-nr=cancel]');

/* o Rui vê, abre, e está fechado para ele também */
await rui.click('[data-tab=proj]');
check(await until(rui,()=>/aprovado/i.test(document.querySelector('#pj-body').innerText)&&/Rev\. A/.test(document.querySelector('#pj-body').innerText)),'a lista do Rui mostra "Aprovado · Rev. A"');
check(!(await rui.$('#pj-body [data-pdel]')),'ninguém tem botão para apagar (não é autor)');
await rui.click('[data-popen]');
check(await until(rui,()=>!document.querySelector('#lockbar').hidden),'o projeto abre fechado para o Rui');
await rui.click('[data-tab=proj]');await rui.selectOption('[data-obra=estado]','obra');
check(await toastHas(rui,'Estado atualizado'),'o Rui passa o estado para "Em obra"');
check(await until(ana,()=>/em obra/i.test(document.querySelector('#pj-body').innerText)),'a Ana vê "Em obra"');

/* o relatório e o unifilar levam a revisão */
await rui.click('[data-tab=sld]');
check(await until(rui,()=>/Desenho nº\s*· Rev\. A|Rev\. A/.test(document.body.innerHTML)),'o unifilar mostra "Rev. A"');

/* nova revisão */
await rui.click('[data-newrev]');await rui.click('[data-nr=ok]');
check(await until(rui,()=>document.querySelector('#lockbar').hidden),'revisão B: deixa de estar fechado');
await rui.click('[data-tab=proj]');
check(/Revisão B · não aprovada/.test(await rui.$eval('#obra-rev',e=>e.innerText)),'"Revisão B · não aprovada"');
check(await until(rui,()=>/rascunho/i.test(document.querySelector('#pj-body').innerText)&&/Rev\. B/.test(document.querySelector('#pj-body').innerText)),'a lista mostra "Rascunho · Rev. B"');
await rui.click('[data-tab=ac]');await rui.fill('#proj','Obra Aprovação (rev. B)');await rui.click('[data-tab=proj]');await rui.click('#pj-save');
check(await toastHas(rui,'guardado para a equipa'),'a revisão B grava normalmente');
await rui.click('[data-pver]');
check(await until(rui,()=>/A\s*aprovada/i.test(document.querySelector('#pjdlg').innerText)),'as versões mostram a revisão A aprovada');

console.log('ERR',errs);await b.close();srv.close();process.exit(errs.length?1:0);})();
