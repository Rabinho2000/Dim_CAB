/* partilha através do servidor próprio: a Ana guarda um projeto e um equipamento, o Rui vê-os sem recarregar e abre o projeto;
   o Rui não tem botão para apagar o projeto da Ana; uma terceira pessoa sem nome é convidada a indicá-lo. Tem de dar "ERR []". */
const { chromium } = require('playwright');
const {createServer}=require('../server/server.js');
(async()=>{
const srv=createServer({dbPath:':memory:',admins:''});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${srv.address().port}/`;
const b=await chromium.launch();const errs=[];
const open=async name=>{const ctx=await b.newContext({viewport:{width:1300,height:900}});
  if(name)await ctx.addInitScript(n=>{try{localStorage.setItem('cabosrt.user',n);}catch(e){}},name);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(`${name}: ${e.message}`));
  /* erros de rede vistos pelos pedidos (o 401 do primeiro /api/me sem nome e os 409 dos conflitos são esperados; as fontes são bloqueadas de propósito) */
  p.on('console',m=>{if(m.type()==='error'&&!/^Failed to load resource/.test(m.text()))errs.push(`${name}: ${m.text()}`);});
  p.on('requestfailed',q=>{if(!/fonts\.g|cdnjs/.test(q.url()))errs.push(`${name}: falhou ${q.url()}`);});
  p.on('response',r=>{if(r.status()>=400&&!(r.status()===401&&r.url().endsWith('/api/me'))&&r.status()!==409)errs.push(`${name}: ${r.status()} ${r.url()}`);});
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());return p;};
const until=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:10000}).then(()=>true,()=>false);
const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};

const ana=await open('Ana');await ana.goto(url);
const rui=await open('Rui');await rui.goto(url);
await ana.waitForFunction(()=>!document.querySelector('#pj-save').disabled);
await ana.fill('#proj','Obra Servidor');await ana.click('[data-tab=proj]');
await ana.fill('[data-obra=cliente]','Câmara do Porto');await ana.fill('[data-obra=morada]','Rua de Teste 1, Porto');await ana.fill('[data-obra=desenho]','SOL-001');
await ana.selectOption('[data-obra=estado]','aprovado');await ana.click('#pj-save');
await ana.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'));
check(true,'a Ana guardou o projeto');

await rui.click('[data-tab=proj]');
const seen=await rui.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'),null,{timeout:10000}).then(()=>true,()=>false);
check(seen,'o Rui vê o projeto da Ana sem recarregar');
const row=await rui.$eval('#pj-body',e=>e.innerText.replace(/\s+/g,' '));
check(/Ana/.test(row),`a coluna "Guardado por" mostra a Ana (${row.slice(0,80)})`);
check(!(await rui.$('#pj-body [data-pdel]')),'o Rui não tem botão para apagar o projeto da Ana');
check(/aprovado/i.test(row)&&/Câmara do Porto/.test(row),'a lista mostra o estado e o cliente');
await rui.selectOption('#pj-est','obra');check(!(await rui.$('#pj-body [data-popen]')),'o filtro "Em obra" esconde o projeto aprovado');
await rui.selectOption('#pj-est','aprovado');check(!!(await rui.$('#pj-body [data-popen]')),'o filtro "Aprovado" mostra-o');await rui.selectOption('#pj-est','');
await rui.fill('#pj-q','câmara');check(!!(await rui.$('#pj-body [data-popen]')),'a procura encontra pelo cliente');await rui.fill('#pj-q','');
await rui.click('[data-popen]');check((await rui.$eval('#proj',e=>e.value))==='Obra Servidor','o Rui abre o projeto');
check((await rui.$eval('[data-obra=cliente]',e=>e.value))==='Câmara do Porto'&&(await rui.$eval('[data-obra=estado]',e=>e.value))==='aprovado','os dados da obra abrem com o projeto');
await rui.click('[data-tab=sld]');
check(await until(rui,()=>/Dono de obra: Câmara do Porto/.test(document.body.innerHTML)&&/Desenho nº SOL-001/.test(document.body.innerHTML)),'a legenda do unifilar usa o cliente e o nº do desenho');

/* conflito: a Ana grava uma versão nova enquanto o Rui tem o projeto aberto */
await ana.click('[data-tab=ac]');await ana.fill('#proj','Obra Servidor v2');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
await rui.click('[data-tab=proj]');
check(await until(rui,()=>!!document.querySelector('#pj-latest')),'o Rui é avisado de que há uma versão mais recente');
await rui.click('[data-tab=ac]');await rui.fill('#proj','Obra do Rui');await rui.click('[data-tab=proj]');await rui.click('#pj-save');
check(await until(rui,()=>!document.querySelector('#pjdlg').hidden&&/Ana/.test(document.querySelector('#pjdlg').innerText)),'ao gravar, o Rui vê a janela de conflito com o nome da Ana');
await (await rui.$('#pjdlg .panel')).screenshot({path:'tests/conflito.png'});
await rui.click('[data-cf=theirs]');
check((await rui.$eval('#proj',e=>e.value))==='Obra Servidor v2','o Rui abre a versão da Ana');
await rui.click('[data-tab=ac]');await rui.fill('#proj','Obra do Rui');await rui.click('[data-tab=proj]');await rui.click('#pj-save');
check(await until(rui,()=>document.querySelector('#pjdlg').hidden&&document.querySelector('#pj-body').innerText.includes('Obra do Rui')),'depois de abrir a versão atual, o Rui grava sem conflito');
/* a Ana estava na versão v2: ao gravar tem conflito e escolhe substituir */
await ana.click('[data-tab=ac]');await ana.fill('#proj','Obra da Ana');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
check(await until(ana,()=>!document.querySelector('#pjdlg').hidden),'a Ana também é avisada');
await ana.click('[data-cf=mine]');
check(await until(ana,()=>document.querySelector('#pjdlg').hidden&&document.querySelector('#pj-body').innerText.includes('Obra da Ana')),'a Ana substitui pela versão dela');
/* versões: o Rui repõe a primeira versão */
await until(rui,()=>document.querySelector('#pj-body').innerText.includes('Obra da Ana'));
await rui.click('[data-pver]');
check(await until(rui,()=>document.querySelectorAll('#pjdlg [data-vopen]').length===4),'as 4 versões aparecem na lista');
const vrows=await rui.$$eval('#pjdlg tbody tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' ')));console.log('   ',vrows.join('\n    '));
await rui.click('#pjdlg [data-vopen="3"]');
check((await rui.$eval('#proj',e=>e.value))==='Obra Servidor','o Rui abre a primeira versão');
await rui.click('[data-tab=proj]');await rui.click('#pj-save');
check(await until(rui,()=>document.querySelector('#pjdlg').hidden&&/^Obra Servidor\b/.test(document.querySelector('#pj-body').innerText.trim())),'e repõe-na sem conflito');

await ana.click('[data-tab=eq]');await ana.click('[data-eq=gw]');
await ana.fill('[data-ef=marca]','Sigenergy');await ana.fill('[data-ef=modelo]','Gateway Teste 3F');await ana.fill('[data-ef=In]','80');await ana.click('#eq-save');
await rui.click('[data-tab=eq]');await rui.click('[data-eq=gw]');
check(await rui.waitForFunction(()=>document.querySelector('#eq-table').innerText.includes('Gateway Teste 3F'),null,{timeout:10000}).then(()=>true,()=>false),'o Rui vê o gateway que a Ana acrescentou');

const ze=await open(null);await ze.goto(url);
const asked=await until(ze,()=>!!document.querySelector('#namedlg'));
await ze.screenshot({path:'tests/nome.png'});
await ze.fill('#namedlg-n','Zé');await ze.click('#namedlg button[type=submit]');
await ze.click('[data-tab=proj]');
check(await until(ze,()=>/Ligado como Zé/.test(document.querySelector('#pj-user').innerText)),'mostra "Ligado como Zé"');
check(await ze.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'),null,{timeout:10000}).then(()=>true,()=>false)&&asked,'sem nome, a página pede-o e depois mostra os projetos');
await ze.screenshot({path:'tests/partilha_servidor.png'});

console.log('ERR',errs);await b.close();srv.close();process.exit(errs.length?1:0);})();
