/* modelos de projeto ("Novo projeto"): cada modelo abre sem circuitos a rever e com os quadros esperados. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><meta charset=utf-8><body>'+fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,''));
check(await p.$eval('#reset',e=>e.textContent)==='Novo projeto','o botão do topo é "Novo projeto"');
const exp={exemplo:[500,'QFV,QInterligação,Qentrada'],cliente:[100,'QFV,Qentrada'],gwci:[60,'QFV,Gateway,Qentrada'],res3:[10,'QFV,Gateway,Qentrada'],res1:[6,'QFV,Qentrada']};
for(const [id,[P,q]] of Object.entries(exp)){await p.click('#reset');await p.click(`[data-tpl=${id}]`);
  const r=await p.evaluate(()=>{const all=last.invC.concat(last.pC);return {bad:all.filter(c=>verdict(c).st==='bad').length,P:last.Ptot,q:quadros().join(','),proj:S.proj};});
  check(r.bad===0&&r.P===P&&r.q===q,`${id}: ${r.P} kW, ${r.q}, nenhum a rever`);}
check(await p.$eval('#tpldlg',e=>e.hidden),'a janela fecha ao escolher');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
