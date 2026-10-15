const { chromium } = require('playwright');
const mock=`<script>
(function(){const store={},subs={};let n=0;
const snap=col=>({docs:Object.entries(store[col]||{}).map(([id,d])=>({id,exists:true,data:()=>JSON.parse(JSON.stringify(d))}))});
const fire=col=>(subs[col]||[]).forEach(f=>f(snap(col)));
const coll=col=>({doc:id=>{id=id||'d'+(++n);return {id,set:async d=>{(store[col]??={})[id]=d;setTimeout(()=>fire(col));},delete:async()=>{delete (store[col]||{})[id];setTimeout(()=>fire(col));}};},
  onSnapshot:(f)=>{(subs[col]??=[]).push(f);setTimeout(()=>f(snap(col)));return ()=>{};}});
window.__saved=[];
const caps={db:{collection:coll},user:{id:async()=>'u1',profiles:async ids=>Object.fromEntries(ids.map(i=>[i,{name:'Gonçalo'}])),can:async()=>true,isOwner:()=>true},
 downloads:{save:async r=>{window.__saved.push([r.filename,typeof r.data==='string'?r.data.length:r.data.size]);return {status:'saved'};}}};
window.claude={use:async k=>caps[k]||null};window.__store=store;})();
</script>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});

const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const html=require('fs').readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
await p.setContent('<!doctype html><meta charset=utf-8><body>'+mock+html);
await p.waitForTimeout(400);
await p.fill('#proj','Obra Teste');
await p.click('[data-tab=proj]');await p.click('#pj-save');await p.waitForTimeout(200);
console.log('proj rows',await p.$eval('#pj-body',e=>e.innerText.replace(/\s+/g,' ')));
// equipamento: corrigir 150 M1
await p.click('[data-tab=eq]');await p.click('[data-eedit="Sigen PV 150 M1"]');
for(const [k,v] of [['mppt','8'],['cc','2'],['imax','42'],['isc','55'],['vmax','1100'],['vstart','180'],['vmppmin','180'],['vmppmax','1000']])await p.fill(`[data-ef=${k}]`,v);
await p.click('#eq-save');await p.waitForTimeout(200);
console.log('eq',await p.$$eval('#eq-table tr',t=>t.filter(r=>r.innerText.includes('150 M1')).map(r=>r.innerText.replace(/\s+/g,' '))));
await p.click('[data-eq=pr]');await p.selectOption('[data-ef=mat]','Cu');await p.selectOption('[data-ef=form]','mono');await p.fill('[data-ef=s]','120');await p.fill('[data-ef=p]','12.5');await p.fill('[data-ef=forn]','JMM');await p.click('#eq-save');await p.waitForTimeout(200);
console.log('price rows',await p.$$eval('#eq-table tbody tr',t=>t.length));
await p.click('[data-eq=gw]');await p.fill('[data-ef=marca]','Sigenergy');await p.fill('[data-ef=modelo]','Gateway HomeMax 3F');await p.fill('[data-ef=In]','80');await p.click('#eq-save');await p.waitForTimeout(200);
/* "Adicionar gateway" abre a janela "Novo quadro" (tipo gateway): escolhe-se o modelo e confirma-se */
await p.click('[data-tab=ac]');await p.click('#addgw');await p.selectOption('#bp-gw','Gateway HomeMax 3F');await p.click('#bp-add');await p.waitForTimeout(150);console.log('gw',await p.$eval('#gw-body',e=>e.querySelector('input[data-g=In]').value),await p.$eval('#res-body',e=>e.innerText.includes('gateway 80 A')));
// abrir projeto após alterar
await p.click('[data-tab=ac]');await p.fill('#proj','Outro');await p.click('[data-tab=proj]');await p.click('[data-popen]');await p.waitForTimeout(200);
console.log('proj name after open',await p.$eval('#proj',e=>e.value));
// downloads
await p.click('[data-tab=sld]');await p.click('[data-sld=svg]');await p.waitForTimeout(200);
await p.click('[data-sld=png]');await p.waitForTimeout(500);await p.click('[data-sld=pdf]');await p.waitForTimeout(1500);
console.log('saved',await p.evaluate(()=>window.__saved));
await p.click('[data-tab=brd]');
console.log('ERR',errs);await b.close();})();
