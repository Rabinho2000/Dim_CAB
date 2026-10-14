const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const html=require('fs').readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
await p.setContent('<!doctype html><meta charset=utf-8><body>'+html);
await p.waitForTimeout(300);
for(const t of ['ac','sld','brd','eq','proj']){await p.click(`[data-tab=${t}]`);await p.waitForTimeout(200);await p.screenshot({path:`tab_${t}.png`,fullPage:t!=='ac'});}
console.log('ERR',errs);await b.close();})();
