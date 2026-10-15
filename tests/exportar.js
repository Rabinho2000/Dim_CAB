/* exportar / importar projetos (.json) no servidor próprio: exporta o aberto, importa-o noutro navegador como projeto novo
   (sem aprovação); exporta todos e importa-os para outra equipa. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const {createServer}=require('../server/server.js');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const mk=async()=>{const s=createServer({dbPath:':memory:',admins:''});await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;};
const s1=await mk(),s2=await mk();const b=await chromium.launch();
const open=async(srv)=>{const ctx=await b.newContext({acceptDownloads:true});await ctx.addInitScript(()=>{try{localStorage.setItem('cabosrt.user','Ana');}catch(e){}});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await p.goto(`http://127.0.0.1:${srv.address().port}/`);await p.waitForFunction(()=>!document.querySelector('#pj-save').disabled);return p;};
const get=async(p,sel,file)=>{const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click(sel)]);await d.saveAs(file);return d.suggestedFilename();};
const a=await open(s1);
await a.fill('#proj','Obra Exportada');await a.click('[data-tab=proj]');await a.fill('[data-obra=cliente]','Cliente X');await a.click('#pj-save');
await a.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Exportada'));
await a.click('#obra-aprov');await a.click('[data-ap=ok]');await a.waitForFunction(()=>!document.querySelector('#lockbar').hidden);
const f1=path.join(__dirname,'exp_um.json'),f2=path.join(__dirname,'exp_todos.json');
check((await get(a,'#pj-exp',f1)).endsWith('.cabos.json'),'exporta o projeto aberto');
const one=JSON.parse(fs.readFileSync(f1,'utf8'));check(one.app==='solcor-cabos'&&one.project.proj==='Obra Exportada'&&one.project.obra.aprov,'o ficheiro tem o projeto (aprovado)');
check(!(await a.$eval('#pj-expall',e=>e.hidden)),'"Exportar todos" aparece com base partilhada');
await get(a,'#pj-expall',f2);check(JSON.parse(fs.readFileSync(f2,'utf8')).projects.length===1,'exporta todos (1)');
/* outra equipa */
const c=await open(s2);await c.click('[data-tab=proj]');
await c.setInputFiles('#pj-impf',f1);await c.waitForFunction(()=>S.proj==='Obra Exportada',null,{timeout:10000});
check(await c.$eval('#proj',e=>e.value)==='Obra Exportada'&&await c.evaluate(()=>!S.obra.aprov&&S.obra.rev==='A'&&S.obra.estado==='rascunho'&&S.obra.cliente==='Cliente X'),'importa como projeto novo: rascunho, revisão A, sem aprovação, com os dados da obra');
check(await c.evaluate(()=>CUR===null),'não fica ligado a nenhum projeto da equipa até ser guardado');
await c.click('[data-tab=proj]');await c.setInputFiles('#pj-impf',f2);
check(await c.waitForFunction(()=>document.querySelector('#pj-body').innerText.includes('Obra Exportada'),null,{timeout:10000}).then(()=>true,()=>false),'"todos": entram na base da outra equipa');
console.log('ERR',errs);await b.close();s1.close();s2.close();process.exit(errs.length?1:0);})();
