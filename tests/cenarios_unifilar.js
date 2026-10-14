const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
const html=fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const shot=async(name)=>{await p.click('[data-tab=sld]');await p.waitForTimeout(150);const svg=await p.$eval('#sld',e=>e.innerHTML);await p.click('[data-tab=ac]');
  const q=await b.newPage();await q.setContent(svg);await q.screenshot({path:name,fullPage:true});await q.close();};
await p.setContent('<!doctype html><meta charset=utf-8><body>'+html);
await shot('sA.png');
// B: 2 x EC30 -> QFV -> gateway -> Qentrada (remover QInterligação)
for(const i of [4,3])await p.click(`#inv-body tr:nth-child(${i}) [data-del]`);
for(const i of [1,2])await p.selectOption(`#inv-body tr:nth-child(${i}) select[data-k=modelo]`,'SigenStor EC 30.0 TP');
await p.evaluate(()=>{S.percs=[{id:uid++,orig:'QFV',dest:'Qentrada',L:40,S:'auto',...route('13','mono')}];renderPercTable();render();});
await p.click('#addp');await p.click('[data-bt2=GW]');console.log('gw model',await p.$eval('#bp-gw',e=>e.value),'pos',await p.$eval('#bp-pos',e=>e.selectedOptions[0].text));
await p.click('#bp-add');await p.waitForTimeout(150);
console.log(await p.$$eval('#res-body tr',t=>t.map(r=>r.children[0].innerText.split('\n')[0]+' | '+(r.children[3]?r.children[3].innerText.replace(/\s+/g,' ').slice(0,60):'')+' | '+(r.children[4]?r.children[4].innerText.split('\n')[0]:'')+' | '+(r.lastElementChild.innerText)).join('\n')));
await shot('sB.png');
// C: small 1 inverter 30 kW direto ao cliente
await p.evaluate(()=>{S.gws=[];S.percs=[{id:uid++,orig:'QFV',dest:'Qentrada',L:40,S:'auto',...route('13','mono')}];S.invs=S.invs.slice(0,1);renderGwTable();renderPercTable();renderInvTable();render();});
await shot('sC.png');
// D: add quadro de contagem
await p.click('#addp');await p.click('[data-bt2=CONT]');await p.click('#bp-add');await shot('sD.png');
console.log('ERR',errs);await b.close();})();
