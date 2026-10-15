/* comparar alternativas: a janela mostra as variantes sem mexer no projeto aberto; "Aplicar" troca o projeto pela alternativa.
   Gera tests/comparar.png. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><meta charset=utf-8><body>'+fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,''));
const before=await p.evaluate(()=>JSON.stringify(S));
await p.click('#cmp-open');
const rows=await p.$$eval('#cmp-body tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' ')));
check(rows.length===6,`6 alternativas (${rows.length})`);
check(/^Projeto atual/.test(rows[0])&&/Sempre cobre/.test(rows[1]),'atual primeiro, depois as variantes');
check(await p.evaluate(b=>JSON.stringify(S)===b,before),'abrir a comparação não mexe no projeto');
const cu=rows.find(r=>/Sempre cobre/.test(r)),al=rows.find(r=>/Sempre alumínio/.test(r));
check(/\+[\d\s]+€/.test(cu)&&/−|-[\d\s]+€/.test(al),'diferenças face ao atual: cobre mais caro, alumínio mais barato');
check(/mais barata sem circuitos a rever/i.test(al),'a mais barata sem circuitos a rever é assinalada');
check(/ΔU máx\. por troço 2 %.* 1 Aplicar$/.test(rows.find(r=>/2 %/.test(r))||''),'ΔU 2 %: 1 circuito a rever');
await (await p.$('#cmpdlg .panel')).screenshot({path:__dirname+'/comparar.png'});
await p.click('[data-cmpapl=cu]');
check(await p.evaluate(()=>S.mat==='Cu'&&last.invC.concat(last.pC).every(c=>c.res.mat==='Cu')&&document.getElementById('mat').value==='Cu'),'"Aplicar" sempre cobre: projeto e campo Material em cobre');
check(await p.$eval('#cmpdlg',e=>e.hidden),'a janela fecha');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
