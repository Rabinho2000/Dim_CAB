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
  /* erros de rede vistos pelos pedidos (o 401 do primeiro /api/me sem nome é o esperado; as fontes são bloqueadas de propósito) */
  p.on('console',m=>{if(m.type()==='error'&&!/^Failed to load resource/.test(m.text()))errs.push(`${name}: ${m.text()}`);});
  p.on('requestfailed',q=>{if(!/fonts\.g|cdnjs/.test(q.url()))errs.push(`${name}: falhou ${q.url()}`);});
  p.on('response',r=>{if(r.status()>=400&&!(r.status()===401&&r.url().endsWith('/api/me')))errs.push(`${name}: ${r.status()} ${r.url()}`);});
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());return p;};
const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};

const ana=await open('Ana');await ana.goto(url);
const rui=await open('Rui');await rui.goto(url);
await ana.waitForFunction(()=>!document.querySelector('#pj-save').disabled);
await ana.fill('#proj','Obra Servidor');await ana.click('[data-tab=proj]');await ana.click('#pj-save');
await ana.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'));
check(true,'a Ana guardou o projeto');

await rui.click('[data-tab=proj]');
const seen=await rui.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'),null,{timeout:10000}).then(()=>true,()=>false);
check(seen,'o Rui vê o projeto da Ana sem recarregar');
const row=await rui.$eval('#pj-body',e=>e.innerText.replace(/\s+/g,' '));
check(/Ana/.test(row),`a coluna "Guardado por" mostra a Ana (${row.slice(0,80)})`);
check(!(await rui.$('#pj-body [data-pdel]')),'o Rui não tem botão para apagar o projeto da Ana');
await rui.click('[data-popen]');check((await rui.$eval('#proj',e=>e.value))==='Obra Servidor','o Rui abre o projeto');

await ana.click('[data-tab=eq]');await ana.click('[data-eq=gw]');
await ana.fill('[data-ef=marca]','Sigenergy');await ana.fill('[data-ef=modelo]','Gateway Teste 3F');await ana.fill('[data-ef=In]','80');await ana.click('#eq-save');
await rui.click('[data-tab=eq]');await rui.click('[data-eq=gw]');
check(await rui.waitForFunction(()=>document.querySelector('#eq-table').innerText.includes('Gateway Teste 3F'),null,{timeout:10000}).then(()=>true,()=>false),'o Rui vê o gateway que a Ana acrescentou');

const ze=await open(null);let asked=false;ze.on('dialog',d=>{asked=true;d.accept('Zé');});await ze.goto(url);
await ze.click('[data-tab=proj]');
check(await ze.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Servidor'),null,{timeout:10000}).then(()=>true,()=>false)&&asked,'sem nome, a página pede-o e depois mostra os projetos');
await ze.screenshot({path:'tests/partilha_servidor.png'});

console.log('ERR',errs);await b.close();srv.close();process.exit(errs.length?1:0);})();
